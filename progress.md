# iTourTMS — Project Progress

## Foundation (Completed)
- **Date:** 2026-02-22
- **Commit:** `7d108c1` — feat: bootstrap iTourTMS project with full foundation architecture
- **Scope:** 85 files
  - Next.js 16 + Tailwind v4 + shadcn/ui setup
  - PostgreSQL 16 + Prisma v7 + PrismaPg adapter
  - Redis 7 (ioredis singleton)
  - Auth.js v5 (credentials, JWT, RBAC)
  - tRPC v11 (full middleware chain: public → protected → module → permission)
  - Docker Compose (postgres, pgbouncer, redis)
  - Setup wizard (4-step: Company → Modules → Config → Admin)
  - Seed data: 171 countries, 50 currencies, 8 languages, 5 titles
  - Application shell: sidebar, topbar, auth layout, dashboard layout
  - Module registry with dependency enforcement

---

## Finance Phase 1: Foundation & Configuration (Completed)
- **Date:** 2026-02-23
- **Commit:** `e0048af` — feat(finance): implement Phase 1 — foundation & configuration
- **Scope:** 36 files, 4,523 lines

### Prisma Schema
- 7 enums: AccountType (18 values), JournalType (6), TaxUse (3), TaxAmountType (4), TaxScope (2), TaxDocType (2), TermValueType (3), DelayType (3)
- 9 models: AccountGroup, AccountTag, FinAccount, Journal, TaxGroup, Tax, TaxRepartitionLine, PaymentTerm, PaymentTermLine
- Renamed Auth.js `Account` → `AuthAccount` with `@@map("Account")`

### tRPC Routers
- `finance.account.*` — CRUD + groups + tags, cursor pagination, search/filter
- `finance.journal.*` — CRUD with type filtering
- `finance.tax.*` — CRUD with nested repartition lines + groups CRUD
- `finance.paymentTerm.*` — CRUD with nested lines + computeDueDates

### Services
- `tax-computation.ts` — PERCENT/FIXED/DIVISION, price-included, cascading (Decimal.js)
- `payment-term-calculator.ts` — installment schedules, 3 delay types (date-fns)
- `sequence-generator.ts` — document numbering with yearly/monthly reset

### UI Pages (14 pages)
- Chart of Accounts: list, create, edit
- Journals: list, create, edit
- Taxes: list, create, edit (with repartition lines)
- Tax Groups: list with inline dialog
- Payment Terms: list, create, edit (with installment lines)

### Shared Components
- `DataTable` — @tanstack/react-table: sorting, filtering, pagination
- `MonetaryField` — currency-aware amount input

### Seed Data
- 45 accounts, 5 groups, 6 journals, 2 taxes (VAT 14%), 4 payment terms
- 17 permissions, 2 roles (finance_manager, finance_accountant)

### Key Decisions
- `FinAccount` naming to avoid Auth.js collision (mapped to `fin_account`)
- `z.input<>` for form types to match zodResolver with default fields
- Named relations for Journal → FinAccount (4 FK refs)

---

## Finance Phases 2–8 (Completed)
- **Date:** 2026-02-23
- **Commits:** `e0048af` → `72e3559`

### Phase 2: Core Engine & Invoicing
- Move/MoveLineItem models, journal entry CRUD
- Customer invoices, vendor bills, credit notes/refunds
- Tax computation on line items, payment term due date calculation

### Phase 3: Payments & Reconciliation
- Payment model, inbound/outbound payments
- Partial reconciliation engine, payment state tracking

### Phase 4: Reports
- Trial Balance, Profit & Loss, Balance Sheet
- General Ledger, Aged Receivable/Payable
- XLSX export via `xlsx` library

### Phase 5: Bank Operations
- Bank statements, statement lines, reconciliation UI
- Batch payments

### Phase 6: Advanced — Currencies
- Multi-currency support, exchange rate panel
- GL dual-amount display (currency + company currency)

### Phase 7: Period Management
- Fiscal Year & Fiscal Period models
- Year-end closing with closing journal entry
- Period locking

### Phase 8: Recurring Entries & Budgets
- Recurring journal entry templates (monthly/quarterly/yearly)
- Budget model with 12-month allocation
- Budget vs Actuals report

