# iTourTMS — Separation & Deployment Architecture Plan

> Status: Planned — not yet started
> Decided: June 2026

---

## Decisions Summary

| Decision | Choice | Reason |
|---|---|---|
| Repo strategy | 4 truly separate private repos | Security isolation, independent access control, independent deployments |
| Type sharing | `@your-org/api-types` on GitHub Packages | tRPC end-to-end type safety preserved without monorepo |
| Build location | GitHub Actions → GHCR | Builds happen in CI, never on production VPS |
| VPS per client | 2 VPS | B2C availability independent of admin/backend operations |
| Deployment method | Docker Compose + restart policies | Simple, reliable, zero overhead |
| Orchestration | None (K8s/K3s cancelled) | Docker `restart: unless-stopped` covers container crash recovery |
| Migration approach | Non-destructive, phased | Monolith stays live until full cutover per client |

---

## Repository Structure

```
GitHub Org
├── itour-backend       (private) — Express/Fastify + tRPC + Prisma + Auth
├── itour-dashboard     (private) — Next.js admin & operations dashboard
├── itour-b2c           (private) — Next.js public-facing website
└── itour-api-types     (private) — TypeScript types only (@your-org/api-types)
```

---

## Per-Client Infrastructure

### VPS 1 — Public (B2C)

```
https://example.com
│
├── nginx (SSL termination, port 80/443)
└── itour-b2c container :3001
```

**Spec:** 2 vCPU / 4 GB RAM (~$20/mo)
**Firewall:** Ports 80 and 443 open to the world. No database access. Outbound to VPS 2 API only.

---

### VPS 2 — Internal (Backend + Admin)

```
https://itourtms.example.com  → itour-dashboard :3000
https://api.example.com       → itour-backend   :4000
│
├── nginx (SSL termination)
├── itour-backend container   :4000
├── itour-dashboard container :3000
├── postgres container        :5432 (internal only)
├── pgbouncer container       :6432 (internal only)
└── redis container           :6379 (internal only)
```

**Spec:** 4 vCPU / 8 GB RAM (~$40/mo)
**Firewall:**
- Ports 80/443 open to world (admin domain)
- Port 4000 (API) accepts only VPS 1 IP + office/VPN IPs
- Ports 5432, 6432, 6379 never exposed externally

**Total per client: ~$60/mo**

---

## Docker Failure Protection

All containers run with Docker's built-in restart policy. No additional orchestration needed.

```yaml
# Applied to every service in docker-compose.yml
restart: unless-stopped
```

**What this protects against:**
- Application crash (OOM, unhandled exception, segfault)
- Container process killed unexpectedly
- Post-reboot automatic startup

**What this does NOT protect against:**
- Full VPS hardware failure (mitigated by daily DB backups + documented recovery)
- Network partition

**Recovery from VPS failure:**
- Provision replacement VPS from snapshot or clean template
- Restore latest DB backup from object storage
- `docker compose up -d`
- Target RTO: under 30 minutes

---

## Docker Compose Template

### VPS 1 — `docker-compose.yml`

```yaml
services:
  b2c:
    image: ghcr.io/your-org/itour-b2c:latest
    restart: unless-stopped
    ports:
      - "3001:3001"
    env_file: .env
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3001/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  nginx:
    image: nginx:alpine
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./nginx/certs:/etc/nginx/certs:ro
    depends_on:
      - b2c
```

### VPS 2 — `docker-compose.yml`

```yaml
services:
  backend:
    image: ghcr.io/your-org/itour-backend:latest
    restart: unless-stopped
    ports:
      - "4000:4000"
    env_file: .env
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_started
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:4000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  dashboard:
    image: ghcr.io/your-org/itour-dashboard:latest
    restart: unless-stopped
    ports:
      - "3000:3000"
    env_file: .env
    depends_on:
      - backend

  postgres:
    image: postgres:16-alpine
    restart: unless-stopped
    volumes:
      - postgres_data:/var/lib/postgresql/data
    env_file: .env
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U $$POSTGRES_USER"]
      interval: 10s
      timeout: 5s
      retries: 5

  pgbouncer:
    image: pgbouncer/pgbouncer:latest
    restart: unless-stopped
    depends_on:
      - postgres
    env_file: .env

  redis:
    image: redis:7-alpine
    restart: unless-stopped
    volumes:
      - redis_data:/data
    command: redis-server --appendonly yes

  nginx:
    image: nginx:alpine
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./nginx/certs:/etc/nginx/certs:ro
    depends_on:
      - backend
      - dashboard

volumes:
  postgres_data:
  redis_data:
```

