# iTourTMS

**Enterprise Travel Management System** — a modular, multi-tenant platform for tour operators, travel agencies, and hospitality businesses.

Built with Next.js 16, TypeScript, tRPC, Prisma, and PostgreSQL.

---

## Modules

| Module | Description |
|--------|-------------|
| **Finance** | Chart of accounts, journals, invoicing, payments, bank reconciliation, budgets, multi-currency |
| **Contracting** | Hotel contracts, seasonal rates, allotments, stop sales, child policies, markets, tariffs |
| **CRM** | Leads, pipeline, contacts, excursion catalog, cost sheets, bookings, customer 360 |
| **Reservations** | Hotel bookings, rooming lists, guest management, vouchers, cancellation engine, group bookings |
| **Traffic** | Transfer jobs, fleet management, drivers, dispatch, pricing, airport operations |
| **B2C Website** | Public-facing CMS with hotel search, availability engine, geo-IP market detection, booking flow |
| **B2B Portal** | Partner portal for tour operators and travel agents with rate sheets, markup rules, credit management |

Modules are installed per-company during setup and gated via middleware.

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 16 (App Router, Turbopack) |
| Language | TypeScript (strict) |
| API | tRPC v11 |
| ORM | Prisma v7 + PostgreSQL 16 |
| Cache | Redis 7 (ioredis) |
| Auth | Auth.js v5 (JWT, RBAC) |
| UI | Tailwind CSS v4 + shadcn/ui + Radix |
| Forms | react-hook-form + zod v4 |
| Tables | @tanstack/react-table v8 |
| State | zustand, @tanstack/react-query v5, nuqs |
| Exports | jsPDF, xlsx, docx |
| Charts | recharts |
| Testing | vitest, Playwright |

---

## Getting Started

### Prerequisites

- Node.js 22+
- pnpm 10+
- Docker (for PostgreSQL, PgBouncer, Redis)

### Setup

```bash
# Clone and install
git clone https://github.com/mg-gouda/iTourTMS.git
cd iTourTMS
pnpm install

# Start infrastructure
pnpm docker:up

# Push database schema
pnpm db:push

# Seed reference data
pnpm db:seed

# Generate a license key
pnpm license:generate
# Save the printed key — you'll need it during setup

# Start dev server
pnpm dev
```

Visit `http://localhost:3000/setup` to complete the setup wizard:

1. **License** — Enter the generated license key
2. **Company** — Name, country, currency, fiscal year
3. **Modules** — Select which modules to install
4. **Configure** — Module-specific settings
5. **Admin** — Create the super admin account

### Environment Variables

Copy `.env.example` to `.env` and fill in the values:

```env
DATABASE_URL=postgresql://itour:itour_dev_2026@localhost:5432/itour_tms
DATABASE_URL_POOLED=postgresql://itour:itour_dev_2026@localhost:6432/itour_tms?pgbouncer=true
REDIS_URL=redis://localhost:6379
AUTH_SECRET=<openssl rand -base64 32>
CRON_SECRET=<openssl rand -base64 32>
NEXTAUTH_URL=http://localhost:3000
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development
```

---

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start dev server (Turbopack) |
| `pnpm build` | Production build |
| `pnpm start` | Start production server |
| `pnpm lint` | Run ESLint |
| `pnpm test` | Run vitest (watch) |
| `pnpm test:run` | Run vitest (single run) |
| `pnpm test:e2e` | Run Playwright E2E tests |
| `pnpm db:push` | Push schema to database |
| `pnpm db:migrate` | Run Prisma migrations |
| `pnpm db:seed` | Seed reference data |
| `pnpm db:studio` | Open Prisma Studio |
| `pnpm db:generate` | Regenerate Prisma Client |
| `pnpm docker:up` | Start PostgreSQL + PgBouncer + Redis |
| `pnpm docker:down` | Stop containers |
| `pnpm license:generate` | Generate a new license key |

---

## Architecture

### Multi-Tenancy

All data is scoped by `companyId`. Every query filters by `session.user.companyId`.

### Auth & RBAC

- Credentials provider (email + bcrypt password)
- JWT strategy with roles and permissions in the token
- Role-based access: `super_admin` bypasses all checks
- Permission codes: `module:resource:action` (e.g. `finance:invoice:create`)

### tRPC Middleware

```
publicProcedure        → no auth
protectedProcedure     → session + license check
moduleProcedure(name)  → session + license + module installed
permissionProcedure(c) → session + license + permission check
```

### License System

Software licensing with two-phase key activation:

1. **Generate** — `pnpm license:generate` creates a key (hash stored in DB, plaintext printed once)
2. **Activate** — Client enters the key during setup or renewal (365-day validity)

The system halts completely when the license expires. Admins receive notifications 30 days before expiry.

### Database

- **137 models**, **71 enums** (Prisma schema)
- PostgreSQL 16 with PgBouncer connection pooling
- `decimal.js` for all financial arithmetic
- Auto-generated codes via Sequence model (INV-00001, BK-000001, etc.)

---

## Project Structure

```
src/
├── app/
│   ├── (auth)/              # Login
│   ├── (b2c)/               # Public B2C website
│   ├── (dashboard)/         # Protected dashboard
│   ├── (license)/           # License expired/activate
│   ├── (setup)/             # Setup wizard
│   └── api/                 # API routes
├── components/
│   ├── b2c/                 # B2C website components
│   ├── crm/                 # CRM components
│   ├── finance/             # Finance components
│   ├── layout/              # Sidebar, topbar, setup wizard
│   ├── shared/              # Reusable (data-table, combobox)
│   └── ui/                  # shadcn/ui primitives
├── lib/
│   ├── constants/           # Enum labels per module
│   ├── export/              # PDF/Excel/Word generators
│   ├── validations/         # Zod schemas per module
│   └── ...
├── server/
│   ├── services/            # Business logic per module
│   └── trpc/
│       ├── routers/         # 90+ sub-routers
│       └── index.ts         # Middleware chain
└── ...
```

---

## Deployment

The project is configured for Vercel deployment with cron jobs for:
- Daily booking status updates (`/api/cron/booking-status`)
- Daily license expiry checks (`/api/cron/license-expiry`)

For production, ensure:
- Strong `AUTH_SECRET` and `CRON_SECRET` values
- Production database and Redis URLs
- `NODE_ENV=production`, `LOG_LEVEL=info`
- SMTP configured for booking confirmation emails
- A license key generated and provided to the client

---

## License

Proprietary. All rights reserved.
