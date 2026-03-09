# iTourTMS — Enterprise Travel Management System

## CRITICAL: Project Isolation

**This project (iTourTMS) is completely independent from iTourTT.** They do NOT share:
- Database (iTourTMS uses its own PostgreSQL instance `itour_tms`)
- Docker containers (iTourTMS has its own `docker/docker-compose.yml`)
- Codebase, schemas, or any runtime resources

Never reference, import from, or make assumptions based on iTourTT. Treat them as entirely separate systems.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router, Turbopack) |
| Language | TypeScript (strict mode) |
| API | tRPC v11 (superjson serialization) |
| ORM | Prisma v7 with `@prisma/adapter-pg` (PostgreSQL driver) |
| Database | PostgreSQL 16 + PgBouncer (connection pooling) |
| Cache | Redis 7 (ioredis) |
| Auth | Auth.js v5 (next-auth 5.0.0-beta.30, JWT strategy, Prisma adapter) |
| UI | Tailwind CSS v4 + shadcn/ui + Radix primitives |
| Forms | react-hook-form + @hookform/resolvers + zod v4 |
| Tables | @tanstack/react-table v8 |
| State | zustand, @tanstack/react-query v5, nuqs (URL state) |
| i18n | next-intl |
| Logging | pino + pino-pretty |
| Exports | jsPDF + jspdf-autotable (PDF), xlsx (Excel), docx (Word) |
| Charts | recharts |
| IDs | @paralleldrive/cuid2 |
| Dates | date-fns v4 |
| Math | decimal.js (precise financial arithmetic) |
| Package Manager | pnpm 10.30.1 |
| Testing | vitest |

---

## Project Structure

```
src/
├── app/
│   ├── (auth)/              # Login page
│   ├── (b2c)/               # Public B2C website (separate route group)
│   ├── (dashboard)/         # Protected dashboard (all modules)
│   ├── (setup)/             # Setup wizard
│   ├── api/                 # API routes (auth, b2c, cron, export, import, trpc, upload, v1)
│   ├── globals.css
│   └── layout.tsx           # Root layout
├── components/
│   ├── b2c/                 # B2C website components
│   ├── crm/                 # CRM components
│   ├── finance/             # Finance report components
│   ├── layout/              # Sidebar, topbar
│   ├── providers/           # Context providers (trpc, theme, query)
│   ├── shared/              # Reusable components (data-table, combobox, etc.)
│   └── ui/                  # shadcn/ui primitives
├── hooks/                   # Custom React hooks
├── lib/
│   ├── auth.ts              # Auth.js config (credentials provider, JWT callbacks)
│   ├── logger.ts            # pino logger
│   ├── utils.ts             # cn() and shared utilities
│   ├── b2c/                 # B2C utilities (geo-ip, branding, fonts)
│   ├── constants/           # Enum label maps per module (6 files)
│   ├── export/              # PDF/Excel/Word generators (17 files)
│   ├── i18n/                # Internationalization config
│   ├── import/              # Import parsers (hotels, sejour)
│   └── validations/         # Zod schemas per module (6 files)
├── server/
│   ├── db.ts                # Prisma singleton (PrismaPg adapter)
│   ├── redis.ts             # Redis singleton (ioredis)
│   ├── services/            # Business logic per module
│   │   ├── b2c/             # Availability, rate-calculator, markup, market-resolver
│   │   ├── contracting/     # Rate calculation engine
│   │   ├── finance/         # Accounting engines
│   │   ├── reservations/    # Booking engines
│   │   ├── shared/          # Cross-module services
│   │   └── traffic/         # Transfer services
│   └── trpc/
│       ├── index.ts         # Context, middleware chain, procedure builders
│       ├── router.ts        # Main appRouter (merges all sub-routers)
│       └── routers/         # All sub-routers (90+ files)
│           ├── b2b-portal/  # B2B portal (stub)
│           ├── b2c-site/    # B2C CMS (10 sub-routers)
│           ├── contracting/  # Hotel contracting (27 sub-routers)
│           ├── crm/         # CRM & excursions (13 sub-routers)
│           ├── finance/     # Accounting (16 sub-routers)
│           ├── reservations/ # Bookings (6 sub-routers)
│           ├── shared/      # Setup, settings, user, notifications, API integrations
│           └── traffic/     # Transfers (17 sub-routers)
├── store/                   # Zustand stores
├── types/                   # TypeScript types (ModuleName, ModuleDefinition)
└── middleware.ts            # Edge middleware (auth, geo-IP, routing)
```