---

## Contracting Phase 1: Hotel Master Data (Completed)
- **Date:** 2026-02-23
- **Commit:** `1780808` — feat(contracting): implement Phase 1 — hotel master data

### Prisma Schema
- 6 enums: StarRating, MealCode, ChildAgeCategory, ChildBedding, ContractStatus, RateBasis
- 8 models: Destination, City, HotelAmenity, Hotel, HotelImage, HotelRoomType, RoomTypeOccupancy, ChildPolicy, HotelMealBasis
- All mapped with `ct_` prefix

### tRPC Routers
- `contracting.destination.*` — CRUD + city CRUD (inline grid)
- `contracting.hotel.*` — CRUD + amenities + images
- `contracting.roomType.*` — CRUD with occupancy table
- `contracting.childPolicy.*` — CRUD
- `contracting.mealBasis.*` — CRUD

### UI Pages
- Destinations: list, create, detail (with inline cities grid)
- Hotels: list, create, detail, edit
- Google Places autocomplete integration for hotel address

---

## Contracting Phases 2–13 (Completed)
- **Date:** 2026-02-23 → 2026-02-24
- **Commits:** `fe2375d` → `3736fe8`

### Phase 2: Contract Core
- Contract model with seasons, room types, meal bases
- Contract creation wizard, detail page with tabbed UI

### Phase 3: Contract Supplements
- 6 supplement types: Room Type, Meal, Occupancy, Child, View, Extra Bed
- Bulk save with season × dimension matrix grids

### Phase 4: Rate Calculation Engine
- Full rate calculator: base rate + all supplements
- Rate sheet generation across all seasons/rooms/meals

### Phase 5: Special Offers
- 5 offer types: Early Bird, Long Stay, Free Nights, Honeymoon, Group Discount
- Configurable eligibility rules and discount computation

### Phase 6: Allotment Management
- Season × Room Type allotment matrix
- Free sale toggle, sold rooms tracking

### Phase 7: Contract Cloning & Versioning
- Clone contract with all nested data (seasons, rates, supplements, etc.)
- Parent-child contract lineage tracking

### Phase 8: Contract-Level Child Policies
- Override hotel-level child policies per contract
- Import from hotel defaults

### Phase 9: Contract Dashboard
- Summary cards, status workflow (Draft → Posted → Published)
- Quick stats and navigation

### Phase 10: Cancellation Policies
- Configurable cancellation tiers (days before, charge type/value)
- Percentage, Fixed, First Night charge types

### Phase 11: Contract Comparison
- Side-by-side comparison of 2–3 contracts
- Diff highlighting for rates, supplements, policies

### Phase 12: Contract Reports & Export
- Contract summary report, XLSX export
- Rate sheet export

### Phase 13: Contract Templates
- isTemplate flag, template list page
- Create contract from template

---

## Contracting: Market Settings, Zones & Hotel Code Generation (Completed)
- **Date:** 2026-02-24
- **Commits:** `e3af823`, `72b885d`, `d4d45b5`

### Prisma Schema
- Added `Zone` model (id, companyId, cityId, name, code, active) mapped to `ct_zone`
  - Unique constraint: `[companyId, cityId, code]`
  - Relations: Company, City, Hotel[]
- Added `hotelCodePrefix String?` to Company model
- Added `zoneId String?` to Hotel model with relation and index

### Migration
- `20260224002510_add_zones_and_hotel_code_prefix`

### Validation Schemas
- `zoneCreateSchema` — cityId, name, code (1 char), active
- `zoneUpdateSchema` — partial of name, code, active
- Added `zoneId: z.string().nullish()` to `hotelCreateSchema`
- Changed `marketCreateSchema.countryIds` from `min(1)` to `default([])`

### tRPC Routers
- `contracting.destination.listZones` — zones for a city
- `contracting.destination.createZone` — with city ownership check
- `contracting.destination.updateZone` — with company ownership check
- `contracting.destination.deleteZone` — with linked hotels check
- `contracting.hotel.getNextHotelCode` — generates `{prefix}{cityCode}{zoneCode}{increment}`
- `settings.getCompanySettings` — added `hotelCodePrefix` to select
- `settings.updateCompanySettings` — added `hotelCodePrefix` to input

