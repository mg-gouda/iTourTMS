# iTourTMS — Hotel Contracting Module Specification

> Complete specification for the Hotel Contracting module — the core revenue engine for a travel management system. Manages hotel definitions, room types, occupancy, meal basis, allocation, seasonal pricing, supplements, special offers, stop sales, rate calculation, markup, and tariff export.

---

## Table of Contents

1. [Module Overview](#module-overview)
2. [Database Schema](#database-schema)
3. [UI Structure](#ui-structure)
4. [Business Logic & Workflows](#business-logic--workflows)
5. [Rate Calculation Engine](#rate-calculation-engine)
6. [Special Offers Engine](#special-offers-engine)
7. [Markup & Tariff Module](#markup--tariff-module)
8. [API Routes](#api-routes)
9. [File Structure](#file-structure)
10. [Reports](#reports)
11. [Implementation Phases](#implementation-phases)

---

## Module Overview

| # | Sub-Module | Description |
|---|-----------|-------------|
| 1 | **Hotel Definition** | Hotel master data — name, star rating, location, contacts, amenities, images, description |
| 2 | **Room Types** | Room categories per hotel — Standard, Superior, Deluxe, Suite, etc. with max occupancy |
| 3 | **Occupancy Table** | Per room type: valid adult/child combinations, extra bed availability, max pax |
| 4 | **Children Policy** | Age brackets per hotel (infant, child, teen), free child rules, sharing/extra bed policies |
| 5 | **Meal Basis** | Meal plans per hotel — RO, BB, HB, FB, AI, UAI, SC with descriptions |
| 6 | **Allocation (Allotment)** | Room inventory per date: freesale, on-request, commitment, release periods |
| 7 | **Contract** | The core contract entity — hotel, validity, seasons, base room type, rate basis (per person/per room) |
| 8 | **Seasons** | Date ranges within contract — Peak, High, Shoulder, Mid, Low — with release periods |
| 9 | **Base Rates** | Net rates for the base room type per season per meal basis |
| 10 | **Room Type Supplements** | Price difference from base to each other room type, per season |
| 11 | **Occupancy Supplements/Reductions** | SGL supplement, 3rd adult reduction, child prices by age bracket, per room type per season |
| 12 | **Meal Supplements** | Upgrade cost from one meal basis to another, per season |
| 13 | **Rate Calculation Engine** | Compute and populate final rates for every combination: room × meal × occupancy × season |
| 14 | **Calculated Rates Grid** | The output matrix of all computed rates — viewable, exportable, overrideable |
| 15 | **Special Offers** | EBD, Rolling EBD, Senior Citizen, Honeymoon, Long Stay, Marketing Contribution, Free Nights |
| 16 | **Special Meals** | Mandatory gala supplements (NYE, Christmas) |
| 17 | **Stop Sales** | Block dates/room types from sale |
| 18 | **Seasonal Special Offer Reports** | Per-season offer summary and conditions |
| 19 | **EBD Condition Report** | Cross-contract EBD comparison per season |
| 20 | **Markup Module** | Apply markup (%) on net rates to generate selling prices |
| 21 | **Tariff Export** | Generate and export tariff sheets for tour operators (PDF/Excel) |
| 22 | **Market-Based Contracting** | Market definitions (UK, West Europe, East Europe, Russian, CIS, Far East, MENA, Latin America, North America) with selling countries. Contracts can be market-specific (e.g. different rates for UK market vs. CIS market for the same hotel) |
| 23 | **Tour Operators** | TO master data, per-contract TO assignment, bulk hotel-to-TO assignment |
| 24 | **Contract Copy** | Duplicate contract for next season with freeze/increase/decrease/average rate adjustment |
| 25 | **Rate Verification** | Booking simulator to verify rate loading correctness. Shows all room × meal × occupancy combinations. Available for all contract statuses and for SPO verification |

---

## Database Schema

### Enums

```prisma
enum StarRating {
  ONE
  TWO
  THREE
  FOUR
  FIVE
  FIVE_DELUXE
}

enum ContractStatus {
  DRAFT              // initial state — editable, rates can be calculated & verified
  POSTED             // finalized & locked for internal review — rates confirmed
  PUBLISHED          // live & available to tour operators — visible in booking engine
}

enum RateBasis {
  PER_PERSON     // rate is per person per night
  PER_ROOM       // rate is per room per night
}

enum AllocationBasis {
  FREESALE       // unlimited availability — no deduction from allotment
  ON_REQUEST     // must confirm with hotel each booking
  COMMITMENT     // guaranteed allotment — must pay even if unsold (or release before cutoff)
  ALLOCATION     // standard allotment — release back if unsold before release period
}

enum MealCode {
  RO             // Room Only
  BB             // Bed & Breakfast
  HB             // Half Board (breakfast + dinner)
  FB             // Full Board (breakfast + lunch + dinner)
  AI             // All Inclusive
  UAI            // Ultra All Inclusive
  SC             // Self Catering
}

enum SupplementType {
  ROOM_TYPE      // upgrade from base room type
  MEAL           // upgrade from base meal basis
  OCCUPANCY      // SGL supplement, extra adult, etc.
  VIEW           // sea view, garden view, pool view
  EXTRA_BED      // extra bed supplement
  CHILD          // child pricing by age bracket
}

enum SupplementValueType {
  FIXED          // fixed amount
  PERCENTAGE     // percentage of base rate
}

enum OfferType {
  EBD                    // Early Bird/Booking Discount
  ROLLING_EBD            // Sliding scale EBD
  SENIOR_CITIZEN         // Age-based discount
  HONEYMOON              // Honeymoon package
  LONG_STAY              // Stay X nights pay Y
  FREE_NIGHTS            // Stay X get Y free
  MARKETING_CONTRIBUTION // Commission/marketing fund from hotel
  COMBINABLE_DISCOUNT    // Generic combinable percentage discount
}

enum OfferValueType {
  PERCENTAGE             // discount as percentage
  FIXED_AMOUNT           // fixed amount off
  FREE_NIGHTS            // stay X pay Y
  UPGRADE                // free room upgrade
  COMPLIMENTARY          // free extras (cake, flowers, etc.)
}

enum OfferApplicability {
  ALL_ROOM_TYPES
  SPECIFIC_ROOM_TYPES
}

enum OfferMealApplicability {
  ALL_MEAL_BASIS
  SPECIFIC_MEAL_BASIS
}

enum StopSaleScope {
  ALL                    // entire hotel
  ROOM_TYPE              // specific room types
  MEAL_BASIS             // specific meal plans
}

enum MarkupType {
  PERCENTAGE
  FIXED_PER_NIGHT
  FIXED_PER_BOOKING
}

enum MarketCode {
  UK                 // United Kingdom
  WEST_EUROPE        // France, Germany, Italy, Spain, Netherlands, Belgium, etc.
  EAST_EUROPE        // Poland, Czech Republic, Hungary, Romania, Bulgaria, etc.
  RUSSIAN            // Russia
  CIS                // Ukraine, Kazakhstan, Uzbekistan, Belarus, Azerbaijan, Georgia, etc.
  FAR_EAST           // China, Japan, South Korea, Southeast Asia, Australia, NZ
  MENA               // Middle East & North Africa (UAE, Saudi, Egypt, Morocco, etc.)
  LATIN_AMERICA      // Brazil, Mexico, Argentina, Colombia, etc.
  NORTH_AMERICA      // USA, Canada
}

enum ChildAgeCategory {
  INFANT         // typically 0-1
  CHILD          // typically 2-11
  TEEN           // typically 12-17
}

enum ChildBedding {
  SHARING_WITH_PARENTS   // child shares existing bed
  EXTRA_BED              // child in extra bed
  OWN_BED                // child occupies own bed (counts as adult)
}

enum GalaMealType {
  NEW_YEARS_EVE
  CHRISTMAS_EVE
  CHRISTMAS_DAY
  EASTER
  OTHER
}
```

### Core Models

```prisma
// ============================================================
// HOTEL DEFINITION
// ============================================================

model Hotel {
  id                String       @id @default(cuid())
  name              String
  code              String       @unique              // short code e.g. "HLT-DXB-001"
  starRating        StarRating
  chainName         String?                           // hotel chain/brand
  description       String?                           // rich text description
  shortDescription  String?

  // --- Location ---
  address           String?
  city              String
  stateId           String?
  state             CountryState? @relation(fields: [stateId], references: [id])
  countryId         String
  country           Country      @relation(fields: [countryId], references: [id])
  zipCode           String?
  latitude          Float?
  longitude         Float?
  destinationId     String?
  destination       Destination? @relation(fields: [destinationId], references: [id])

  // --- Contact ---
  phone             String?
  fax               String?
  email             String?
  website           String?
  reservationEmail  String?
  contactPerson     String?
  contactPhone      String?

  // --- Details ---
  checkInTime       String?      @default("14:00")
  checkOutTime      String?      @default("12:00")
  totalRooms        Int?
  yearBuilt         Int?
  yearRenovated     Int?

  // --- Relationships ---
  roomTypes         HotelRoomType[]
  childrenPolicies  ChildPolicy[]
  mealBasis         HotelMealBasis[]
  contracts         Contract[]
  allocations       Allocation[]
  amenities         HotelAmenity[]
  images            HotelImage[]
  stopSales         StopSale[]
  tourOperators     HotelTourOperator[]

  // --- Meta ---
  active            Boolean      @default(true)
  companyId         String
  company           Company      @relation(fields: [companyId], references: [id])
  createdAt         DateTime     @default(now())
  updatedAt         DateTime     @updatedAt
}

model Destination {
  id        String   @id @default(cuid())
  name      String                                    // e.g. "Dubai", "Antalya", "Maldives"
  code      String   @unique
  countryId String
  country   Country  @relation(fields: [countryId], references: [id])
  hotels    Hotel[]
  active    Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model HotelAmenity {
  id        String  @id @default(cuid())
  name      String                                    // e.g. "Pool", "Spa", "Gym", "Beach"
  icon      String?
  category  String?                                   // "General", "Room", "Recreation", etc.
  hotels    Hotel[]
}

model HotelImage {
  id        String  @id @default(cuid())
  hotelId   String
  hotel     Hotel   @relation(fields: [hotelId], references: [id], onDelete: Cascade)
  url       String
  caption   String?
  sortOrder Int     @default(0)
  isPrimary Boolean @default(false)
}

// ============================================================
// ROOM TYPES & OCCUPANCY TABLE
// ============================================================

model HotelRoomType {
  id                String   @id @default(cuid())
  hotelId           String
  hotel             Hotel    @relation(fields: [hotelId], references: [id], onDelete: Cascade)
  name              String                            // "Standard Double", "Deluxe Sea View", "Junior Suite"
  code              String                            // "STD", "DLX", "JSUI"
  description       String?
  sortOrder         Int      @default(0)

  // --- Capacity ---
  maxAdults         Int      @default(2)
  maxChildren       Int      @default(1)
  maxInfants        Int      @default(1)
  maxOccupancy      Int      @default(3)              // total max pax
  extraBedAvailable Boolean  @default(false)
  maxExtraBeds      Int      @default(0)

  // --- Size ---
  roomSize          Float?                            // square meters
  bedConfiguration  String?                           // "1 King" or "2 Twin" or "1 King + 1 Sofa"

  // --- Relationships ---
  occupancyTable    RoomTypeOccupancy[]
  contractRoomTypes ContractRoomType[]
  supplements       ContractSupplement[]
  allocations       Allocation[]
  stopSales         StopSaleRoomType[]
  calculatedRates   CalculatedRate[]
  images            HotelImage[]

  active            Boolean  @default(true)
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  @@unique([hotelId, code])
}

// --- Occupancy Table: Valid adult/child combinations per room type ---

model RoomTypeOccupancy {
  id              String        @id @default(cuid())
  roomTypeId      String
  roomType        HotelRoomType @relation(fields: [roomTypeId], references: [id], onDelete: Cascade)
  adults          Int                                 // number of adults
  children        Int           @default(0)           // number of children
  infants         Int           @default(0)           // number of infants
  extraBeds       Int           @default(0)           // extra beds needed
  isDefault       Boolean       @default(false)       // default/standard occupancy
  description     String?                             // e.g. "2 Adults + 1 Child sharing"
  sortOrder       Int           @default(0)

  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt

  @@unique([roomTypeId, adults, children, infants, extraBeds])
}

// ============================================================
// CHILDREN POLICY
// ============================================================

model ChildPolicy {
  id              String          @id @default(cuid())
  hotelId         String
  hotel           Hotel           @relation(fields: [hotelId], references: [id], onDelete: Cascade)
  category        ChildAgeCategory
  ageFrom         Int                                 // inclusive (e.g. 0)
  ageTo           Int                                 // inclusive (e.g. 1)
  label           String                              // "Infant (0-1)", "Child (2-11)", "Teen (12-17)"

  // --- Pricing Rules ---
  freeInSharing   Boolean         @default(false)     // free when sharing with parents
  maxFreePerRoom  Int             @default(0)          // max free children per room
  extraBedAllowed Boolean         @default(true)
  mealsIncluded   Boolean         @default(false)     // meals included in free policy

  // --- Notes ---
  notes           String?

  createdAt       DateTime        @default(now())
  updatedAt       DateTime        @updatedAt

  @@unique([hotelId, category])
}

// ============================================================
// MEAL BASIS
// ============================================================

model HotelMealBasis {
  id              String   @id @default(cuid())
  hotelId         String
  hotel           Hotel    @relation(fields: [hotelId], references: [id], onDelete: Cascade)
  mealCode        MealCode
  name            String                              // "Bed & Breakfast", "Half Board"
  description     String?                             // what's included
  isDefault       Boolean  @default(false)            // default meal basis for this hotel
  active          Boolean  @default(true)
  sortOrder       Int      @default(0)

  // --- Relationships ---
  contractMealBasis ContractMealBasis[]
  supplements       ContractSupplement[]
  calculatedRates   CalculatedRate[]
  stopSales         StopSaleMealBasis[]

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@unique([hotelId, mealCode])
}

// ============================================================
// ALLOCATION (ALLOTMENT)
// ============================================================

model Allocation {
  id              String          @id @default(cuid())
  hotelId         String
  hotel           Hotel           @relation(fields: [hotelId], references: [id])
  roomTypeId      String
  roomType        HotelRoomType   @relation(fields: [roomTypeId], references: [id])
  contractId      String?
  contract        Contract?       @relation(fields: [contractId], references: [id])
  date            DateTime        @db.Date            // specific date
  allocationBasis AllocationBasis
  totalRooms      Int             @default(0)         // allocated rooms for this date
  bookedRooms     Int             @default(0)         // rooms already booked
  availableRooms  Int             @default(0)         // computed: total - booked
  releaseDays     Int             @default(0)         // days before check-in to release

  // --- Commitment specific ---
  isReleased      Boolean         @default(false)     // allotment released back to hotel
  releaseDate     DateTime?                           // date when allotment gets released

  createdAt       DateTime        @default(now())
  updatedAt       DateTime        @updatedAt

  @@unique([hotelId, roomTypeId, contractId, date])
  @@index([date])
  @@index([hotelId, date])
}

// ============================================================
// CONTRACT
// ============================================================

model Contract {
  id                  String         @id @default(cuid())
  name                String                           // "Hilton Dubai 2026 Summer"
  code                String         @unique           // "CTR-HLT-DXB-2026-S1"
  status              ContractStatus @default(DRAFT)

  // --- Hotel ---
  hotelId             String
  hotel               Hotel          @relation(fields: [hotelId], references: [id])

  // --- Validity ---
  validFrom           DateTime       @db.Date          // contract start date
  validTo             DateTime       @db.Date          // contract end date

  // --- Market (for market-based contracts, e.g. Egypt hotels) ---
  marketId            String?                            // null = generic/all markets
  market              Market?        @relation(fields: [marketId], references: [id])

  // --- Rate Configuration ---
  rateBasis           RateBasis                        // PER_PERSON or PER_ROOM
  baseCurrencyId      String
  baseCurrency        Currency       @relation(fields: [baseCurrencyId], references: [id])

  // --- Base Room Type ---
  baseRoomTypeId      String                           // all supplements are relative to this
  baseRoomType        HotelRoomType  @relation(fields: [baseRoomTypeId], references: [id])

  // --- Base Meal Basis ---
  baseMealBasisId     String                           // default meal plan for base rates
  baseMealBasis       HotelMealBasis @relation(fields: [baseMealBasisId], references: [id])

  // --- Minimum Stay ---
  minimumStay         Int            @default(1)       // minimum nights
  maximumStay         Int?                             // maximum nights (null = no limit)

  // --- Notes ---
  terms               String?                          // contract terms & conditions
  internalNotes       String?                          // internal notes for team
  hotelNotes          String?                          // notes from hotel

  // --- Relationships ---
  seasons             ContractSeason[]
  roomTypes           ContractRoomType[]
  mealBasis           ContractMealBasis[]
  baseRates           ContractBaseRate[]
  supplements         ContractSupplement[]
  calculatedRates     CalculatedRate[]
  specialOffers       SpecialOffer[]
  specialMeals        SpecialMeal[]
  stopSales           StopSale[]
  allocations         Allocation[]
  markupRules         MarkupRule[]

  // --- Tour Operator Assignments ---
  tourOperators       ContractTourOperator[]

  // --- Copy Tracking ---
  copiedFromId        String?                           // source contract this was copied from
  copiedFrom          Contract?      @relation("ContractCopy", fields: [copiedFromId], references: [id])
  copies              Contract[]     @relation("ContractCopy")

  // --- Audit ---
  postedById          String?
  postedBy            User?          @relation("ContractPoster", fields: [postedById], references: [id])
  postedAt            DateTime?
  publishedById       String?
  publishedBy         User?          @relation("ContractPublisher", fields: [publishedById], references: [id])
  publishedAt         DateTime?
  createdById         String
  createdBy           User           @relation("ContractCreator", fields: [createdById], references: [id])

  // --- Meta ---
  companyId           String
  company             Company        @relation(fields: [companyId], references: [id])
  createdAt           DateTime       @default(now())
  updatedAt           DateTime       @updatedAt
}

// ============================================================
// CONTRACT SEASONS
// ============================================================

model ContractSeason {
  id              String    @id @default(cuid())
  contractId      String
  contract        Contract  @relation(fields: [contractId], references: [id], onDelete: Cascade)
  name            String                              // "Peak", "High", "Shoulder", "Mid", "Low"
  code            String                              // "PK", "HI", "SH", "MD", "LW"
  dateFrom        DateTime  @db.Date
  dateTo          DateTime  @db.Date
  sortOrder       Int       @default(0)

  // --- Release Period ---
  releaseDays     Int       @default(21)              // days before arrival to release allotment

  // --- Minimum Stay Override ---
  minimumStay     Int?                                // override contract-level min stay for this season

  // --- Relationships ---
  baseRates       ContractBaseRate[]
  supplements     ContractSupplement[]
  calculatedRates CalculatedRate[]
  specialOffers   SeasonalOfferPeriod[]

  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  @@unique([contractId, code])
  @@index([dateFrom, dateTo])
}

// ============================================================
// CONTRACT ROOM TYPES (which room types are in this contract)
// ============================================================

model ContractRoomType {
  id              String        @id @default(cuid())
  contractId      String
  contract        Contract      @relation(fields: [contractId], references: [id], onDelete: Cascade)
  roomTypeId      String
  roomType        HotelRoomType @relation(fields: [roomTypeId], references: [id])
  isBase          Boolean       @default(false)       // true if this is the base room type
  sortOrder       Int           @default(0)

  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt

  @@unique([contractId, roomTypeId])
}

// ============================================================
// CONTRACT MEAL BASIS (which meal plans are in this contract)
// ============================================================

model ContractMealBasis {
  id              String         @id @default(cuid())
  contractId      String
  contract        Contract       @relation(fields: [contractId], references: [id], onDelete: Cascade)
  mealBasisId     String
  mealBasis       HotelMealBasis @relation(fields: [mealBasisId], references: [id])
  isBase          Boolean        @default(false)      // true if this is the base meal basis
  sortOrder       Int            @default(0)

  createdAt       DateTime       @default(now())
  updatedAt       DateTime       @updatedAt

  @@unique([contractId, mealBasisId])
}

// ============================================================
// CONTRACT BASE RATES
// Per season, the base room type net rate
// ============================================================

model ContractBaseRate {
  id              String         @id @default(cuid())
  contractId      String
  contract        Contract       @relation(fields: [contractId], references: [id], onDelete: Cascade)
  seasonId        String
  season          ContractSeason @relation(fields: [seasonId], references: [id], onDelete: Cascade)

  // --- Rate ---
  // If PER_PERSON: rate per person per night in base room type with base meal basis
  // If PER_ROOM: rate per room per night for base room type with base meal basis
  rate            Decimal

  // --- For PER_PERSON: rate per number of adults ---
  // (some contracts price differently: 1 adult = X, 2 adults = Y)
  singleRate      Decimal?                            // 1 adult rate (if different)
  doubleRate      Decimal?                            // 2 adult rate (per person)
  tripleRate      Decimal?                            // 3 adult rate (per person, if applicable)

  createdAt       DateTime       @default(now())
  updatedAt       DateTime       @updatedAt

  @@unique([contractId, seasonId])
}

// ============================================================
// CONTRACT SUPPLEMENTS
// Supplements/reductions on top of base rate
// ============================================================

model ContractSupplement {
  id                  String             @id @default(cuid())
  contractId          String
  contract            Contract           @relation(fields: [contractId], references: [id], onDelete: Cascade)
  seasonId            String
  season              ContractSeason     @relation(fields: [seasonId], references: [id], onDelete: Cascade)
  supplementType      SupplementType

  // --- What this supplement applies to ---
  roomTypeId          String?                          // for ROOM_TYPE supplements
  roomType            HotelRoomType?     @relation(fields: [roomTypeId], references: [id])
  mealBasisId         String?                          // for MEAL supplements
  mealBasis           HotelMealBasis?    @relation(fields: [mealBasisId], references: [id])

  // --- Occupancy context (for OCCUPANCY/CHILD supplements) ---
  forAdults           Int?                             // applies when this many adults
  forChildCategory    ChildAgeCategory?                // INFANT, CHILD, or TEEN
  forChildBedding     ChildBedding?                    // SHARING or EXTRA_BED
  forExtraBed         Boolean            @default(false)

  // --- Value ---
  valueType           SupplementValueType @default(FIXED)
  value               Decimal                          // amount or percentage
  isReduction         Boolean             @default(false) // true = reduction (negative supplement)

  // --- Per Person or Per Room ---
  // Inherits from contract rateBasis, but can be overridden:
  perPerson           Boolean             @default(true)  // applies per person per night
  perNight            Boolean             @default(true)  // applies per night (vs per stay)

  // --- Description ---
  label               String?                          // e.g. "SGL Supplement", "Sea View", "3rd Adult Reduction"
  notes               String?

  sortOrder           Int                 @default(0)
  createdAt           DateTime            @default(now())
  updatedAt           DateTime            @updatedAt

  @@index([contractId, seasonId, supplementType])
}

// ============================================================
// CALCULATED RATES (OUTPUT MATRIX)
// Generated by the rate calculation engine
// ============================================================

model CalculatedRate {
  id              String         @id @default(cuid())
  contractId      String
  contract        Contract       @relation(fields: [contractId], references: [id], onDelete: Cascade)
  seasonId        String
  season          ContractSeason @relation(fields: [seasonId], references: [id], onDelete: Cascade)
  roomTypeId      String
  roomType        HotelRoomType  @relation(fields: [roomTypeId], references: [id])
  mealBasisId     String
  mealBasis       HotelMealBasis @relation(fields: [mealBasisId], references: [id])

  // --- Occupancy ---
  adults          Int
  children        Int            @default(0)
  infants         Int            @default(0)
  childCategory   ChildAgeCategory?
  childBedding    ChildBedding?

  // --- Rates ---
  netRate         Decimal                             // final net rate (cost)
  baseRate        Decimal                             // base rate used
  roomSupplement  Decimal        @default(0)          // room type supplement applied
  mealSupplement  Decimal        @default(0)          // meal supplement applied
  occupancySupplement Decimal    @default(0)          // occupancy supplement/reduction
  childSupplement Decimal        @default(0)          // child supplement

  // --- Rate Basis ---
  rateBasis       RateBasis                           // PER_PERSON or PER_ROOM
  perNight        Boolean        @default(true)

  // --- Override ---
  isManualOverride Boolean       @default(false)      // manually adjusted
  overrideNotes   String?

  createdAt       DateTime       @default(now())
  updatedAt       DateTime       @updatedAt

  @@unique([contractId, seasonId, roomTypeId, mealBasisId, adults, children, infants, childCategory, childBedding])
  @@index([contractId, seasonId])
}

// ============================================================
// SPECIAL OFFERS
// ============================================================

model SpecialOffer {
  id                    String              @id @default(cuid())
  contractId            String
  contract              Contract            @relation(fields: [contractId], references: [id], onDelete: Cascade)
  name                  String                           // "Early Bird 15%", "Stay 7 Pay 5"
  offerType             OfferType
  active                Boolean             @default(true)
  sortOrder             Int                 @default(0)

  // --- Booking Window (when the booking must be made) ---
  bookingFrom           DateTime?           @db.Date     // book from date
  bookingTo             DateTime?           @db.Date     // book by date

  // --- Stay Window (when the stay must occur) ---
  stayFrom              DateTime?           @db.Date     // stay from date
  stayTo                DateTime?           @db.Date     // stay until date

  // --- Seasonal Applicability ---
  seasonalPeriods       SeasonalOfferPeriod[]            // which seasons this applies to

  // --- Conditions ---
  minimumStay           Int?                             // minimum nights to qualify
  maximumStay           Int?                             // max nights applicable
  minimumLeadDays       Int?                             // min days between booking & check-in (for EBD)
  maximumLeadDays       Int?                             // max days for rolling EBD tiers

  // --- Value ---
  valueType             OfferValueType
  value                 Decimal?                         // percentage, fixed amount, or free nights count
  stayNights            Int?                             // for FREE_NIGHTS: stay X nights
  payNights             Int?                             // for FREE_NIGHTS: pay Y nights
  freeNightPosition     String?                          // "cheapest", "last", "specific"

  // --- Applicability ---
  roomApplicability     OfferApplicability   @default(ALL_ROOM_TYPES)
  mealApplicability     OfferMealApplicability @default(ALL_MEAL_BASIS)
  applicableRoomTypes   SpecialOfferRoomType[]
  applicableMealBasis   SpecialOfferMealBasis[]

  // --- Age Conditions (Senior Citizen) ---
  minimumAge            Int?                             // e.g. 55 or 60

  // --- Honeymoon Conditions ---
  requireMarriageCert   Boolean             @default(false)
  maxMonthsSinceWedding Int?                             // e.g. 6 months
  honeymoonExtras       String?                          // JSON: free cake, flowers, upgrade, etc.

  // --- Long Stay Tiers ---
  longStayTiers         LongStayTier[]

  // --- Rolling EBD Tiers ---
  rollingEbdTiers       RollingEbdTier[]

  // --- Marketing Contribution ---
  contributionType      MarkupType?                      // PERCENTAGE or FIXED
  contributionValue     Decimal?

  // --- Combinability ---
  combinableWithOther   Boolean             @default(false)  // can combine with other offers
  combinableOfferIds    String[]            @default([])     // specific offer IDs it can combine with
  priority              Int                 @default(0)      // higher = applied first when combining

  // --- Notes ---
  conditions            String?                          // conditions text (for reports)
  internalNotes         String?

  companyId             String
  company               Company             @relation(fields: [companyId], references: [id])
  createdAt             DateTime            @default(now())
  updatedAt             DateTime            @updatedAt
}

// --- Which seasons an offer applies to ---

model SeasonalOfferPeriod {
  id            String         @id @default(cuid())
  offerId       String
  offer         SpecialOffer   @relation(fields: [offerId], references: [id], onDelete: Cascade)
  seasonId      String
  season        ContractSeason @relation(fields: [seasonId], references: [id])

  @@unique([offerId, seasonId])
}

// --- Room type applicability for offers ---

model SpecialOfferRoomType {
  id            String        @id @default(cuid())
  offerId       String
  offer         SpecialOffer  @relation(fields: [offerId], references: [id], onDelete: Cascade)
  roomTypeId    String
  roomType      HotelRoomType @relation(fields: [roomTypeId], references: [id])

  @@unique([offerId, roomTypeId])
}

// --- Meal basis applicability for offers ---

model SpecialOfferMealBasis {
  id            String         @id @default(cuid())
  offerId       String
  offer         SpecialOffer   @relation(fields: [offerId], references: [id], onDelete: Cascade)
  mealBasisId   String
  mealBasis     HotelMealBasis @relation(fields: [mealBasisId], references: [id])

  @@unique([offerId, mealBasisId])
}

// --- Rolling EBD Tiers (sliding discount scale) ---

model RollingEbdTier {
  id              String       @id @default(cuid())
  offerId         String
  offer           SpecialOffer @relation(fields: [offerId], references: [id], onDelete: Cascade)
  daysBeforeFrom  Int                                    // book at least X days before
  daysBeforeTo    Int                                    // book up to Y days before
  discountPercent Decimal                                // discount percentage for this tier
  sortOrder       Int          @default(0)

  @@unique([offerId, daysBeforeFrom])
}

// --- Long Stay Tiers ---

model LongStayTier {
  id              String       @id @default(cuid())
  offerId         String
  offer           SpecialOffer @relation(fields: [offerId], references: [id], onDelete: Cascade)
  minimumNights   Int                                    // stay at least X nights
  maximumNights   Int?                                   // up to Y nights (null = unlimited)
  discountPercent Decimal?                               // percentage discount
  freeNights      Int?                                   // OR: number of free nights
  sortOrder       Int          @default(0)

  @@unique([offerId, minimumNights])
}

// ============================================================
// SPECIAL MEALS (Gala Dinners)
// ============================================================

model SpecialMeal {
  id              String       @id @default(cuid())
  contractId      String
  contract        Contract     @relation(fields: [contractId], references: [id], onDelete: Cascade)
  name            String                               // "New Year's Eve Gala Dinner"
  galaMealType    GalaMealType
  date            DateTime     @db.Date                // specific date
  isMandatory     Boolean      @default(true)          // guest must pay for this

  // --- Pricing ---
  adultRate       Decimal                              // per adult
  childRate       Decimal?                             // per child (null = same as adult)
  infantRate      Decimal?     @default(0)             // per infant (usually free)
  teenRate        Decimal?                             // per teen

  // --- Applicability ---
  applicableToAllMeals  Boolean @default(false)        // applies regardless of meal plan
  excludedMealBasis     String[]  @default([])         // meal codes excluded (e.g. AI guests already included)

  // --- Notes ---
  description     String?                              // menu description, dress code, etc.
  notes           String?

  createdAt       DateTime     @default(now())
  updatedAt       DateTime     @updatedAt
}

// ============================================================
// STOP SALES
// ============================================================

model StopSale {
  id              String        @id @default(cuid())
  contractId      String?
  contract        Contract?     @relation(fields: [contractId], references: [id])
  hotelId         String
  hotel           Hotel         @relation(fields: [hotelId], references: [id])
  scope           StopSaleScope
  dateFrom        DateTime      @db.Date
  dateTo          DateTime      @db.Date
  reason          String?
  active          Boolean       @default(true)

  // --- Specific room types (when scope = ROOM_TYPE) ---
  roomTypes       StopSaleRoomType[]
  mealBasis       StopSaleMealBasis[]

  createdById     String
  createdBy       User          @relation(fields: [createdById], references: [id])
  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt

  @@index([hotelId, dateFrom, dateTo])
}

model StopSaleRoomType {
  id          String        @id @default(cuid())
  stopSaleId  String
  stopSale    StopSale      @relation(fields: [stopSaleId], references: [id], onDelete: Cascade)
  roomTypeId  String
  roomType    HotelRoomType @relation(fields: [roomTypeId], references: [id])

  @@unique([stopSaleId, roomTypeId])
}

model StopSaleMealBasis {
  id          String         @id @default(cuid())
  stopSaleId  String
  stopSale    StopSale       @relation(fields: [stopSaleId], references: [id], onDelete: Cascade)
  mealBasisId String
  mealBasis   HotelMealBasis @relation(fields: [mealBasisId], references: [id])

  @@unique([stopSaleId, mealBasisId])
}

// ============================================================
// MARKUP RULES
// ============================================================

model MarkupRule {
  id              String     @id @default(cuid())
  name            String                               // "Default 15%", "TO-SpecificMarkup"
  contractId      String?                              // specific contract (null = global)
  contract        Contract?  @relation(fields: [contractId], references: [id])
  hotelId         String?                              // specific hotel (null = all)
  destinationId   String?                              // specific destination (null = all)

  // --- Target (who gets this markup) ---
  tourOperatorId  String?                              // specific TO (null = all)
  marketId        String?                              // specific market (null = all)

  // --- Markup ---
  markupType      MarkupType                           // PERCENTAGE, FIXED_PER_NIGHT, FIXED_PER_BOOKING
  markupValue     Decimal                              // e.g. 15 for 15%, or 10 for $10/night

  // --- Validity ---
  validFrom       DateTime?  @db.Date
  validTo         DateTime?  @db.Date
  active          Boolean    @default(true)

  // --- Priority (higher = applied first for cascading) ---
  priority        Int        @default(0)

  companyId       String
  company         Company    @relation(fields: [companyId], references: [id])
  createdAt       DateTime   @default(now())
  updatedAt       DateTime   @updatedAt
}

// ============================================================
// SELLING RATES (after markup applied)
// ============================================================

model SellingRate {
  id                String   @id @default(cuid())
  calculatedRateId  String
  calculatedRate    CalculatedRate @relation(fields: [calculatedRateId], references: [id], onDelete: Cascade)
  markupRuleId      String
  markupRule        MarkupRule @relation(fields: [markupRuleId], references: [id])

  netRate           Decimal                            // original net rate
  markupAmount      Decimal                            // markup applied
  sellingRate       Decimal                            // final selling rate
  markupPercent     Decimal                            // effective markup %

  tourOperatorId    String?                            // target TO
  marketId          String?                            // target market

  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  @@index([calculatedRateId])
}

// ============================================================
// TARIFF (generated tariff sheets)
// ============================================================

model Tariff {
  id              String   @id @default(cuid())
  name            String                               // "Hilton Dubai Summer 2026 — TO ABC"
  contractId      String
  contract        Contract @relation(fields: [contractId], references: [id])
  tourOperatorId  String?
  markupRuleId    String?
  markupRule      MarkupRule? @relation(fields: [markupRuleId], references: [id])
  currencyId      String
  currency        Currency @relation(fields: [currencyId], references: [id])
  generatedAt     DateTime @default(now())
  generatedById   String
  generatedBy     User     @relation(fields: [generatedById], references: [id])
  fileUrl         String?                              // exported PDF/Excel file URL
  status          String   @default("generated")       // generated, sent, confirmed
  notes           String?

  companyId       String
  company         Company  @relation(fields: [companyId], references: [id])
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}
// ============================================================
// MARKETS (for market-based contracting, e.g. Egypt hotels)
// ============================================================

model Market {
  id              String       @id @default(cuid())
  name            String                                   // "UK Market", "West European Market", etc.
  code            MarketCode   @unique
  description     String?                                  // detailed description of the market

  // --- Selling Countries (which countries belong to this market) ---
  countries       MarketCountry[]

  // --- Relationships ---
  contracts       Contract[]                               // contracts targeted to this market
  tourOperators   TourOperator[]                           // TOs operating in this market
  markupRules     MarkupRule[]

  active          Boolean      @default(true)
  companyId       String
  company         Company      @relation(fields: [companyId], references: [id])
  createdAt       DateTime     @default(now())
  updatedAt       DateTime     @updatedAt
}

model MarketCountry {
  id              String    @id @default(cuid())
  marketId        String
  market          Market    @relation(fields: [marketId], references: [id], onDelete: Cascade)
  countryId       String
  country         Country   @relation(fields: [countryId], references: [id])
  isPrimary       Boolean   @default(false)                // primary selling country in this market

  @@unique([marketId, countryId])
}

// ============================================================
// TOUR OPERATOR ASSIGNMENT (per contract or bulk)
// ============================================================

model TourOperator {
  id              String    @id @default(cuid())
  name            String                                   // "ABC Tours International"
  code            String    @unique                        // "ABC-INT"
  contactPerson   String?
  email           String?
  phone           String?
  countryId       String?
  country         Country?  @relation(fields: [countryId], references: [id])
  marketId        String?                                  // market this TO operates in
  active          Boolean   @default(true)

  // --- Relationships ---
  contractAssignments ContractTourOperator[]
  bulkAssignments     HotelTourOperator[]
  markupRules         MarkupRule[]
  tariffs             Tariff[]
  sellingRates        SellingRate[]

  companyId       String
  company         Company   @relation(fields: [companyId], references: [id])
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
}

// --- Assign TO to a specific contract ---

model ContractTourOperator {
  id              String       @id @default(cuid())
  contractId      String
  contract        Contract     @relation(fields: [contractId], references: [id], onDelete: Cascade)
  tourOperatorId  String
  tourOperator    TourOperator @relation(fields: [tourOperatorId], references: [id])
  assignedAt      DateTime     @default(now())
  assignedById    String
  assignedBy      User         @relation(fields: [assignedById], references: [id])
  notes           String?

  @@unique([contractId, tourOperatorId])
}

// --- Bulk assign hotel to TO (all contracts for that hotel) ---

model HotelTourOperator {
  id              String       @id @default(cuid())
  hotelId         String
  hotel           Hotel        @relation(fields: [hotelId], references: [id], onDelete: Cascade)
  tourOperatorId  String
  tourOperator    TourOperator @relation(fields: [tourOperatorId], references: [id])
  assignedAt      DateTime     @default(now())
  assignedById    String
  assignedBy      User         @relation(fields: [assignedById], references: [id])
  notes           String?

  @@unique([hotelId, tourOperatorId])
}

// ============================================================
// CONTRACT COPY LOG
// Tracks contract duplication with rate adjustments
// ============================================================

model ContractCopyLog {
  id                  String    @id @default(cuid())
  sourceContractId    String                               // original contract
  sourceContract      Contract  @relation("CopyLogSource", fields: [sourceContractId], references: [id])
  targetContractId    String                               // new contract created
  targetContract      Contract  @relation("CopyLogTarget", fields: [targetContractId], references: [id])

  // --- Rate Adjustment ---
  adjustmentMode      CopyAdjustmentMode                   // FREEZE, INCREASE, DECREASE, AVERAGE
  adjustmentPercent   Decimal?                              // % increase or decrease (null for FREEZE/AVERAGE)
  averageSourceIds    String[]  @default([])               // contract IDs used for average calculation

  // --- New Validity ---
  newValidFrom        DateTime  @db.Date
  newValidTo          DateTime  @db.Date
  newSeasonName       String?                              // optional rename for the new season

  // --- Audit ---
  copiedById          String
  copiedBy            User      @relation(fields: [copiedById], references: [id])
  copiedAt            DateTime  @default(now())
  notes               String?
}

enum CopyAdjustmentMode {
  FREEZE             // copy rates exactly as-is
  INCREASE           // increase all rates by X%
  DECREASE           // decrease all rates by X%
  AVERAGE            // average rates from multiple source contracts
}

// ============================================================
// RATE VERIFICATION / TESTING
// Simulates a booking to verify rate loading correctness
// ============================================================

model RateVerification {
  id                  String    @id @default(cuid())
  contractId          String
  contract            Contract  @relation(fields: [contractId], references: [id])

  // --- Query Parameters ---
  checkInDate         DateTime  @db.Date
  checkOutDate        DateTime  @db.Date
  nights              Int

  // --- Results (stored as JSON for flexibility) ---
  results             Json                                 // full result matrix (see RateVerificationResult type)
  // results = {
  //   queryParams: { checkIn, checkOut, nights },
  //   seasonBreakdown: [{ season, dateFrom, dateTo, nights }],
  //   rateMatrix: [
  //     {
  //       roomType: { id, name, code },
  //       mealBasis: { id, name, code },
  //       occupancy: { adults, children, childCategory, childBedding },
  //       perNightRate: Decimal,
  //       totalRate: Decimal,
  //       breakdown: { baseRate, roomSupp, mealSupp, occSupp, childSupp },
  //       offersApplied: [{ offerName, discount, resultingTotal }],
  //       specialMeals: [{ name, date, adultRate, childRate }],
  //       finalTotal: Decimal,
  //       warnings: string[]   // e.g. "Stop sale on 25 Dec", "Release period passed"
  //     }
  //   ]
  // }

  // --- Verification for SPO (optional) ---
  isSpoVerification   Boolean   @default(false)            // true = verifying special offer rates
  specialOfferId      String?                              // specific SPO being verified
  specialOffer        SpecialOffer? @relation(fields: [specialOfferId], references: [id])

  // --- Audit ---
  verifiedById        String
  verifiedBy          User      @relation(fields: [verifiedById], references: [id])
  verifiedAt          DateTime  @default(now())
  notes               String?
}
```

---

## UI Structure

### Sidebar Navigation (Contracting Module)

```
CONTRACTING
├── Hotels
│   ├── Hotel List
│   ├── Destinations
│   └── Amenities
│
├── Contracts
│   ├── All Contracts
│   ├── Draft Contracts
│   ├── Posted Contracts
│   ├── Published Contracts
│   └── Copy Contract
│
├── Tour Operators
│   ├── TO List
│   ├── Contract Assignments
│   └── Bulk Hotel Assignments
│
├── Rates
│   ├── Calculated Rates Grid
│   ├── Rate Verification
│   ├── Rate Comparison
│   └── Rate Audit Log
│
├── Allocation
│   ├── Allotment Calendar
│   └── Release Management
│
├── Special Offers
│   ├── All Offers
│   ├── EBD Offers
│   ├── Long Stay Offers
│   ├── Seasonal Offers
│   └── Special Meals
│
├── Stop Sales
│   ├── Active Stop Sales
│   └── Stop Sale Calendar
│
├── Markup & Tariff
│   ├── Markup Rules
│   ├── Selling Rates
│   └── Tariff Export
│
├── Reports
│   ├── Seasonal Offer Report
│   ├── EBD Conditions Report
│   ├── Rate Sheet Report
│   ├── Allotment Utilization
│   └── Contract Summary
│
└── Configuration
    ├── Settings
    ├── Markets & Selling Countries
    ├── Meal Basis Defaults
    └── Child Policy Defaults
```

### Hotel Form View

```
┌──────────────────────────────────────────────────────────────────┐
│ Breadcrumb: Contracting > Hotels > Hilton Dubai Marina           │
│ [Save] [Discard] [Archive]                                       │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌───────────────┐  Hilton Dubai Marina  ★★★★★                  │
│  │               │  Code: HLT-DXB-001                            │
│  │  [Hotel Image]│  Chain: Hilton Hotels & Resorts               │
│  │               │                                               │
│  └───────────────┘  📍 Dubai, UAE | 📞 +971-4-xxx | 🌐 hilton.c │
│                                                                  │
│  Check-in: 14:00 | Check-out: 12:00 | 450 Rooms | Built: 2015  │
├──────────────────────────────────────────────────────────────────┤
│ [Room Types] [Children Policy] [Meal Basis] [Contracts] [Gallery]│
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│ Room Types Tab:                                                  │
│ ┌──────────┬──────┬────────┬────────┬────────┬─────┬──────────┐ │
│ │ Room Type│ Code │MaxAdult│MaxChild│MaxOccup│ExBed│ Bed Config│ │
│ ├──────────┼──────┼────────┼────────┼────────┼─────┼──────────┤ │
│ │ Standard │ STD  │   2    │   1    │   3    │  ✓  │ 1 King   │ │
│ │ Superior │ SUP  │   2    │   2    │   4    │  ✓  │ 1K+1Sofa │ │
│ │ Deluxe SV│ DLXS │   2    │   1    │   3    │  ✓  │ 1 King   │ │
│ │ Jr Suite │ JSUI │   3    │   2    │   5    │  ✓  │ 1K+1Twin │ │
│ │ Suite    │ SUI  │   3    │   2    │   5    │  ✓  │ 2K       │ │
│ │ [+ Add Room Type]                                            │ │
│ └──────────────────────────────────────────────────────────────┘ │
│                                                                  │
│ Occupancy Table (Standard — STD):                                │
│ ┌──────────┬──────────┬────────┬──────────┬──────────────────┐   │
│ │ Adults   │ Children │ Infants│ Extra Bed│ Description      │   │
│ ├──────────┼──────────┼────────┼──────────┼──────────────────┤   │
│ │ 1        │ 0        │ 0      │ 0        │ Single           │   │
│ │ 2        │ 0        │ 0      │ 0        │ Double ✓ Default │   │
│ │ 2        │ 1        │ 0      │ 0        │ 2Ad + 1Ch Share  │   │
│ │ 2        │ 1        │ 0      │ 1        │ 2Ad + 1Ch ExBed  │   │
│ │ 2        │ 0        │ 1      │ 0        │ 2Ad + 1Inf       │   │
│ │ 1        │ 1        │ 0      │ 0        │ 1Ad + 1Ch Share  │   │
│ │ [+ Add Occupancy]                                          │   │
│ └────────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────┘
```

### Contract Form View

```
┌──────────────────────────────────────────────────────────────────┐
│ Status: [● Draft] ─────── [○ Posted] ─────── [○ Published]        │
│ [Post] [Publish] [Calculate Rates] [Verify Rates] [Copy Contract]│
│ [Assign Tour Operators] [Export Tariff]                           │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Contract: Hilton Dubai Marina — Summer 2026                     │
│  Code: CTR-HLT-DXB-2026-S1                                     │
│                                                                  │
│  ┌─── Details ──────────────┐  ┌─── Configuration ──────────┐   │
│  │ Hotel: [Hilton Dubai   ▾]│  │ Rate Basis: [Per Person ▾] │   │
│  │ Valid From: [01/04/2026] │  │ Currency:   [USD ▾]        │   │
│  │ Valid To:   [31/10/2026] │  │ Min Stay:   [1]            │   │
│  │ Market: [All Markets   ▾]│  │ Max Stay:   [—]            │   │
│  │ Created By: John Smith   │  │ Base Room:  [Standard ▾]   │   │
│  └──────────────────────────┘  │ Base Meal:  [BB ▾]         │   │
│                                └─────────────────────────────┘   │
├──────────────────────────────────────────────────────────────────┤
│ [Seasons] [Base Rates] [Supplements] [Calculated Rates]          │
│ [Special Offers] [Special Meals] [Stop Sales] [Allocation]       │
│ [Markup & Tariff] [Tour Operators] [Notes]                       │
├──────────────────────────────────────────────────────────────────┤

SEASONS TAB:
┌────────────┬──────┬────────────┬────────────┬─────────┬────────┐
│ Season     │ Code │ Date From  │ Date To    │ Release │ MinStay│
├────────────┼──────┼────────────┼────────────┼─────────┼────────┤
│ Low        │ LW   │ 01/04/2026 │ 30/04/2026 │ 14 days │ 1      │
│ Shoulder   │ SH   │ 01/05/2026 │ 31/05/2026 │ 21 days │ 2      │
│ High       │ HI   │ 01/06/2026 │ 31/08/2026 │ 30 days │ 3      │
│ Peak       │ PK   │ 01/09/2026 │ 31/10/2026 │ 45 days │ 3      │
│ [+ Add Season]                                                  │
└─────────────────────────────────────────────────────────────────┘

BASE RATES TAB (Per Person Per Night — Base Room STD, Base Meal BB):
┌────────────┬──────────┬──────────┬──────────┐
│ Season     │ SGL Rate │ DBL Rate │ TPL Rate │
├────────────┼──────────┼──────────┼──────────┤
│ Low        │ $85      │ $65      │ $55      │
│ Shoulder   │ $110     │ $80      │ $70      │
│ High       │ $145     │ $105     │ $90      │
│ Peak       │ $180     │ $130     │ $110     │
└────────────┴──────────┴──────────┴──────────┘

SUPPLEMENTS TAB:
┌─ Room Type Supplements (per person per night on top of base) ───┐
│ ┌───────────┬─────┬──────────┬──────────┬──────────┬──────────┐ │
│ │ Room Type │Type │ Low      │ Shoulder │ High     │ Peak     │ │
│ ├───────────┼─────┼──────────┼──────────┼──────────┼──────────┤ │
│ │ Superior  │ +   │ +$15     │ +$20     │ +$25     │ +$35     │ │
│ │ Deluxe SV │ +   │ +$30     │ +$40     │ +$50     │ +$65     │ │
│ │ Jr Suite  │ +   │ +$55     │ +$70     │ +$90     │ +$120    │ │
│ │ Suite     │ +   │ +$95     │ +$120    │ +$150    │ +$200    │ │
│ └───────────┴─────┴──────────┴──────────┴──────────┴──────────┘ │
│                                                                  │
│ ┌─ Meal Supplements (per person per night on top of BB) ───────┐ │
│ │ ┌───────────┬──────────┬──────────┬──────────┬──────────┐    │ │
│ │ │ Meal      │ Low      │ Shoulder │ High     │ Peak     │    │ │
│ │ ├───────────┼──────────┼──────────┼──────────┼──────────┤    │ │
│ │ │ HB (+)    │ +$15     │ +$18     │ +$22     │ +$28     │    │ │
│ │ │ FB (+)    │ +$25     │ +$30     │ +$38     │ +$48     │    │ │
│ │ │ AI (+)    │ +$45     │ +$55     │ +$65     │ +$85     │    │ │
│ │ │ RO (-)    │ -$10     │ -$12     │ -$15     │ -$18     │    │ │
│ │ └───────────┴──────────┴──────────┴──────────┴──────────┘    │ │
│ └──────────────────────────────────────────────────────────────┘ │
│                                                                  │
│ ┌─ Occupancy Supplements/Reductions (per season) ──────────────┐ │
│ │ ┌─────────────────────┬────────┬────────┬────────┬────────┐  │ │
│ │ │ Occupancy           │ Low    │Shoulder│ High   │ Peak   │  │ │
│ │ ├─────────────────────┼────────┼────────┼────────┼────────┤  │ │
│ │ │ SGL Supplement      │ +$20   │ +$25   │ +$30   │ +$40   │  │ │
│ │ │ 3rd Adult Reduction │ -$10   │ -$12   │ -$15   │ -$18   │  │ │
│ │ │ Child (2-11) Share  │ $25    │ $30    │ $35    │ $40    │  │ │
│ │ │ Child (2-11) ExBed  │ $35    │ $42    │ $50    │ $58    │  │ │
│ │ │ Teen (12-17) Share  │ $40    │ $48    │ $55    │ $65    │  │ │
│ │ │ Teen (12-17) ExBed  │ $50    │ $60    │ $70    │ $82    │  │ │
│ │ │ Infant (0-1)        │ FREE   │ FREE   │ FREE   │ FREE   │  │ │
│ │ └─────────────────────┴────────┴────────┴────────┴────────┘  │ │
│ └──────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────┘
```

### Calculated Rates Grid (Output)

```
┌──────────────────────────────────────────────────────────────────┐
│ Calculated Rates — Hilton Dubai Marina — Summer 2026             │
│ [Recalculate All] [Export Excel] [Export PDF]                    │
│ Filter: Season [All ▾]  Room Type [All ▾]  Meal [All ▾]        │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│ Season: HIGH  |  Rate Basis: Per Person Per Night  |  Currency: USD│
│                                                                  │
│ ┌───────────┬─────┬────────┬────────┬────────┬────────┬────────┐│
│ │           │     │ BB     │ HB     │ FB     │ AI     │ RO     ││
│ │ Room Type │ Occ │ (base) │ (+$22) │ (+$38) │ (+$65) │ (-$15) ││
│ ├───────────┼─────┼────────┼────────┼────────┼────────┼────────┤│
│ │ Standard  │ SGL │ $135   │ $157   │ $173   │ $200   │ $120   ││
│ │ (base)    │ DBL │ $105   │ $127   │ $143   │ $170   │ $90    ││
│ │           │ TPL │ $90    │ $112   │ $128   │ $155   │ $75    ││
│ │           │ 2+1C│ $105+35│ $127+35│ $143+35│ $170+35│ $90+35 ││
│ ├───────────┼─────┼────────┼────────┼────────┼────────┼────────┤│
│ │ Superior  │ SGL │ $160   │ $182   │ $198   │ $225   │ $145   ││
│ │ (+$25)    │ DBL │ $130   │ $152   │ $168   │ $195   │ $115   ││
│ │           │ TPL │ $115   │ $137   │ $153   │ $180   │ $100   ││
│ ├───────────┼─────┼────────┼────────┼────────┼────────┼────────┤│
│ │ Deluxe SV │ SGL │ $185   │ $207   │ $223   │ $250   │ $170   ││
│ │ (+$50)    │ DBL │ $155   │ $177   │ $193   │ $220   │ $140   ││
│ │           │ TPL │ $140   │ $162   │ $178   │ $205   │ $125   ││
│ ├───────────┼─────┼────────┼────────┼────────┼────────┼────────┤│
│ │ Jr Suite  │ SGL │ $225   │ $247   │ $263   │ $290   │ $210   ││
│ │ (+$90)    │ DBL │ $195   │ $217   │ $233   │ $260   │ $180   ││
│ │           │ TPL │ $180   │ $202   │ $218   │ $245   │ $165   ││
│ ├───────────┼─────┼────────┼────────┼────────┼────────┼────────┤│
│ │ Suite     │ SGL │ $285   │ $307   │ $323   │ $350   │ $270   ││
│ │ (+$150)   │ DBL │ $255   │ $277   │ $293   │ $320   │ $240   ││
│ │           │ TPL │ $240   │ $262   │ $278   │ $305   │ $225   ││
│ └───────────┴─────┴────────┴────────┴────────┴────────┴────────┘│
│                                                                  │
│ Child Rates (per child per night, add to room rate):             │
│ ┌─────────────────────┬────────┬────────┬────────┬────────┐     │
│ │ Category            │ BB     │ HB     │ FB     │ AI     │     │
│ ├─────────────────────┼────────┼────────┼────────┼────────┤     │
│ │ Infant (0-1)        │ FREE   │ FREE   │ FREE   │ FREE   │     │
│ │ Child (2-11) Share  │ $35    │ $50    │ $62    │ $82    │     │
│ │ Child (2-11) ExBed  │ $50    │ $65    │ $77    │ $97    │     │
│ │ Teen (12-17) Share  │ $55    │ $70    │ $82    │ $102   │     │
│ │ Teen (12-17) ExBed  │ $70    │ $85    │ $97    │ $117   │     │
│ └─────────────────────┴────────┴────────┴────────┴────────┘     │
└──────────────────────────────────────────────────────────────────┘
```

### Special Offers View

```
┌──────────────────────────────────────────────────────────────────┐
│ Special Offers — Hilton Dubai Marina — Summer 2026               │
│ [+ New Offer]                                                    │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│ ┌─ EBD ──────────────────────────────────────────────────────┐   │
│ │ Early Bird 15% — Book 60+ days before arrival              │   │
│ │ Booking: 01/01/2026 – 28/02/2026 | Stay: 01/04 – 31/10   │   │
│ │ Seasons: Low, Shoulder, High | Min Stay: 3 nights          │   │
│ │ Rooms: All | Meals: All | Combinable: ✓ with Long Stay    │   │
│ └────────────────────────────────────────────────────────────┘   │
│                                                                  │
│ ┌─ Rolling EBD ──────────────────────────────────────────────┐   │
│ │ Early Booking Tiers                                        │   │
│ │ ┌──────────────────────┬──────────┐                        │   │
│ │ │ 90+ days before      │ 20% off  │                        │   │
│ │ │ 60-89 days before    │ 15% off  │                        │   │
│ │ │ 30-59 days before    │ 10% off  │                        │   │
│ │ └──────────────────────┴──────────┘                        │   │
│ │ Stay: 01/06 – 31/08 (High) | Min Stay: 5 nights           │   │
│ └────────────────────────────────────────────────────────────┘   │
│                                                                  │
│ ┌─ Long Stay ────────────────────────────────────────────────┐   │
│ │ Stay 7 Pay 6 / Stay 14 Pay 11 / Stay 21 Pay 16            │   │
│ │ ┌───────────┬───────────┬──────────────┐                   │   │
│ │ │ 7+ nights │ 1 free    │ ~14.3% off   │                   │   │
│ │ │14+ nights │ 3 free    │ ~21.4% off   │                   │   │
│ │ │21+ nights │ 5 free    │ ~23.8% off   │                   │   │
│ │ └───────────┴───────────┴──────────────┘                   │   │
│ │ Seasons: All | Rooms: All | Combinable: ✓ with EBD         │   │
│ └────────────────────────────────────────────────────────────┘   │
│                                                                  │
│ ┌─ Honeymoon ────────────────────────────────────────────────┐   │
│ │ Honeymoon Package — within 6 months of wedding             │   │
│ │ Benefits: Room upgrade (1 category), Cake, Flowers,        │   │
│ │           Bottle of wine, 15% spa discount                 │   │
│ │ Marriage certificate required | Not combinable              │   │
│ └────────────────────────────────────────────────────────────┘   │
│                                                                  │
│ ┌─ Senior Citizen ───────────────────────────────────────────┐   │
│ │ Senior Discount 10% — Age 60+                              │   │
│ │ Seasons: Low, Shoulder | Rooms: All | Min Stay: 7 nights   │   │
│ └────────────────────────────────────────────────────────────┘   │
│                                                                  │
│ ┌─ Marketing Contribution ───────────────────────────────────┐   │
│ │ 5% Marketing Fund — Applied as additional commission       │   │
│ │ All seasons | All room types                               │   │
│ └────────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────┘
```

### Allotment Calendar View

```
┌──────────────────────────────────────────────────────────────────┐
│ Allotment Calendar — Hilton Dubai Marina — June 2026             │
│ Room Type: [All ▾]    Contract: [CTR-HLT-DXB-2026-S1 ▾]        │
├──────────────────────────────────────────────────────────────────┤
│           │ Mon 1│ Tue 2│ Wed 3│ Thu 4│ Fri 5│ Sat 6│ Sun 7│...│
│ ──────────┼──────┼──────┼──────┼──────┼──────┼──────┼──────┤   │
│ Standard  │ 8/10 │ 7/10 │ 9/10 │ 10/10│ 5/10 │ 3/10 │ 4/10 │   │
│ STD       │ 🟢   │ 🟢   │ 🟢   │ 🔴SS │ 🟡   │ 🟡   │ 🟡   │   │
│ ──────────┼──────┼──────┼──────┼──────┼──────┼──────┼──────┤   │
│ Superior  │ 4/5  │ 4/5  │ 5/5  │ 5/5  │ 3/5  │ 2/5  │ 2/5  │   │
│ SUP       │ 🟢   │ 🟢   │ 🔴SS │ 🔴SS │ 🟡   │ 🟡   │ 🟡   │   │
│ ──────────┼──────┼──────┼──────┼──────┼──────┼──────┼──────┤   │
│ Deluxe SV │ 3/3  │ 3/3  │ 3/3  │ 3/3  │ 2/3  │ 1/3  │ 1/3  │   │
│ DLXS      │ 🟢   │ 🟢   │ 🟢   │ 🟢   │ 🟡   │ 🟡   │ 🟡   │   │
│ ──────────┼──────┼──────┼──────┼──────┼──────┼──────┼──────┤   │
│ Jr Suite  │ 2/2  │ 2/2  │ 2/2  │ 1/2  │ 1/2  │ 0/2  │ 0/2  │   │
│ JSUI      │ 🟢   │ 🟢   │ 🟢   │ 🟡   │ 🟡   │ 🔴   │ 🔴   │   │
└──────────────────────────────────────────────────────────────────┘
🟢 = Available (>50%)   🟡 = Low (<50%)   🔴 = Sold out   🔴SS = Stop Sale
Format: Available/Total
```

### Copy Contract Dialog

```
┌──────────────────────────────────────────────────────────────────┐
│ Copy Contract for Next Season                                     │
│                                                                    │
│ Source Contract: CTR-HLT-DXB-2026-S1 (Hilton Dubai Summer 2026)  │
│ Source Validity: 01 Apr 2026 – 31 Oct 2026                       │
│                                                                    │
│ ┌─── New Contract Details ────────────────────────────────────┐   │
│ │ Contract Name:  [Hilton Dubai Marina — Summer 2027      ]   │   │
│ │ Contract Code:  [CTR-HLT-DXB-2027-S1                   ]   │   │
│ │ Valid From:     [01/04/2027]                                │   │
│ │ Valid To:       [31/10/2027]                                │   │
│ └─────────────────────────────────────────────────────────────┘   │
│                                                                    │
│ ┌─── Rate Adjustment ─────────────────────────────────────────┐   │
│ │                                                             │   │
│ │  Mode: (●) Freeze Rates   — copy all rates exactly as-is   │   │
│ │        ( ) Increase by %   [     ]%                         │   │
│ │        ( ) Decrease by %   [     ]%                         │   │
│ │        ( ) Average          — compute average from multiple │   │
│ │                               source contracts              │   │
│ │                                                             │   │
│ │  ┌─ Average Mode (shown when Average is selected) ──────┐  │   │
│ │  │ Select source contracts for averaging:                │  │   │
│ │  │ ☑ CTR-HLT-DXB-2024-S1 (Summer 2024)                 │  │   │
│ │  │ ☑ CTR-HLT-DXB-2025-S1 (Summer 2025)                 │  │   │
│ │  │ ☑ CTR-HLT-DXB-2026-S1 (Summer 2026)  ← current     │  │   │
│ │  │ ☐ CTR-HLT-DXB-2023-S1 (Summer 2023)                 │  │   │
│ │  │                                                       │  │   │
│ │  │ Average = (Sum of rates) / (Number of contracts)      │  │   │
│ │  └───────────────────────────────────────────────────────┘  │   │
│ └─────────────────────────────────────────────────────────────┘   │
│                                                                    │
│ ┌─── What to Copy ────────────────────────────────────────────┐   │
│ │ ☑ Seasons (with adjusted dates)                             │   │
│ │ ☑ Room Types                                                │   │
│ │ ☑ Meal Basis                                                │   │
│ │ ☑ Base Rates (with adjustment applied)                      │   │
│ │ ☑ Supplements (room type, meal, occupancy)                  │   │
│ │ ☑ Special Offers                                            │   │
│ │ ☑ Special Meals                                             │   │
│ │ ☐ Stop Sales                                                │   │
│ │ ☐ Allocation                                                │   │
│ │ ☑ Markup Rules                                              │   │
│ │ ☐ Tour Operator Assignments                                 │   │
│ └─────────────────────────────────────────────────────────────┘   │
│                                                                    │
│ Notes: [_______________________________________________]           │
│                                                                    │
│                            [Cancel]  [Preview Changes]  [Copy]     │
└──────────────────────────────────────────────────────────────────┘

Preview Changes (expanded):
┌──────────────────────────────────────────────────────────────────┐
│ Rate Adjustment Preview — Increase by 5%                          │
│                                                                    │
│ Season: HIGH                                                       │
│ ┌──────────────┬──────────────┬──────────────┬──────────────────┐ │
│ │ Rate Item    │ Original     │ New (5%↑)    │ Difference       │ │
│ ├──────────────┼──────────────┼──────────────┼──────────────────┤ │
│ │ SGL Base BB  │ $145.00      │ $152.25      │ +$7.25           │ │
│ │ DBL Base BB  │ $105.00      │ $110.25      │ +$5.25           │ │
│ │ TPL Base BB  │ $90.00       │ $94.50       │ +$4.50           │ │
│ │ SUP Supp     │ $25.00       │ $26.25       │ +$1.25           │ │
│ │ DLX Supp     │ $50.00       │ $52.50       │ +$2.50           │ │
│ │ HB Meal Supp │ $22.00       │ $23.10       │ +$1.10           │ │
│ │ ...          │ ...          │ ...          │ ...              │ │
│ └──────────────┴──────────────┴──────────────┴──────────────────┘ │
│                                                                    │
│ Average Preview (when Average mode selected):                      │
│ ┌──────────┬──────────┬──────────┬──────────┬──────────────────┐  │
│ │ Rate     │ 2024     │ 2025     │ 2026     │ Average (New)    │  │
│ ├──────────┼──────────┼──────────┼──────────┼──────────────────┤  │
│ │ SGL BB   │ $120.00  │ $135.00  │ $145.00  │ $133.33          │  │
│ │ DBL BB   │ $85.00   │ $95.00   │ $105.00  │ $95.00           │  │
│ │ ...      │ ...      │ ...      │ ...      │ ...              │  │
│ └──────────┴──────────┴──────────┴──────────┴──────────────────┘  │
└──────────────────────────────────────────────────────────────────┘
```

### Tour Operator Assignment Views

```
┌──────────────────────────────────────────────────────────────────┐
│ Tour Operator Assignment — Per Contract                           │
│ Contract: CTR-HLT-DXB-2026-S1 (Hilton Dubai Summer 2026)        │
│ [+ Assign Tour Operator]                                          │
├──────────────────────────────────────────────────────────────────┤
│                                                                    │
│ ┌────────────────┬────────┬─────────────┬───────────┬───────────┐ │
│ │ Tour Operator  │ Code   │ Market      │ Assigned  │ Actions   │ │
│ ├────────────────┼────────┼─────────────┼───────────┼───────────┤ │
│ │ ABC Tours Intl │ ABC-INT│ UK & Europe │ 15 Jan 26 │ [Remove]  │ │
│ │ XYZ Travel     │ XYZ-TR │ Middle East │ 20 Jan 26 │ [Remove]  │ │
│ │ Global Voyages │ GLB-VY │ Asia Pacific│ 22 Jan 26 │ [Remove]  │ │
│ │ Sunway Holidays│ SNW-HL │ CIS Market  │ 01 Feb 26 │ [Remove]  │ │
│ └────────────────┴────────┴─────────────┴───────────┴───────────┘ │
│                                                                    │
│ 4 Tour Operators assigned to this contract                        │
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│ Bulk Hotel → Tour Operator Assignment                             │
│ Assign all contracts of a hotel to selected Tour Operators        │
│                                                                    │
│ ┌─── Select Hotels ───────────────────────────────────────────┐   │
│ │ ☑ Hilton Dubai Marina          (3 active contracts)         │   │
│ │ ☑ Marriott JBR                 (2 active contracts)         │   │
│ │ ☐ Jumeirah Beach Hotel         (1 active contract)          │   │
│ │ ☑ Atlantis The Palm            (4 active contracts)         │   │
│ │ ☐ Kempinski Hotel Mall         (2 active contracts)         │   │
│ │ Filter: [________]  Destination: [All ▾]  Star: [All ▾]    │   │
│ └─────────────────────────────────────────────────────────────┘   │
│                                                                    │
│ ┌─── Select Tour Operators ───────────────────────────────────┐   │
│ │ ☑ ABC Tours International                                   │   │
│ │ ☑ XYZ Travel                                                │   │
│ │ ☐ Global Voyages                                            │   │
│ │ ☑ Sunway Holidays                                           │   │
│ │ Filter: [________]  Market: [All ▾]                         │   │
│ └─────────────────────────────────────────────────────────────┘   │
│                                                                    │
│ Summary: Assigning 3 TOs to 3 hotels (9 contract assignments)    │
│                                                                    │
│                                    [Cancel]  [Preview]  [Assign]  │
└──────────────────────────────────────────────────────────────────┘
```

### Rate Verification / Testing Window

```
┌──────────────────────────────────────────────────────────────────┐
│ Rate Verification — Booking Simulator                             │
│ Contract: CTR-HLT-DXB-2026-S1 | Status: [Draft / Posted / Pub]  │
│ Purpose: Verify rate loading correctness — simulate booking calc  │
├──────────────────────────────────────────────────────────────────┤
│                                                                    │
│ ┌─── Search Parameters ───────────────────────────────────────┐   │
│ │ Check-in:  [15/06/2026]     Check-out: [22/06/2026]        │   │
│ │ Nights:    7 (auto-calculated)                               │   │
│ │                                                              │   │
│ │                              [🔍 Calculate & Verify]         │   │
│ └──────────────────────────────────────────────────────────────┘   │
│                                                                    │
│ Season Breakdown:                                                  │
│ ┌────────────┬──────────────┬──────────────┬────────┐             │
│ │ Season     │ From         │ To           │ Nights │             │
│ ├────────────┼──────────────┼──────────────┼────────┤             │
│ │ HIGH       │ 15/06/2026   │ 22/06/2026   │ 7      │             │
│ └────────────┴──────────────┴──────────────┴────────┘             │
│                                                                    │
│ ══════════════════════════════════════════════════════════════════ │
│ FULL RATE MATRIX — All Room Types × Meal Basis × Occupancy       │
│ ══════════════════════════════════════════════════════════════════ │
│                                                                    │
│ ┌─ STANDARD (STD) — Base Room ──────────────────────────────────┐ │
│ │ ┌─────────┬────────┬────────┬────────┬────────┬────────────┐  │ │
│ │ │ Occupncy│ BB     │ HB     │ FB     │ AI     │ RO         │  │ │
│ │ ├─────────┼────────┼────────┼────────┼────────┼────────────┤  │ │
│ │ │ 1 AD    │$135/n  │$157/n  │$173/n  │$200/n  │$120/n      │  │ │
│ │ │         │$945 tot│$1,099  │$1,211  │$1,400  │$840 tot    │  │ │
│ │ ├─────────┼────────┼────────┼────────┼────────┼────────────┤  │ │
│ │ │ 2 AD    │$105/n  │$127/n  │$143/n  │$170/n  │$90/n       │  │ │
│ │ │         │$735 tot│$889    │$1,001  │$1,190  │$630 tot    │  │ │
│ │ ├─────────┼────────┼────────┼────────┼────────┼────────────┤  │ │
│ │ │ 3 AD    │$90/n   │$112/n  │$128/n  │$155/n  │$75/n       │  │ │
│ │ │         │$630 tot│$784    │$896    │$1,085  │$525 tot    │  │ │
│ │ ├─────────┼────────┼────────┼────────┼────────┼────────────┤  │ │
│ │ │ 2AD+1Ch │$105+35 │$127+50 │$143+62 │$170+82 │$90+35      │  │ │
│ │ │ (2-11)  │per ngt │per ngt │per ngt │per ngt │per ngt     │  │ │
│ │ │ Share   │$980 tot│$1,239  │$1,435  │$1,764  │$875 tot    │  │ │
│ │ ├─────────┼────────┼────────┼────────┼────────┼────────────┤  │ │
│ │ │ 2AD+1Ch │$105+50 │$127+65 │$143+77 │$170+97 │$90+50      │  │ │
│ │ │ (2-11)  │per ngt │per ngt │per ngt │per ngt │per ngt     │  │ │
│ │ │ ExBed   │$1,085  │$1,344  │$1,540  │$1,869  │$980 tot    │  │ │
│ │ ├─────────┼────────┼────────┼────────┼────────┼────────────┤  │ │
│ │ │ 2AD+1Tn │$105+55 │$127+70 │$143+82 │$170+102│$90+55      │  │ │
│ │ │ (12-17) │per ngt │per ngt │per ngt │per ngt │per ngt     │  │ │
│ │ │ Share   │$1,120  │$1,379  │$1,575  │$1,904  │$1,015 tot  │  │ │
│ │ ├─────────┼────────┼────────┼────────┼────────┼────────────┤  │ │
│ │ │ 2AD+Inf │$105+0  │$127+0  │$143+0  │$170+0  │$90+0       │  │ │
│ │ │ (0-1)   │$735 tot│$889    │$1,001  │$1,190  │$630 tot    │  │ │
│ │ └─────────┴────────┴────────┴────────┴────────┴────────────┘  │ │
│ └────────────────────────────────────────────────────────────────┘ │
│                                                                    │
│ ┌─ SUPERIOR (SUP) — +$25 supplement ────────────────────────────┐ │
│ │ ┌─────────┬────────┬────────┬────────┬────────┬────────────┐  │ │
│ │ │ Occupncy│ BB     │ HB     │ FB     │ AI     │ RO         │  │ │
│ │ ├─────────┼────────┼────────┼────────┼────────┼────────────┤  │ │
│ │ │ 1 AD    │$160/n  │$182/n  │$198/n  │$225/n  │$145/n      │  │ │
│ │ │         │$1,120  │$1,274  │$1,386  │$1,575  │$1,015      │  │ │
│ │ │ 2 AD    │$130/n  │$152/n  │$168/n  │$195/n  │$115/n      │  │ │
│ │ │         │$910    │$1,064  │$1,176  │$1,365  │$805        │  │ │
│ │ │ ... (all occupancy variations as above)                    │  │ │
│ │ └─────────┴────────┴────────┴────────┴────────┴────────────┘  │ │
│ └────────────────────────────────────────────────────────────────┘ │
│                                                                    │
│ ┌─ DELUXE SEA VIEW (DLXS) — +$50 supplement ───────────────────┐ │
│ │ ... (same matrix for all occupancy × meal combinations)       │ │
│ └────────────────────────────────────────────────────────────────┘ │
│ ┌─ JR SUITE (JSUI) — +$90 supplement ──────────────────────────┐ │
│ │ ... (same matrix)                                             │ │
│ └────────────────────────────────────────────────────────────────┘ │
│ ┌─ SUITE (SUI) — +$150 supplement ─────────────────────────────┐ │
│ │ ... (same matrix)                                             │ │
│ └────────────────────────────────────────────────────────────────┘ │
│                                                                    │
│ ┌─ SPECIAL MEALS (if applicable in date range) ─────────────────┐ │
│ │ No special meals applicable for 15-22 Jun 2026                │ │
│ └────────────────────────────────────────────────────────────────┘ │
│                                                                    │
│ ┌─ WARNINGS ────────────────────────────────────────────────────┐ │
│ │ ⚠ No warnings — all rates loaded correctly                    │ │
│ │ (or)                                                           │ │
│ │ ⚠ Missing rate: JR Suite × AI × 3 Adults — no occupancy suppl│ │
│ │ ⚠ Stop Sale active: 18 Jun – 20 Jun for Standard room type   │ │
│ │ ⚠ Release period passed for Peak season allocation             │ │
│ └────────────────────────────────────────────────────────────────┘ │
│                                                                    │
│ [Export Verification Report]  [Save Verification]  [Close]        │
└──────────────────────────────────────────────────────────────────┘
```

### SPO Rate Verification Window

```
┌──────────────────────────────────────────────────────────────────┐
│ Special Offer Rate Verification — Booking Simulator               │
│ Contract: CTR-HLT-DXB-2026-S1 | Offer: [Select Offer ▾]        │
│ Purpose: Verify how special offer affects final rates             │
├──────────────────────────────────────────────────────────────────┤
│                                                                    │
│ ┌─── Search Parameters ───────────────────────────────────────┐   │
│ │ Offer:     [Early Bird 15% ▾]                                │   │
│ │ Booking Date: [15/01/2026]  (to check EBD lead time)        │   │
│ │ Check-in:  [15/06/2026]     Check-out: [22/06/2026]        │   │
│ │ Nights:    7 (auto-calculated)                               │   │
│ │ Guest Age: [__] (for senior citizen offers)                  │   │
│ │ Honeymoon: [☐] Wedding date: [__/__/____]                   │   │
│ │                                                              │   │
│ │                              [🔍 Calculate with Offer]       │   │
│ └──────────────────────────────────────────────────────────────┘   │
│                                                                    │
│ Offer Eligibility Check:                                           │
│ ┌──────────────────────────────────────────────────────────────┐   │
│ │ ✅ EBD 15%: Eligible — booking 151 days before (min 60)      │   │
│ │ ✅ Stay dates within offer period (01 Apr – 31 Oct)          │   │
│ │ ✅ Min stay 3 nights — booking 7 nights ✓                    │   │
│ │ ✅ Combinable with: Long Stay                                │   │
│ │ ❌ Rolling EBD: Not eligible — conflicts with flat EBD       │   │
│ └──────────────────────────────────────────────────────────────┘   │
│                                                                    │
│ ══════════════════════════════════════════════════════════════════ │
│ RATE COMPARISON — Base Rate vs. With Offer Applied                │
│ ══════════════════════════════════════════════════════════════════ │
│                                                                    │
│ ┌─ STANDARD (STD) ──────────────────────────────────────────────┐ │
│ │ ┌─────────┬──────────────┬──────────────┬─────────┬────────┐  │ │
│ │ │ Occ/Meal│ Base Total   │ After EBD 15%│ Saving  │ Per Ngt│  │ │
│ │ ├─────────┼──────────────┼──────────────┼─────────┼────────┤  │ │
│ │ │ 1AD BB  │ $945.00      │ $803.25      │ -$141.75│$114.75 │  │ │
│ │ │ 1AD HB  │ $1,099.00    │ $934.15      │ -$164.85│$133.45 │  │ │
│ │ │ 1AD FB  │ $1,211.00    │ $1,029.35    │ -$181.65│$147.05 │  │ │
│ │ │ 1AD AI  │ $1,400.00    │ $1,190.00    │ -$210.00│$170.00 │  │ │
│ │ │ 2AD BB  │ $735.00      │ $624.75      │ -$110.25│$89.25  │  │ │
│ │ │ 2AD HB  │ $889.00      │ $755.65      │ -$133.35│$107.95 │  │ │
│ │ │ ... (all occupancy × meal variations)                      │  │ │
│ │ └─────────┴──────────────┴──────────────┴─────────┴────────┘  │ │
│ └────────────────────────────────────────────────────────────────┘ │
│                                                                    │
│ ┌─ SUPERIOR (SUP) ──────────────────────────────────────────────┐ │
│ │ ... (same comparison matrix)                                  │ │
│ └────────────────────────────────────────────────────────────────┘ │
│ (... all room types ...)                                           │
│                                                                    │
│ ┌─ COMBINED OFFERS (if applicable) ─────────────────────────────┐ │
│ │ EBD 15% + Long Stay (7 pay 6):                                │ │
│ │ ┌─────────┬──────────┬──────────┬──────────┬─────────────────┐ │ │
│ │ │ Occ/Meal│ Base 7nts│ After EBD│After Long│ Combined Saving │ │ │
│ │ ├─────────┼──────────┼──────────┼──────────┼─────────────────┤ │ │
│ │ │ 2AD BB  │ $735.00  │ $624.75  │ $535.50  │ -$199.50 (27%) │ │ │
│ │ │ 2AD HB  │ $889.00  │ $755.65  │ $647.70  │ -$241.30 (27%) │ │ │
│ │ │ ...                                                        │ │ │
│ │ └─────────┴──────────┴──────────┴──────────┴─────────────────┘ │ │
│ └────────────────────────────────────────────────────────────────┘ │
│                                                                    │
│ [Export SPO Verification]  [Save Verification]  [Close]           │
└──────────────────────────────────────────────────────────────────┘
```

---

## Business Logic & Workflows

### Contract Lifecycle

```
DRAFT ──────[Post]──────→ POSTED ──────[Publish]──────→ PUBLISHED
  │                          │                              │
  │  ┌──[Reset to Draft]─────┘                              │
  │  │                                                      │
  │  └──[Reset to Draft]────────────────────────────────────┘
  │
  └──[Delete] (only in Draft)
  └──[Copy Contract] (available in ANY status)

Notes:
- DRAFT:     Fully editable. Rates can be calculated, verified, and tested.
- POSTED:    Locked for content. Internal review. Rates are confirmed.
             Can be reset to Draft for corrections.
- PUBLISHED: Live & visible to assigned Tour Operators. Available in booking engine.
             Can be reset to Draft for corrections (with audit log).
- Copy Contract is available regardless of status (Draft, Posted, Published).
- Rate Verification (testing window) is available in ALL statuses.
```

### Market-Based Contracting

Some destinations (notably Egypt) use market-based pricing, where the same hotel has **different contracts with different rates for different source markets**. This is a common pattern in the travel industry.

**How it works:**

```
HOTEL: Grand Resort Hurghada ★★★★★

CONTRACT 1: "Grand Resort — UK Market — Summer 2026"
  Market: UK (selling to UK tour operators)
  Currency: GBP
  Rates: UK-specific pricing (typically higher)

CONTRACT 2: "Grand Resort — CIS Market — Summer 2026"
  Market: CIS (selling to Russian/CIS tour operators)
  Currency: USD
  Rates: CIS-specific pricing (typically competitive)

CONTRACT 3: "Grand Resort — MENA Market — Summer 2026"
  Market: MENA (selling to Middle East tour operators)
  Currency: USD
  Rates: MENA-specific pricing

CONTRACT 4: "Grand Resort — Generic — Summer 2026"
  Market: null (default for any market without a specific contract)
  Currency: USD
  Rates: Standard pricing
```

**Markets and their selling countries:**

| Market Code | Market Name | Selling Countries |
|-------------|------------|-------------------|
| `UK` | UK Market | United Kingdom, Ireland |
| `WEST_EUROPE` | West European Market | France, Germany, Italy, Spain, Netherlands, Belgium, Austria, Switzerland, Portugal, Scandinavia |
| `EAST_EUROPE` | East European Market | Poland, Czech Republic, Hungary, Romania, Bulgaria, Serbia, Croatia, Slovakia, Slovenia |
| `RUSSIAN` | Russian Market | Russia |
| `CIS` | CIS Market | Ukraine, Kazakhstan, Uzbekistan, Belarus, Azerbaijan, Georgia, Armenia, Tajikistan, Kyrgyzstan, Moldova, Turkmenistan |
| `FAR_EAST` | Far East Market | China, Japan, South Korea, India, Thailand, Malaysia, Singapore, Indonesia, Philippines, Australia, New Zealand |
| `MENA` | MENA Market | UAE, Saudi Arabia, Egypt, Morocco, Tunisia, Jordan, Lebanon, Oman, Bahrain, Kuwait, Qatar |
| `LATIN_AMERICA` | Latin American Market | Brazil, Mexico, Argentina, Colombia, Chile, Peru |
| `NORTH_AMERICA` | North American Market | USA, Canada |

**Business rules:**
- A hotel can have multiple contracts for the same period — one per market
- When searching for rates, the system first tries to find a market-specific contract, then falls back to a generic (null market) contract
- Tour operators are assigned to a market; they can only see/access contracts for their market
- Markup rules can be market-specific
- Tariff exports filter by market
- The contract list view can be filtered by market

### Rate Calculation Engine

The engine computes all rates from base rates + supplements. Run when user clicks **"Calculate Rates"**.

**Algorithm (Per Person basis):**

```
FOR each season IN contract.seasons:
  FOR each roomType IN contract.roomTypes:
    FOR each mealBasis IN contract.mealBasis:
      FOR each occupancy IN roomType.occupancyTable:

        1. START with base rate for this season:
           baseRate = contractBaseRate[season]
           - If SGL: use singleRate
           - If DBL: use doubleRate (per person)
           - If TPL: use tripleRate (per person)

        2. ADD room type supplement (if not base room):
           roomSupplement = supplement[ROOM_TYPE, roomType, season].value
           rate = baseRate + roomSupplement

        3. ADD/SUBTRACT meal supplement (if not base meal):
           mealSupplement = supplement[MEAL, mealBasis, season].value
           rate = rate + mealSupplement  (or - if reduction like RO)

        4. ADD/SUBTRACT occupancy supplement:
           IF occupancy.adults == 1:
             rate = rate + supplement[OCCUPANCY, SGL, season].value
           IF occupancy.adults == 3:
             rate = rate - supplement[OCCUPANCY, 3RD_ADULT, season].value

        5. COMPUTE child rates:
           FOR each childCategory applicable:
             childRate = supplement[CHILD, category, bedding, season].value
             IF childPolicy[category].freeInSharing AND bedding == SHARING:
               childRate = 0
             ADD meal supplement for child if applicable

        6. STORE in CalculatedRate:
           netRate = rate (for adults)
           + breakdown: baseRate, roomSupplement, mealSupplement, occupancySupplement

      END FOR
    END FOR
  END FOR
END FOR
```

**Algorithm (Per Room basis):**

```
Similar but:
- Base rate is per room (not per person)
- Room supplement is per room
- Meal supplements are still per person (added on top)
- Occupancy supplements apply to the room rate
- Child supplements are per child per night
```

### Special Offer Application

When computing a booking price, offers are applied AFTER the base calculated rate:

```
1. Get calculated net rate for: roomType × mealBasis × occupancy × season × dates
2. Calculate total: netRate × numberOfNights
3. Apply eligible offers in priority order:
   a. Check offer conditions (booking date, stay dates, min stay, min lead days, age, etc.)
   b. If EBD: total = total × (1 - discountPercent/100)
   c. If Rolling EBD: find applicable tier by leadDays, apply tier's discount
   d. If Long Stay: find applicable tier by numberOfNights
      - If free nights: total = rate × payNights (instead of stayNights)
      - If percentage: total = total × (1 - discountPercent/100)
   e. If Honeymoon: apply upgrade + complimentary extras
   f. If Senior: total = total × (1 - discountPercent/100)
   g. If Marketing Contribution: reduce net by contribution %
4. Check combinability rules before stacking discounts
5. Add special meal supplements for applicable dates (NYE, Christmas)
6. Check stop sales — reject if date/room/meal is stopped
```

### Stop Sale Check

```
FOR each date in booking date range:
  IF StopSale exists WHERE:
    hotelId = booking.hotelId
    AND dateFrom <= date <= dateTo
    AND active = true
    AND (scope = ALL
         OR (scope = ROOM_TYPE AND roomType in stopSale.roomTypes)
         OR (scope = MEAL_BASIS AND meal in stopSale.mealBasis))
  THEN:
    REJECT booking for this date
```

### Allotment Management

```
ON booking request:
  1. Check allocation for each date in stay:
     - If FREESALE: always available (no deduction)
     - If ALLOCATION/COMMITMENT: check availableRooms > 0
     - If ON_REQUEST: mark as pending, send request to hotel
  2. On confirmed booking:
     - Increment bookedRooms
     - Decrement availableRooms
  3. Release check (daily cron):
     - FOR each allocation WHERE date - today <= releaseDays AND isReleased = false:
       - Set isReleased = true
       - Set availableRooms = 0 (or reduce to freesale)
```

### Markup Calculation

```
FOR each calculatedRate:
  1. Find applicable MarkupRule (match by contract, hotel, destination, TO, market)
  2. Apply by priority (highest first if multiple rules):
     - PERCENTAGE: sellingRate = netRate × (1 + markupValue/100)
     - FIXED_PER_NIGHT: sellingRate = netRate + markupValue
     - FIXED_PER_BOOKING: sellingRate = netRate + (markupValue / numberOfNights)
  3. Store in SellingRate with breakdown
```

### Contract Copy Logic

```
ON Copy Contract:
  INPUT: sourceContractId, newValidFrom, newValidTo, adjustmentMode, adjustmentPercent?, averageSourceIds?

  1. VALIDATE:
     - Source contract exists
     - New validity dates are valid (from < to)
     - If AVERAGE: averageSourceIds are valid contracts for same hotel

  2. CREATE new Contract (status = DRAFT):
     - Copy all fields from source
     - Override: name, code, validFrom, validTo, status = DRAFT
     - Set copiedFromId = sourceContractId

  3. COPY Seasons (with date shift):
     - Calculate dateOffset = newValidFrom - sourceContract.validFrom
     - FOR each season in source:
       newSeason.dateFrom = season.dateFrom + dateOffset
       newSeason.dateTo = season.dateTo + dateOffset
       (Adjust proportionally if new contract duration differs)

  4. COPY Room Types & Meal Basis (link same hotel room types/meals)

  5. COPY & ADJUST Base Rates:
     IF adjustmentMode == FREEZE:
       newRate = sourceRate (copy as-is)
     IF adjustmentMode == INCREASE:
       newRate = sourceRate × (1 + adjustmentPercent / 100)
     IF adjustmentMode == DECREASE:
       newRate = sourceRate × (1 - adjustmentPercent / 100)
     IF adjustmentMode == AVERAGE:
       FOR each rate position (season × occupancy):
         rates = GET same rate position from each contract in averageSourceIds
         newRate = SUM(rates) / COUNT(rates)

  6. COPY & ADJUST Supplements:
     - Same adjustment logic applied to all supplement values
     - Room type supplements, meal supplements, occupancy supplements

  7. COPY Special Offers (if selected):
     - Shift booking/stay dates by same offset
     - Keep discount percentages and conditions unchanged

  8. COPY Special Meals (if selected):
     - Shift dates by offset
     - Adjust prices by same adjustment mode

  9. LOG in ContractCopyLog:
     - Record source, target, mode, percent, averageSourceIds

  10. RETURN new contract ID (open in editor)
```

### Tour Operator Assignment Logic

```
PER-CONTRACT ASSIGNMENT:
  1. User selects TO from dropdown on contract form
  2. Creates ContractTourOperator record
  3. When contract is PUBLISHED, TO can view:
     - Rate sheets / tariffs
     - Availability (if allocation is shared)
  4. TO assignment controls who receives tariff exports

BULK HOTEL ASSIGNMENT:
  1. User selects multiple hotels + multiple TOs
  2. System creates HotelTourOperator records for each combination
  3. HotelTourOperator implies TO has access to ALL contracts for that hotel
  4. When a new contract is created for the hotel, TOs are auto-suggested
  5. Bulk assignment also creates ContractTourOperator for all existing
     PUBLISHED contracts of the selected hotels

CASCADING LOGIC:
  - HotelTourOperator → auto-creates ContractTourOperator for all hotel's published contracts
  - On new contract publish → check HotelTourOperator → auto-assign TOs
  - Removing HotelTourOperator → prompt: "Remove from existing contracts too?"
```

### Rate Verification Logic

```
ON Rate Verification:
  INPUT: contractId, checkInDate, checkOutDate

  1. RESOLVE seasons for date range:
     - Map each night to its season
     - Handle multi-season stays (split calculation per season)

  2. FOR each roomType IN contract.roomTypes:
    FOR each mealBasis IN contract.mealBasis:
      FOR each occupancy IN roomType.occupancyTable:

        FOR each night in stay:
          a. Get season for this night
          b. Lookup CalculatedRate for (roomType, mealBasis, occupancy, season)
          c. If rate NOT FOUND → add WARNING "Missing rate"
          d. Accumulate nightly rate → totalRate

        3. CHECK Stop Sales:
           - If any night falls in stop sale → add WARNING

        4. CHECK Allotment:
           - If allocation basis != FREESALE, check availability
           - If release period passed → add WARNING

        5. CHECK Special Meals:
           - If any date matches gala meal → add supplement and note

        6. STORE in result matrix:
           { roomType, mealBasis, occupancy, perNightRate, totalRate, breakdown, warnings }

  3. RETURN full matrix organized by: roomType → mealBasis → occupancy

ON SPO Rate Verification:
  Same as above PLUS:
  1. User selects specific offer or "all eligible offers"
  2. After base rate calculation, apply offer logic:
     - Check eligibility (booking date, stay dates, min stay, lead days, age, etc.)
     - Calculate discounted rate
     - If combinable offers exist, show stacked result
  3. Show side-by-side: Base Total vs. After Offer vs. Savings
  4. Show eligibility checklist with ✅/❌ for each condition
```

---

## Rate Calculation Engine

### Input Requirements

Before running calculation, the contract must have:
1. At least one season defined
2. Base rates entered for all seasons
3. At least one room type selected (with base room type designated)
4. At least one meal basis selected (with base meal designated)
5. Room type supplements entered for non-base room types
6. Meal supplements entered for non-base meal basis
7. Occupancy supplements entered

### Calculation Trigger

- **Manual:** "Calculate Rates" button on contract form
- **Auto:** On base rate or supplement save (optional setting)
- **Bulk:** "Recalculate All" from the Rates Grid view

### Output

- Populates `CalculatedRate` table
- One row per unique combination: contract × season × roomType × mealBasis × adults × children × childCategory × childBedding
- Existing calculated rates are cleared and regenerated (unless manually overridden)
- Manual overrides are preserved unless user explicitly chooses "Recalculate including overrides"

---

## Special Offers Engine

### Offer Types Detail

| Offer Type | Key Fields | Logic |
|-----------|-----------|-------|
| **EBD** | `minimumLeadDays`, `value` (%) | Book ≥ X days before → Y% off. Booking window required. |
| **Rolling EBD** | `rollingEbdTiers[]` (days ranges + discounts) | Sliding scale: 90+ days = 20%, 60-89 = 15%, 30-59 = 10% |
| **Senior Citizen** | `minimumAge`, `value` (%) | Guest age ≥ X → Y% off. Usually lower seasons only. |
| **Honeymoon** | `requireMarriageCert`, `maxMonthsSinceWedding`, `honeymoonExtras` | Free upgrade, complimentary extras. Marriage proof required. |
| **Long Stay** | `longStayTiers[]` (min nights + discount/free nights) | Stay ≥ X nights → Y% off or Z free nights. Tiered. |
| **Free Nights** | `stayNights`, `payNights`, `freeNightPosition` | Stay X pay Y. Free night = cheapest or last night. |
| **Marketing Contribution** | `contributionType`, `contributionValue` | Hotel gives X% commission/fund. Applied as net reduction. |

### Combinability Rules

- Each offer has `combinableWithOther` flag
- If true, `combinableOfferIds` lists specific offers it can stack with
- When multiple offers apply, they're applied in `priority` order
- Non-combinable offers: only the best-value offer applies
- Combinable offers: applied sequentially (discount on discount)

---

## Markup & Tariff Module

### Markup Rule Hierarchy (evaluated in order)

1. **Contract + Tour Operator specific** (most specific)
2. **Contract + Market specific**
3. **Contract-level default**
4. **Hotel-level default**
5. **Destination-level default**
6. **Global default** (least specific)

### Tariff Generation

1. Select contract
2. Select target tour operator (or "generic")
3. Select markup rule to apply
4. Select output currency (auto-convert if different from contract currency)
5. System generates rate sheet:
   - Cover page: hotel info, contract validity, terms
   - Rate tables: per season, per room type × meal basis × occupancy
   - Child rates table
   - Special offers summary with conditions
   - Special meals (gala dinners)
   - Stop sale dates
   - Allotment summary
6. Export as PDF or Excel

---

## API Routes

```
/api/contracting/
│
├── hotels/                          GET, POST
│   ├── [id]/                        GET, PUT, DELETE
│   ├── [id]/room-types/             GET, POST
│   │   ├── [rtId]/                  GET, PUT, DELETE
│   │   └── [rtId]/occupancy/        GET, POST, PUT, DELETE
│   ├── [id]/children-policy/        GET, POST, PUT, DELETE
│   ├── [id]/meal-basis/             GET, POST, PUT, DELETE
│   ├── [id]/amenities/              GET, PUT (link/unlink)
│   └── [id]/images/                 GET, POST, DELETE
│
├── destinations/                    GET, POST
│   └── [id]/                        GET, PUT, DELETE
│
├── amenities/                       GET, POST
│   └── [id]/                        GET, PUT, DELETE
│
├── contracts/                       GET (list with filters: hotel, status, date range)
│   ├── POST                         Create new contract
│   ├── [id]/                        GET, PUT, DELETE
│   ├── [id]/post                    POST → draft → posted
│   ├── [id]/publish                 POST → posted → published
│   ├── [id]/reset-to-draft          POST → posted/published → draft (with audit log)
│   ├── [id]/copy                    POST → copy contract for next season
│   │   body: { newName, newCode, newValidFrom, newValidTo,
│   │           adjustmentMode, adjustmentPercent?, averageSourceIds?,
│   │           copyOptions: { seasons, roomTypes, mealBasis, baseRates,
│   │                          supplements, specialOffers, specialMeals,
│   │                          stopSales, allocation, markupRules, toAssignments } }
│   │
│   ├── [id]/tour-operators/         GET, POST (assign TO to contract)
│   │   └── [toId]/                  DELETE (remove TO from contract)
│   │
│   ├── [id]/verify-rates            POST → rate verification / testing
│   │   body: { checkInDate, checkOutDate }
│   │   returns: full rate matrix with all room × meal × occupancy combinations
│   │
│   ├── [id]/verify-spo-rates        POST → SPO rate verification
│   │   body: { checkInDate, checkOutDate, specialOfferId?, bookingDate?,
│   │           guestAge?, isHoneymoon?, weddingDate? }
│   │   returns: base vs. offer rate comparison matrix
│   │
│   ├── [id]/seasons/                GET, POST
│   │   └── [seasonId]/              GET, PUT, DELETE
│   │
│   ├── [id]/room-types/             GET, POST, DELETE (link/unlink room types to contract)
│   ├── [id]/meal-basis/             GET, POST, DELETE (link/unlink meal basis)
│   │
│   ├── [id]/base-rates/             GET, POST, PUT (bulk update per season)
│   │
│   ├── [id]/supplements/            GET, POST
│   │   ├── room-type/               GET, PUT (bulk: all room type supplements)
│   │   ├── meal/                    GET, PUT (bulk: all meal supplements)
│   │   ├── occupancy/               GET, PUT (bulk: all occupancy supplements)
│   │   └── [suppId]/                GET, PUT, DELETE
│   │
│   ├── [id]/calculate-rates         POST → run rate calculation engine
│   ├── [id]/calculated-rates/       GET (the output matrix, filterable)
│   │   └── [rateId]/override        PUT (manual override a specific rate)
│   │
│   ├── [id]/special-offers/         GET, POST
│   │   ├── [offerId]/               GET, PUT, DELETE
│   │   ├── [offerId]/rolling-tiers/ GET, POST, PUT, DELETE
│   │   └── [offerId]/long-stay-tiers/ GET, POST, PUT, DELETE
│   │
│   ├── [id]/special-meals/          GET, POST
│   │   └── [mealId]/               GET, PUT, DELETE
│   │
│   ├── [id]/stop-sales/             GET, POST
│   │   └── [ssId]/                  GET, PUT, DELETE
│   │
│   └── [id]/allocation/             GET, POST, PUT (bulk date range)
│       └── calendar                 GET (?month, ?roomType — calendar view data)
│
├── allocation/
│   ├── calendar                     GET (?hotel, ?month — cross-contract calendar)
│   └── release-check                POST → run release period check (cron-triggered)
│
├── stop-sales/                      GET (global: all active stop sales across hotels)
│   └── calendar                     GET (?hotel, ?month — stop sale calendar)
│
├── markup/
│   ├── rules/                       GET, POST
│   │   └── [id]/                    GET, PUT, DELETE
│   ├── calculate                    POST (body: {contractId, markupRuleId, tourOperatorId})
│   └── selling-rates/               GET (filtered by contract, TO, market)
│
├── tariff/
│   ├── generate                     POST (body: {contractId, markupRuleId, tourOperatorId, currencyId})
│   ├── list                         GET (all generated tariffs)
│   ├── [id]/                        GET
│   ├── [id]/download                GET → PDF/Excel file
│   └── [id]/send                    POST → email tariff to TO
│
├── tour-operators/                  GET, POST
│   ├── [id]/                        GET, PUT, DELETE
│   ├── [id]/contracts/              GET (all contracts assigned to this TO)
│   └── [id]/hotels/                 GET (all hotels assigned to this TO)
│
├── hotel-tour-operators/            GET (all hotel-TO bulk assignments)
│   ├── assign                       POST (body: { hotelIds[], tourOperatorIds[] } — bulk assign)
│   ├── [id]/                        DELETE (remove bulk assignment)
│   └── hotel/[hotelId]/             GET (all TOs for a hotel)
│
├── markets/                         GET, POST
│   ├── [id]/                        GET, PUT, DELETE
│   └── [id]/countries/              GET, POST, DELETE (manage selling countries)
│
├── contract-copy-log/               GET (all copy logs, filterable)
│   └── [id]/                        GET (specific copy log detail)
│
├── rate-verification/               GET (all verification records)
│   └── [id]/                        GET (specific verification result)
│
└── reports/
    ├── seasonal-offers              GET (?contractId, ?seasonId — offers summary per season)
    ├── ebd-conditions               GET (?seasonId — cross-contract EBD comparison)
    ├── rate-sheet                    GET (?contractId — full rate sheet)
    ├── allotment-utilization         GET (?hotelId, ?dateFrom, ?dateTo — utilization %)
    └── contract-summary             GET (?hotelId — all contracts summary for a hotel)
```

---

## File Structure

```
src/
├── app/(dashboard)/contracting/
│   ├── page.tsx                                    # Contracting dashboard
│   ├── layout.tsx                                  # Module sidebar layout
│   │
│   ├── hotels/
│   │   ├── page.tsx                                # Hotel list
│   │   ├── new/page.tsx                            # Create hotel
│   │   └── [id]/
│   │       ├── page.tsx                            # Hotel form (tabs: rooms, policy, meals)
│   │       ├── room-types/
│   │       │   └── [rtId]/page.tsx                 # Room type detail + occupancy table
│   │       └── contracts/page.tsx                  # Hotel's contracts list
│   │
│   ├── destinations/
│   │   └── page.tsx                                # Destination management
│   │
│   ├── contracts/
│   │   ├── page.tsx                                # Contract list (filterable)
│   │   ├── new/page.tsx                            # Create contract wizard
│   │   └── [id]/
│   │       ├── page.tsx                            # Contract form (all tabs)
│   │       ├── seasons/page.tsx                    # Season management
│   │       ├── base-rates/page.tsx                 # Base rate entry grid
│   │       ├── supplements/page.tsx                # Supplement entry (room, meal, occupancy)
│   │       ├── calculated-rates/page.tsx           # Calculated rates grid (output)
│   │       ├── special-offers/
│   │       │   ├── page.tsx                        # Offers list
│   │       │   ├── new/page.tsx                    # Create offer wizard
│   │       │   └── [offerId]/page.tsx              # Offer detail/edit
│   │       ├── special-meals/page.tsx              # Gala meals management
│   │       ├── stop-sales/page.tsx                 # Stop sales for this contract
│   │       ├── allocation/page.tsx                 # Allotment calendar for this contract
│   │       ├── markup/page.tsx                     # Markup & tariff for this contract
│   │       ├── tour-operators/page.tsx             # TO assignment for this contract
│   │       ├── copy/page.tsx                       # Copy contract dialog/wizard
│   │       ├── verify-rates/page.tsx               # Rate verification testing window
│   │       └── verify-spo/page.tsx                 # SPO rate verification window
│   │
│   ├── tour-operators/
│   │   ├── page.tsx                                # TO list
│   │   ├── new/page.tsx                            # Create TO
│   │   ├── [id]/page.tsx                           # TO detail + assigned contracts/hotels
│   │   ├── contract-assignments/page.tsx           # All contract → TO assignments
│   │   └── bulk-assign/page.tsx                    # Bulk hotel → TO assignment wizard
│   │
│   ├── rates/
│   │   ├── page.tsx                                # Cross-contract rate grid
│   │   ├── verification/page.tsx                   # Rate verification (contract-agnostic entry)
│   │   └── comparison/page.tsx                     # Rate comparison tool
│   │
│   ├── allocation/
│   │   ├── page.tsx                                # Allotment calendar (cross-hotel)
│   │   └── release/page.tsx                        # Release management
│   │
│   ├── special-offers/
│   │   └── page.tsx                                # All offers across contracts
│   │
│   ├── stop-sales/
│   │   ├── page.tsx                                # All active stop sales
│   │   └── calendar/page.tsx                       # Stop sale calendar view
│   │
│   ├── markup/
│   │   ├── rules/
│   │   │   ├── page.tsx                            # Markup rules list
│   │   │   └── [id]/page.tsx                       # Markup rule form
│   │   ├── selling-rates/page.tsx                  # Selling rates view
│   │   └── tariff/
│   │       ├── page.tsx                            # Tariff list
│   │       ├── generate/page.tsx                   # Generate tariff wizard
│   │       └── [id]/page.tsx                       # Tariff detail + download
│   │
│   ├── reports/
│   │   ├── seasonal-offers/page.tsx                # Seasonal offer report
│   │   ├── ebd-conditions/page.tsx                 # EBD condition cross-contract report
│   │   ├── rate-sheet/page.tsx                     # Rate sheet report
│   │   ├── allotment-utilization/page.tsx          # Allotment utilization report
│   │   └── contract-summary/page.tsx               # Contract summary report
│   │
│   └── configuration/
│       ├── settings/page.tsx                       # Module settings
│       └── markets/page.tsx                        # Market definitions
│
├── components/contracting/
│   ├── HotelForm.tsx                               # Hotel master form with tabs
│   ├── RoomTypeTable.tsx                           # Editable room type list
│   ├── OccupancyTable.tsx                          # Occupancy configuration grid
│   ├── ChildPolicyForm.tsx                         # Children policy editor
│   ├── MealBasisSelector.tsx                       # Meal basis picker
│   ├── ContractForm.tsx                            # Full contract form with all tabs
│   ├── SeasonEditor.tsx                            # Season date range editor
│   ├── BaseRateGrid.tsx                            # Base rate entry grid (season × rate)
│   ├── SupplementGrid.tsx                          # Supplement entry grid (season × type)
│   ├── RoomTypeSupplementGrid.tsx                  # Room type supplement matrix
│   ├── MealSupplementGrid.tsx                      # Meal supplement matrix
│   ├── OccupancySupplementGrid.tsx                 # Occupancy supplement matrix
│   ├── CalculatedRatesGrid.tsx                     # Output rate matrix (read + override)
│   ├── SpecialOfferForm.tsx                        # Offer creation form
│   ├── RollingEbdTierEditor.tsx                    # Rolling EBD tiers table
│   ├── LongStayTierEditor.tsx                      # Long stay tiers table
│   ├── SpecialMealForm.tsx                         # Gala meal form
│   ├── StopSaleForm.tsx                            # Stop sale creation
│   ├── StopSaleCalendar.tsx                        # Calendar view of stop sales
│   ├── AllotmentCalendar.tsx                       # Room allotment calendar grid
│   ├── MarkupRuleForm.tsx                          # Markup rule editor
│   ├── TariffPreview.tsx                           # Tariff preview before export
│   ├── TariffExporter.tsx                          # PDF/Excel export component
│   ├── SeasonalOfferReport.tsx                     # Seasonal offer report table
│   ├── EbdConditionReport.tsx                      # Cross-contract EBD comparison
│   ├── RateComparisonTable.tsx                     # Side-by-side rate comparison
│   ├── ContractCopyDialog.tsx                      # Copy contract wizard/dialog
│   ├── CopyPreviewTable.tsx                        # Rate adjustment preview (freeze/increase/decrease/average)
│   ├── TourOperatorAssignment.tsx                  # Per-contract TO assignment
│   ├── BulkHotelTOAssignment.tsx                   # Bulk hotel → TO assignment wizard
│   ├── TourOperatorForm.tsx                        # TO create/edit form
│   ├── RateVerificationWindow.tsx                  # Rate testing/verification booking simulator
│   ├── RateVerificationResults.tsx                 # Full rate matrix display with warnings
│   ├── SpoVerificationWindow.tsx                   # SPO rate verification with offer comparison
│   ├── SpoEligibilityChecklist.tsx                 # ✅/❌ offer condition checklist
│   └── ContractingSidebar.tsx                      # Module sidebar navigation
│
├── lib/contracting/
│   ├── rate-calculation-engine.ts                  # Core rate computation algorithm
│   ├── offer-engine.ts                             # Special offer application logic
│   ├── stop-sale-checker.ts                        # Stop sale validation
│   ├── allotment-manager.ts                        # Allocation availability + release logic
│   ├── markup-calculator.ts                        # Markup application with rule hierarchy
│   ├── tariff-generator.ts                         # Tariff sheet generation (data assembly)
│   ├── tariff-pdf-exporter.ts                      # PDF generation for tariff
│   ├── tariff-excel-exporter.ts                    # Excel generation for tariff
│   ├── season-resolver.ts                          # Resolve date → season mapping
│   ├── child-rate-calculator.ts                    # Child rate computation with policy
│   ├── offer-combinability.ts                      # Offer stacking/combinability logic
│   ├── contract-validator.ts                       # Validate contract completeness before posting/publishing
│   ├── contract-copy-engine.ts                     # Contract duplication with rate adjustment logic
│   ├── rate-verification-engine.ts                 # Rate testing/verification simulator
│   ├── spo-verification-engine.ts                  # SPO rate verification with offer application
│   └── to-assignment-manager.ts                    # Tour operator assignment & bulk assign logic
│
└── prisma/
    └── schema.prisma                               # All Contracting models added
```

---

## Reports

### 1. Seasonal Special Offer Report

Shows all active offers for a contract, grouped by season, with conditions and values.

```
┌─────────────────────────────────────────────────────────────────┐
│ SEASONAL SPECIAL OFFERS — Hilton Dubai Marina — Summer 2026     │
├─────────────────────────────────────────────────────────────────┤
│ SEASON: HIGH (01 Jun – 31 Aug 2026)                             │
│ ┌──────────────────┬────────┬─────────┬───────────┬───────────┐ │
│ │ Offer            │ Value  │ Min Stay│ Booking By│ Combinable│ │
│ ├──────────────────┼────────┼─────────┼───────────┼───────────┤ │
│ │ EBD 15%          │ 15%    │ 3 nts   │ 28 Feb    │ ✓ LongSty│ │
│ │ Rolling EBD 20%  │ 10-20% │ 5 nts   │ —         │ ✗        │ │
│ │ Stay 7 Pay 6     │ 1 free │ 7 nts   │ —         │ ✓ EBD    │ │
│ │ Honeymoon        │ Upgrade│ —       │ —         │ ✗        │ │
│ │ Marketing 5%     │ 5% net │ —       │ —         │ ✓ All    │ │
│ └──────────────────┴────────┴─────────┴───────────┴───────────┘ │
│                                                                  │
│ SEASON: PEAK (01 Sep – 31 Oct 2026)                             │
│ ┌──────────────────┬────────┬─────────┬───────────┬───────────┐ │
│ │ EBD 15%          │ 15%    │ 3 nts   │ 28 Feb    │ ✓ LongSty│ │
│ │ Stay 7 Pay 6     │ 1 free │ 7 nts   │ —         │ ✓ EBD    │ │
│ │ Marketing 5%     │ 5% net │ —       │ —         │ ✓ All    │ │
│ └──────────────────┴────────┴─────────┴───────────┴───────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

### 2. EBD Condition Report (Cross-Contract)

Compares EBD offers across all contracts for a given season/period.

```
┌─────────────────────────────────────────────────────────────────┐
│ EBD CONDITIONS REPORT — High Season (Jun–Aug 2026)              │
│ [Export PDF] [Export Excel]                                      │
├─────────────────────────────────────────────────────────────────┤
│ ┌────────────────┬────────┬─────────┬───────────┬──────┬──────┐ │
│ │ Hotel          │ Disc % │ Lead Dys│ Book By   │MinSty│ Rooms│ │
│ ├────────────────┼────────┼─────────┼───────────┼──────┼──────┤ │
│ │ Hilton Dubai   │ 15%    │ 60+     │ 28 Feb 26 │ 3    │ All  │ │
│ │ Marriott JBR   │ 20%    │ 90+     │ 15 Mar 26 │ 5    │ All  │ │
│ │ Jumeirah Beach │ 12%    │ 45+     │ 31 Jan 26 │ 3    │ DLX+ │ │
│ │ Atlantis Palm  │ 18%    │ 75+     │ 28 Feb 26 │ 4    │ All  │ │
│ │ Kempinski      │ 10%    │ 30+     │ 30 Apr 26 │ 2    │ All  │ │
│ │ Ritz Carlton   │ 25%    │ 120+    │ 31 Dec 25 │ 7    │ SUI  │ │
│ └────────────────┴────────┴─────────┴───────────┴──────┴──────┘ │
│                                                                  │
│ Rolling EBD Comparison:                                          │
│ ┌────────────────┬─────────┬─────────┬─────────┬──────────────┐ │
│ │ Hotel          │ 90+ dys │ 60-89   │ 30-59   │ Notes        │ │
│ ├────────────────┼─────────┼─────────┼─────────┼──────────────┤ │
│ │ Marriott JBR   │ 20%     │ 15%     │ 10%     │ Min 5 nts    │ │
│ │ Atlantis Palm  │ 18%     │ 12%     │ 8%      │ Min 4 nts    │ │
│ └────────────────┴─────────┴─────────┴─────────┴──────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

### 3. Tariff Export (PDF/Excel Format)

```
┌─────────────────────────────────────────────────────────────────┐
│                    TARIFF — CONFIDENTIAL                        │
│                                                                  │
│ Hotel: Hilton Dubai Marina ★★★★★                                │
│ Contract: CTR-HLT-DXB-2026-S1 | Valid: 01 Apr – 31 Oct 2026   │
│ Prepared for: ABC Tours International                           │
│ Currency: USD | Rates per person per night                      │
│ Generated: 22 Feb 2026                                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│ [Season rates tables — same format as Calculated Rates Grid]    │
│ [Child rates table]                                              │
│ [Special offers with full conditions]                            │
│ [Gala meals with pricing]                                        │
│ [Stop sale dates]                                                │
│ [Booking conditions & cancellation policy]                       │
│                                                                  │
│ Remarks:                                                         │
│ - Rates are net and non-commissionable                          │
│ - Subject to availability at time of booking                    │
│ - Blackout dates may apply                                      │
└─────────────────────────────────────────────────────────────────┘
```

---

## Implementation Phases

| Phase | Scope | Description |
|-------|-------|-------------|
| **Phase 1: Hotel Master** | Hotel, Destination, HotelAmenity, HotelImage, HotelRoomType, RoomTypeOccupancy, ChildPolicy, HotelMealBasis | Hotel definition with all related entities. Room types with occupancy tables, children policy, meal basis. |
| **Phase 2: Contract Core** | Contract, ContractSeason, ContractRoomType, ContractMealBasis, ContractBaseRate | Contract creation, season definition, room/meal selection, base rate entry per season. |
| **Phase 3: Supplements** | ContractSupplement (room type, meal, occupancy, child, extra bed, view) | Full supplement entry grids: room type supplement matrix, meal supplement matrix, occupancy supplement/reduction matrix. |
| **Phase 4: Rate Engine** | CalculatedRate, rate-calculation-engine, child-rate-calculator, season-resolver | Core calculation engine. Compute and populate all rates from base + supplements. Output grid view with override capability. |
| **Phase 5: Special Offers** | SpecialOffer, SeasonalOfferPeriod, RollingEbdTier, LongStayTier, SpecialOfferRoomType, SpecialOfferMealBasis, offer-engine, offer-combinability | All offer types: EBD, Rolling EBD, Senior, Honeymoon, Long Stay, Free Nights, Marketing Contribution. Combinability rules. |
| **Phase 6: Special Meals & Stop Sales** | SpecialMeal, StopSale, StopSaleRoomType, StopSaleMealBasis, stop-sale-checker | Gala meal supplements (NYE, Christmas). Stop sale management with calendar view. |
| **Phase 7: Allocation** | Allocation, allotment-manager | Allotment calendar, freesale/on-request/commitment/allocation modes, release period management, daily availability tracking. |
| **Phase 8: Markup & Tariff** | MarkupRule, SellingRate, Tariff, markup-calculator, tariff-generator, tariff-pdf-exporter, tariff-excel-exporter | Markup rules with hierarchy, selling rate computation, tariff generation and export (PDF/Excel). |
| **Phase 9: Tour Operators & Assignments** | TourOperator, ContractTourOperator, HotelTourOperator, Market, to-assignment-manager | TO master data, per-contract TO assignment, bulk hotel-to-TO assignment, cascading logic. |
| **Phase 10: Contract Copy & Lifecycle** | ContractCopyLog, contract-copy-engine, 3-stage workflow (Draft/Posted/Published) | Copy contract for next season with freeze/increase/decrease/average. Contract status workflow: Draft → Posted → Published with reset capability. |
| **Phase 11: Rate Verification** | RateVerification, rate-verification-engine, spo-verification-engine | Rate testing/verification window (booking simulator). Full rate matrix output. SPO verification with offer comparison. Available in all contract statuses. |
| **Phase 12: Reports** | Seasonal offer report, EBD conditions report, rate sheet report, allotment utilization, contract summary | All reporting views with filters, cross-contract comparisons, PDF/Excel export. |