### Key Config Files
- `prisma/schema.prisma` — 4,271 lines, 137 models, 71 enums
- `prisma/seed.ts` — Seeds languages, currencies, cities, partner titles
- `docker/docker-compose.yml` — PostgreSQL 16, PgBouncer, Redis 7
- `.env.example` — DATABASE_URL, REDIS_URL, AUTH_SECRET, NEXTAUTH_URL
- `next.config.ts` — next-intl plugin, serverExternalPackages: pino, pdf-parse
- `vercel.json` — Deployment config

---

## Modules (7 total)

Each module requires an `InstalledModule` DB record per company. Gated by `moduleProcedure()` in tRPC.

| Module | Router Key | Icon | Sidebar Groups |
|--------|-----------|------|----------------|
| **Finance** | `finance` | Landmark | Customers, Vendors, Banking, Accounting, Configuration, Reports |
| **Contracting** | `contracting` | FileText | Master Data, Contracts, Commercial, Reports |
| **CRM** | `crm` | Users | Management (Leads, Pipeline, Contacts, Bookings), Catalog (Excursions, Suppliers) |
| **Reservations** | `reservations` | CalendarCheck | Management, Analysis |
| **Traffic** | `traffic` | Bus | Operations, Fleet, Service, Configuration, Reports |
| **B2C Website** | `b2cSite` | Globe | Content, Engagement, Pricing |
| **B2B Portal** | `b2bPortal` | Briefcase | Partners, Bookings, Commercial, Reports |

Module registry: `src/lib/constants/modules.ts`
Type definition: `src/types/index.ts` (`ModuleName` union type)

---

## Architecture Patterns

### tRPC Middleware Chain
```
publicProcedure        → no auth
protectedProcedure     → session required
moduleProcedure(name)  → session + InstalledModule check
permissionProcedure(code) → session + permission check
```
Context provides: `db` (Prisma), `redis`, `session`, `logger` (pino)

### Multi-Tenancy
All data is scoped by `companyId`. Every query filters by `session.user.companyId`.

### Auth Flow
- Credentials provider (email + bcryptjs password)
- JWT strategy with `companyId`, `locale`, `roles[]`, `permissions[]`
- Session callback populates `session.user` from JWT
- Config: `src/lib/auth.ts`

### Database Patterns
- Prisma singleton with PrismaPg adapter (`src/server/db.ts`)
- Connection pooling via PgBouncer (port 6432, transaction mode)
- `decimal.js` for all financial arithmetic (never use floating point)
- Bulk save pattern: delete all of type + create new (supplements, cost components, selling prices)

### Form Patterns
- react-hook-form + zod resolver for all forms
- When tRPC query may return `null`, always provide default form state
- tanstack table: use `id` + `accessorFn` for nested fields, NOT dot-notation `accessorKey`

### Sidebar
- Fully collapsible module sections via `CollapsibleModule` component
- State persisted in localStorage: `sidebar-mod-{name}`, `sidebar-{key}-{group}`
- Auto-expands when active route matches
- Route config: `moduleRoutes` in `src/components/layout/app-sidebar.tsx`

### B2C Website (Route Group: `(b2c)`)
- Completely separate layout from dashboard
- CSS isolation: `--pub-*` namespace in `b2c-theme.css`
- Server Components by default; client components only for interactive elements
- Geo-IP market detection via middleware (`x-geo-country` header)
- Prisma models keep `Public*` prefix, tables keep `pub_*` prefix

### Sequences & Codes
Auto-generated codes via `Sequence` model (prefix + zero-padded number):
- Lead codes: `LD-00001`
- Booking codes: `BK-00001`
- Contract codes use company initials

---

## API Routes