### UI Changes

#### Settings > Contracting Tab
- **Hotel Code Prefix** — single-letter input saved via `updateCompanySettings`
- **Market Predefinitions** — inline-editable CRUD grid (code, name, active, delete)
  - Same pattern as CitiesSection: Enter to save, Arrow keys to navigate

#### Contract Detail > Markets Tab
- Removed `createMarketMutation`, `showCreate`, `newMarket` state, `handleCreateMarket()`
- Removed entire "Create Market" dialog
- Empty state now shows: "No markets defined. Go to Settings > Contracting to create markets."
- "Add Market" button only shows when predefined markets exist

#### Destination Detail > Zones Section
- City selector buttons to toggle zone management per city
- `ZoneCityGrid` component — inline-editable grid (code = 1 uppercase letter, name, active, delete)

#### Hotel Create & Edit Pages
- Added Zone selector dropdown (filtered by selected city)
- Auto-generates hotel code via `getNextHotelCode` when zone is selected
- Code field becomes read-only (with `bg-muted font-mono` styling) when zone selected
- Cascade resets: Country → Destination → City → Zone

### Bug Fixes
- Fixed infinite `useEffect` loop in `MarketManagementSection` and `ZoneCityGrid` — changed dependency from `data ?? []` (new array ref each render) to raw query data with early return guard

---

## Infrastructure: tRPC Auth & Stability Fixes (Completed)
- **Date:** 2026-02-24
- **Commits:** `f0384ee`, `8074559`, `556a577`

### tRPC Route Handler — Auth Session Fix
- **Root cause:** `auth()` called inside `fetchRequestHandler` callback could lose Next.js 16 async context, causing session to be `null` or throwing exceptions → HTTP 500
- **Fix:** Moved `auth()` call to the Route Handler level (`src/app/api/trpc/[trpc]/route.ts`), wrapped in try-catch, pre-resolved session passed into `createTRPCContext({ session })`
- `createTRPCContext` now accepts optional `{ session }` param; falls back to `auth()` for server-side callers

### Prisma Client Regeneration
- **Root cause:** After running `prisma migrate dev`, the Prisma client types were stale — `hotelCodePrefix` and `Zone` model not recognized at runtime → `Unknown field` errors causing HTTP 500
- **Fix:** `npx prisma generate` + clear `.next` cache + restart dev server
- **Lesson:** Always run `prisma generate` after schema changes and restart the dev server

### QueryClient Retry Policy
- Added `retry` function to QueryClient: UNAUTHORIZED errors skip retries (avoids flooding server)
- Mutations: `retry: false` (no automatic retry on mutation failures)

### Zone & Market CRUD — Save Buttons & Toast Notifications
- Added explicit **Save** buttons to new rows in Zone and Market inline grids (alongside Enter-to-save)
- Added `toast.success()` / `toast.error()` notifications for all zone CRUD (create, update, delete)
- Added `toast.success()` / `toast.error()` notifications for all market CRUD (create, update, delete)

### Settings Page — General Tab Fix
- Separated `isLoading` from null data check — prevents infinite "Loading..." when data returns null
- Added "Unable to load company settings" fallback message
- Added error/loading states for market query (moduleProcedure may throw FORBIDDEN if contracting not installed)

### Files Changed
| File | Change |
|------|--------|
| `src/app/api/trpc/[trpc]/route.ts` | Pre-resolve auth session, try-catch wrapper |
| `src/server/trpc/index.ts` | Accept optional session param in createTRPCContext |
| `src/components/providers/trpc-provider.tsx` | UNAUTHORIZED retry skip, mutation retry: false |
| `src/app/(dashboard)/settings/page.tsx` | General tab fix, market toast + Save button |
| `src/app/(dashboard)/contracting/destinations/[id]/page.tsx` | Zone toast + Save button |

---

## Pending / Next Steps
- Finance Phases 2–8: Already completed (see above)
- Contracting: All 13 phases + market/zone/settings enhancements complete
- **Next:** CRM module, Reservations module, Traffic module