---

## CI/CD Pipeline

### Per repo — GitHub Actions workflow

```
Code merged to main branch
        │
        ▼
GitHub Actions
  ├── pnpm install
  ├── pnpm build (type check + compile)
  ├── docker build -t ghcr.io/your-org/itour-[service]:$GIT_SHA
  ├── docker tag :$GIT_SHA → :latest
  └── docker push both tags to GHCR

Backend only — additionally:
  └── extract AppRouter type
  └── publish @your-org/api-types@x.x.x to GitHub Packages
```

### Per-client deploy command (on VPS)

```bash
# VPS 1
docker compose pull && docker compose up -d

# VPS 2
docker compose pull && docker compose up -d
```

No builds on production VPS. Images are always pre-built in CI.

---

## Type Sharing Flow

```
itour-backend (API change merged to main)
        │
        ▼
GitHub Actions auto-publishes @your-org/api-types@x.x.x
        │
        ├── itour-dashboard: bump package version → full type safety restored
        └── itour-b2c:       bump package version → full type safety restored
```

The package contains **TypeScript types only** — no runtime code, minimal size.

---

## Auth Architecture

Auth.js lives in `itour-backend` as the single JWT issuer.

```
itour-backend
└── POST /api/auth/[...nextauth] — issues signed JWTs

itour-dashboard
└── Reads JWT from cookie, verifies signature with AUTH_SECRET
└── All data via tRPC client → itour-backend

itour-b2c
└── Guest sessions via backend API only
└── B2B partner login proxied through backend
```

`AUTH_SECRET` is the same value on all three services — backend issues, frontends verify only. Database credentials exist on VPS 2 only.

---

## Environment Variables

### VPS 2 — Backend `.env`
```env
DATABASE_URL=postgresql://...@localhost:5432/itour_tms
DATABASE_URL_POOLED=postgresql://...@localhost:6432/itour_tms?pgbouncer=true
REDIS_URL=redis://localhost:6379
AUTH_SECRET=<shared secret>
AUTH_TRUST_HOST=true
NEXTAUTH_URL=https://api.example.com
SMTP_HOST=...
SMTP_PORT=...
SMTP_USER=...
SMTP_PASS=...
SMTP_FROM=...
NODE_ENV=production
LOG_LEVEL=info
```

### VPS 2 — Dashboard `.env`
```env
NEXT_PUBLIC_API_URL=https://api.example.com
AUTH_SECRET=<same shared secret>
NEXTAUTH_URL=https://itourtms.example.com
NODE_ENV=production
```

### VPS 1 — B2C `.env`
```env
NEXT_PUBLIC_API_URL=https://api.example.com
AUTH_SECRET=<same shared secret>
NEXTAUTH_URL=https://example.com
NODE_ENV=production
```

---

## Migration Phases

### Phase 0 — Prepare *(zero production impact)*
- [ ] Confirm GitHub org name
- [ ] Create 4 empty private repos: `itour-backend`, `itour-dashboard`, `itour-b2c`, `itour-api-types`
- [ ] Enable GitHub Packages on the org
- [ ] Enable GitHub Container Registry (GHCR) — free with GitHub
- [ ] Provision staging VPS 1 + VPS 2 pair for testing
- [ ] Confirm VPS provider for deploy script syntax
- [ ] Confirm subdomain pattern (`api.example.com` for backend)
- [ ] No changes to the existing monolith

---