| Path | Purpose |
|------|---------|
| `/api/auth/[...nextauth]` | Auth.js handlers |
| `/api/trpc/[trpc]` | tRPC endpoint |
| `/api/b2c/search` | Hotel availability search |
| `/api/b2c/contact` | Contact form |
| `/api/b2c/newsletter` | Newsletter subscription |
| `/api/b2c/market-check` | Geo-IP market check |
| `/api/cron/booking-status` | Scheduled booking status updates |
| `/api/export/contract-pdf/[id]` | Contract PDF generation |
| `/api/export/rates-pdf/[id]` | Rates PDF |
| `/api/export/tariff-pdf/[id]` | Tariff PDF |
| `/api/export/tariff-pdf-bulk` | Bulk tariff PDF |
| `/api/export/api-docs` | API documentation |
| `/api/import/hotels` | Hotel data import |
| `/api/import/sejour` | Sejour contract import |
| `/api/upload/branding` | Branding image upload |
| `/api/health` | Health check |
| `/api/v1/*` | Public REST API (hotels, contracts, bookings, tariffs, availability, rate calculation) |

---

## Environment Variables

```env
DATABASE_URL=postgresql://itour:...@localhost:5432/itour_tms
DATABASE_URL_POOLED=postgresql://itour:...@localhost:6432/itour_tms?pgbouncer=true
REDIS_URL=redis://localhost:6379
AUTH_SECRET=<openssl rand -base64 32>
AUTH_TRUST_HOST=true
NEXTAUTH_URL=http://localhost:3000
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development
LOG_LEVEL=debug
NEXT_PUBLIC_DEFAULT_LOCALE=en
```

---

## Common Commands

```bash
pnpm dev              # Start dev server (Turbopack)
pnpm build            # Production build
pnpm db:migrate       # Run Prisma migrations
pnpm db:push          # Push schema changes (no migration file)
pnpm db:seed          # Seed database
pnpm db:studio        # Open Prisma Studio
pnpm db:generate      # Regenerate Prisma Client
pnpm docker:up        # Start PostgreSQL + PgBouncer + Redis
pnpm docker:down      # Stop containers
pnpm test             # Run vitest (watch mode)
pnpm test:run         # Run vitest (single run)
pnpm lint             # ESLint
pnpm format           # Prettier
```

---

## Coding Conventions

### File Organization
- **Constants:** `src/lib/constants/{module}.ts` — enum label maps, status variants
- **Validations:** `src/lib/validations/{module}.ts` — zod schemas (create/update per entity)
- **tRPC routers:** `src/server/trpc/routers/{module}/` — one file per entity
- **Pages:** `src/app/(dashboard)/{module}/` — list, new, [id] pattern
- **Services:** `src/server/services/{module}/` — business logic, calculation engines
- **Exports:** `src/lib/export/` — PDF/Excel generators

### Naming
- Prisma models: PascalCase (e.g., `ContractBaseRate`)
- Table names: snake_case via `@@map` (e.g., `contract_base_rate`)
- tRPC router keys: camelCase (e.g., `contractBaseRate`)
- B2C models keep `Public*` prefix, CRM models keep `Crm*` prefix
- Traffic models keep `Tt*` prefix

### UI Patterns
- shadcn/ui components in `src/components/ui/`
- Shared components (DataTable, Combobox) in `src/components/shared/`
- Module-specific components in `src/components/{module}/`
- Use `sonner` for toast notifications
- Use `cmdk` for command palette / search
- Use `nuqs` for URL query state management
- Use `recharts` for dashboard charts

### Do NOT
- Use floating point for money — always `decimal.js` or Prisma `Decimal`
- Use dot-notation `accessorKey` in tanstack table — use `id` + `accessorFn`
- Gate forms on `if (data)` when tRPC returns null — provide defaults
- Skip `InstalledModule` records — modules won't appear without them
- Reference or mix code/data from the iTourTT project

---

## Documentation Files

| File | Content |
|------|---------|
| `Contracting.md` | Full spec for hotel contracting module (Odoo-inspired) |
| `Reservations.md` | Full spec for booking/reservation module |
| `CRM.md` | Full spec for CRM & excursion sales module (Odoo-inspired) |
| `finance.md` | Full spec for accounting module (Odoo-inspired) |
| `progress.md` | Development milestones and changelog |

---

## Statistics

- **137 Prisma models**, **71 enums** (4,271 lines in schema)
- **90+ tRPC sub-routers** across 8 main routers
- **30+ API routes**
- **17 export generators** (PDF, Excel, Word)
- **7 installable modules**
- **3 Docker services** (PostgreSQL 16, PgBouncer, Redis 7)