### Phase 1 — Extract Backend
- [ ] Copy all tRPC routers, services, Prisma schema, and Auth config into `itour-backend`
- [ ] Replace Next.js API handler with Express/Fastify + `@trpc/server` standalone adapter
- [ ] Add `GET /api/health` endpoint
- [ ] Write `Dockerfile` for `itour-backend`
- [ ] Write GitHub Actions CI: build → push to GHCR
- [ ] Publish `@your-org/api-types@1.0.0` to GitHub Packages
- [ ] Run locally — verify all tRPC procedures respond
- [ ] **Monolith untouched**

---

### Phase 2 — Extract Dashboard
- [ ] Copy all `(dashboard)` pages and components into `itour-dashboard`
- [ ] Remove all direct Prisma imports — data access through tRPC client only
- [ ] Install `@your-org/api-types` — restore full type safety
- [ ] Point tRPC client at Phase 1 backend URL
- [ ] Write `Dockerfile` + GitHub Actions CI
- [ ] Run locally against Phase 1 backend — verify all pages and mutations
- [ ] **Monolith untouched**

---

### Phase 3 — Extract B2C
- [ ] Copy all `(b2c)` pages and components into `itour-b2c`
- [ ] Update B2C API routes to call backend instead of direct DB
- [ ] Update geo-IP middleware, market resolution, booking API
- [ ] Write `Dockerfile` + GitHub Actions CI
- [ ] Run locally — verify search, availability, booking flow, my-bookings
- [ ] **Monolith untouched**

---

### Phase 4 — Dockerise Full Stack
- [ ] Write `docker-compose.yml` for VPS 1 (B2C)
- [ ] Write `docker-compose.yml` for VPS 2 (backend + dashboard + postgres + pgbouncer + redis)
- [ ] Write nginx config templates for both VPS types (SSL, reverse proxy, headers)
- [ ] Write daily DB backup script → object storage (S3/R2/Backblaze)
- [ ] Spin up staging VPS 1 + VPS 2 with cloned client database (sanitised)
- [ ] Full end-to-end smoke test: B2C search → booking → admin confirmation → quotation → finance

---

### Phase 5 — CI/CD Pipelines
- [ ] GitHub Actions workflow per repo: build → push image to GHCR on merge to main
- [ ] Auto-publish `@your-org/api-types` on backend merge
- [ ] Write per-client deploy script: `docker compose pull && docker compose up -d`
- [ ] Test rolling container update with zero-downtime health check gates
- [ ] Document per-client `.env` template and onboarding checklist

---

### Phase 6 — Client Cutover *(one client at a time)*
- [ ] Deploy to one low-risk client first on new 2-VPS stack
- [ ] Run old monolith and new stack in parallel for one week
- [ ] Monitor error rates, response times, data consistency
- [ ] Set DNS TTL to 60s 24 hours before cutover
- [ ] DNS cutover: point `example.com` → VPS 1, `itourtms.example.com` + `api.example.com` → VPS 2
- [ ] Monitor for 48 hours
- [ ] Roll forward to remaining clients one by one
- [ ] Decommission monolith after all clients are migrated

---

## Pre-Phase-0 Checklist

| Item | Status |
|---|---|
| GitHub org name confirmed | ⬜ |
| 4 repos created on GitHub | ⬜ |
| GitHub Packages enabled | ⬜ |
| GHCR enabled | ⬜ |
| VPS provider confirmed | ⬜ |
| Staging VPS 1 provisioned | ⬜ |
| Staging VPS 2 provisioned | ⬜ |
| Subdomain pattern confirmed | ⬜ |

---

## Risk Register

| Risk | Mitigation |
|---|---|
| Type drift between backend and frontends | CI auto-publishes types on every backend merge |
| Auth regression during extraction | Phase 1 backend auth tested in isolation before any frontend touches it |
| B2C downtime during migration | Old monolith stays live until DNS cutover |
| Client data exposed during testing | Staging uses sanitised DB clone — never production data |
| Rollback needed post-cutover | DNS TTL 60s before cutover — revert in under 2 minutes |
| Container crash on VPS | `restart: unless-stopped` on all containers — auto-recovery |
| Full VPS failure | Daily DB backup to object storage + documented recovery procedure (target RTO: 30 min) |
