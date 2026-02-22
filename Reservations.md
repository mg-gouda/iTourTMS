# iTourTMS — Reservations Module Specification

> Complete specification for the Reservations/Booking module — the operational heart of the travel management system. Manages the full booking lifecycle from search through check-out, with real-time rate calculation from contracts, allotment deduction, payment tracking, voucher generation, and comprehensive reporting.

---

## Table of Contents

1. [Module Overview](#module-overview)
2. [Database Schema](#database-schema)
3. [UI Structure](#ui-structure)
4. [Business Logic & Workflows](#business-logic--workflows)
5. [Booking Rate Calculation Engine](#booking-rate-calculation-engine)
6. [Cancellation & Penalty Engine](#cancellation--penalty-engine)
7. [Payment & Credit Management](#payment--credit-management)
8. [Voucher & Document Generation](#voucher--document-generation)
9. [API Routes](#api-routes)
10. [File Structure](#file-structure)
11. [Reports](#reports)
12. [Implementation Phases](#implementation-phases)

---

## Module Overview

| # | Sub-Module | Description |
|---|-----------|-------------|
| 1 | **Booking Search & Availability** | Search hotels by destination/dates/occupancy, check contracted rates and allotment in real-time, display all room type × meal basis × occupancy combinations with pricing |
| 2 | **Booking Creation** | Create reservations from contracted rates — calculate from contract + tour operator markup. Validate against stop sales, allotment, credit limits |
| 3 | **Booking Management** | Full lifecycle: Draft → Option → On-Request → Confirmed → Checked-In → Checked-Out → Finalized |
| 4 | **FIT Bookings (Individual)** | Standard 1–9 room bookings for free independent travelers |
| 5 | **Group Bookings** | 10+ room bookings with room blocks, rooming lists, materialization tracking, complimentary rooms, attrition policies |
| 6 | **Series / Recurring Bookings** | Weekly/monthly recurring bookings with template-based creation |
| 7 | **Amendments / Modifications** | Date changes, room type changes, occupancy changes, name changes, meal plan changes with automatic price recalculation and penalty assessment |
| 8 | **Cancellations** | Cancellation workflow with tiered penalty calculation based on contract terms, refund/credit note generation |
| 9 | **Rooming Lists** | Guest name entry per room, bulk import/export, deadline tracking, auto-send to hotel |
| 10 | **Guest Management** | Guest profiles database, document tracking (passport/ID), preferences, VIP levels, repeat guest recognition |
| 11 | **Special Requests** | Room preferences, celebrations, dietary requirements, accessibility needs, early check-in/late check-out |
| 12 | **Multi-Room Bookings** | Multiple rooms under one booking with per-room configuration (different room types, meal plans, guests) |
| 13 | **Split Stays** | Same guest across different room types or different hotels with linked booking segments |
| 14 | **Transfers & Extras** | Airport transfers, excursions, supplements, celebration packages linked to bookings |
| 15 | **Waitlist & On-Request** | Queue management for bookings without allotment, supplier request/response workflow, auto-escalation |
| 16 | **Allotment Deduction** | Real-time allotment deduction on booking, restoration on cancellation, partial allotment handling |
| 17 | **Stop Sale Enforcement** | Alert reservation agent on stop sale, option to override with reason or cancel booking |
| 18 | **Payment Tracking** | Deposit requests, payment recording, balance tracking, overpayment handling, refund processing |
| 19 | **Credit Limit Management** | Per-agent/TO credit limits, utilization tracking, booking blocks on exceeded limits, manager overrides |
| 20 | **Pro-Forma & Final Invoicing** | Auto-generate pro-forma on confirmation, convert to final invoice, credit notes, batch invoicing |
| 21 | **Vouchers & Confirmations** | Hotel voucher generation (PDF), booking confirmation documents, branded per agent/TO |
| 22 | **Communication Log** | All emails/messages to/from hotels tracked per booking — confirmation requests, amendments, rooming lists |
| 23 | **Deadline Management** | Option expiry, payment due dates, rooming list deadlines, release dates — dashboard with color-coded alerts |
| 24 | **No-Show Handling** | Auto-detect no-shows, penalty application, allotment release, reporting |
| 25 | **Overbooking Management** | Overbooking threshold configuration, walk/relocation workflow, cost tracking, alternative hotel suggestions |
| 26 | **Booking Validation Engine** | Pre-booking checks (availability, allotment, stop sale, credit, min/max stay, occupancy rules, contract validity, duplicate detection) |
| 27 | **Materialization Report** | Per-hotel room type consumption against allocation — actual vs. blocked with utilization percentage |
| 28 | **Booking Sources / Channels** | Track booking origin (direct, B2B portal, API, phone/email) with channel analytics |
| 29 | **Audit Trail** | Immutable log of every booking action with timestamp, user, before/after values |
| 30 | **Notifications & Alerts** | Email/in-app alerts for confirmations, deadlines, payment reminders, escalations |
| 31 | **Flight Details & Traffic Integration** | Arrival/departure flight info per booking and per guest. Feeds into the future Traffic module for arrival/departure manifests, transfer scheduling, and airport meet & greet coordination |
| 32 | **Send Reservation to Hotel** | Send booking details to hotel directly from the reservation window — includes all booking data (guests, rooms, dates, meal plan, special requests, flight details) **excluding all pricing/rates**. Cross-module: pulls hotel contact from Contracting module, generates price-excluded document, logs in Communication module |
| 33 | **TO Payment Agreements** | Per-tour-operator payment terms configuration — credit/prepay/deposit-balance, billing cycle (per booking, weekly, monthly), credit days, late penalty, early discount, commission basis. Determines how each TO's bookings are billed and collected |
| 34 | **TO Statements & Batch Invoicing** | Periodic consolidated statements for TOs — groups all bookings in a period, nets off credit notes, tracks payments against statement. Supports per-booking invoicing, weekly/monthly consolidated billing, and commission-based settlement |

---

## Database Schema

### Enums

```prisma
enum BookingStatus {
  DRAFT              // booking started but not submitted
  QUOTATION          // price quote issued, no commitment
  OPTION             // tentative hold with expiry date — allotment soft-blocked
  ON_REQUEST         // sent to hotel, awaiting confirmation
  CONFIRMED          // hotel confirmed — allotment committed
  AMENDED            // booking modified (transitional, returns to CONFIRMED)
  PENDING_PAYMENT    // confirmed but awaiting deposit/payment
  CHECKED_IN         // guest arrived
  CHECKED_OUT        // guest departed
  NO_SHOW            // guest did not arrive
  CANCELLED          // booking cancelled (no penalty or free cancellation)
  CANCELLED_PENALTY  // booking cancelled with penalty charges
  WAITLISTED         // no availability — on waiting list
  REJECTED           // hotel/supplier rejected on-request booking
  EXPIRED            // option/quote expired without confirmation
  FINALIZED          // all reconciliation complete — archived
}

enum BookingType {
  FIT                // Free Independent Traveler (1-9 rooms)
  GROUP              // Group booking (10+ rooms)
  SERIES             // Recurring/series booking
}

enum ServiceStatus {
  REQUESTED          // request sent to supplier
  SENT               // communication sent to hotel
  CONFIRMED          // hotel confirmed this service
  REJECTED           // hotel declined
  CANCELLED          // service cancelled
  CANCELLED_PENALTY  // cancelled with penalty
  VOUCHER_ISSUED     // voucher generated
  NO_SHOW            // guest didn't show for this service
  COMPLETED          // service delivered
}

enum PaymentStatus {
  UNPAID             // no payment received
  DEPOSIT_PAID       // partial deposit received
  PARTIALLY_PAID     // some payments but not full
  FULLY_PAID         // all payments received
  OVERPAID           // more than total received (credit due)
  REFUND_PENDING     // cancellation processed, refund to issue
  REFUNDED           // refund completed
}

enum BookingSource {
  DIRECT_PHONE       // phone booking by agent
  DIRECT_EMAIL       // email booking by agent
  B2B_PORTAL         // agent self-service portal (TO logged in)
  TO_EMAIL           // booking received from TO via email
  TO_FAX             // booking received from TO via fax
  TO_API             // automated booking from TO system
  API                // automated API booking
  WALK_IN            // on-property booking
  WEBSITE_IBE        // internet booking engine (direct guest)
  MOBILE_APP         // mobile application (direct guest)
  IMPORT             // bulk import from file
}

enum BillingType {
  TOUR_OPERATOR      // TO pays per agreement terms — no direct guest payment
  DIRECT_GUEST       // guest pays directly (deposit + balance)
  SPLIT_BILLING      // part TO, part guest (e.g., room by TO, extras by guest)
  PREPAID_TO         // TO has prepaid/deposited for this booking block
  CORPORATE          // corporate account billing
}

enum TOPaymentBasis {
  CREDIT             // TO invoiced per credit terms, pays within agreed days
  PREPAY             // TO must pay before booking confirmation
  DEPOSIT_BALANCE    // TO pays deposit on booking, balance before check-in
  GUARANTEE_ONLY     // credit card guarantee, charged on no-show/late cancel
  POST_STAY          // invoiced after guest check-out (settlement after service)
}

enum TOBillingCycle {
  PER_BOOKING        // invoice issued per individual booking
  WEEKLY             // weekly consolidated statement/invoice
  BIWEEKLY           // every 2 weeks
  MONTHLY            // monthly consolidated statement/invoice
  ON_DEPARTURE       // invoiced on each departure date
}

enum StatementStatus {
  DRAFT              // statement being prepared
  ISSUED             // sent to TO
  PARTIALLY_PAID     // some bookings on statement paid
  FULLY_PAID         // all bookings on statement paid
  OVERDUE            // past due date, unpaid
  DISPUTED           // TO has raised dispute
}

enum AmendmentType {
  DATE_CHANGE        // check-in/check-out date change
  ROOM_TYPE_CHANGE   // upgrade/downgrade room category
  OCCUPANCY_CHANGE   // add/remove guests
  NAME_CHANGE        // change guest names
  MEAL_PLAN_CHANGE   // change board basis
  DURATION_CHANGE    // extend or shorten stay
  ROOM_QUANTITY      // add/remove rooms
  EXTRA_SERVICE      // add/remove transfers/extras
  SPECIAL_REQUEST    // modify special requests
}

enum CancellationPolicyType {
  FREE               // full refund before deadline
  TIERED             // graduated penalty (25% at 30d, 50% at 14d, 100% at 7d)
  NON_REFUNDABLE     // no refund regardless of timing
  FIRST_NIGHT        // one night penalty
  PERCENTAGE         // fixed percentage penalty
  FIXED_FEE          // flat cancellation fee
}

enum PenaltyBasis {
  FIRST_NIGHT        // penalty = 1 night rate
  FULL_STAY          // penalty = entire booking value
  PERCENTAGE         // penalty = X% of total
  FIXED_AMOUNT       // penalty = fixed amount
  NIGHTS_COUNT       // penalty = X nights rate
}

enum TransferType {
  AIRPORT_ARRIVAL    // airport → hotel
  AIRPORT_DEPARTURE  // hotel → airport
  INTER_HOTEL        // hotel → hotel (split stays)
  EXCURSION          // hotel → activity location
  ROUND_TRIP         // hotel → location → hotel
}

enum VehicleType {
  SEDAN
  MINIVAN
  SUV
  VAN
  MINI_BUS
  COACH
  LIMOUSINE
  SPEED_BOAT
  SEAPLANE
}

enum ExtraType {
  TRANSFER           // airport/inter-hotel transfers
  EXCURSION          // day tours, activities
  MEAL_UPGRADE       // upgrade board basis
  ROOM_UPGRADE       // upgrade room type
  CELEBRATION        // honeymoon/birthday/anniversary package
  EARLY_CHECKIN      // guaranteed early check-in
  LATE_CHECKOUT      // guaranteed late check-out
  INSURANCE          // travel/cancellation insurance
  VISA               // visa processing
  BABY_COT           // baby cot/crib
  EXTRA_BED          // extra bed
  PARKING            // hotel parking
  WIFI               // premium internet
  SPA                // spa/wellness package
  OTHER              // custom extra
}

enum ExtraPricingBasis {
  PER_PERSON         // price per person
  PER_ROOM           // price per room
  PER_NIGHT          // price per night
  PER_STAY           // price per entire stay
  PER_PERSON_NIGHT   // price per person per night
  PER_TRIP           // price per transfer trip
  FIXED              // fixed total price
}

enum CommunicationType {
  AVAILABILITY_REQUEST
  HOTEL_RESERVATION_SEND          // full booking details sent to hotel (price excluded)
  BOOKING_CONFIRMATION_REQUEST
  BOOKING_CONFIRMATION_RECEIPT
  AMENDMENT_REQUEST
  AMENDMENT_CONFIRMATION
  CANCELLATION_NOTICE
  CANCELLATION_ACKNOWLEDGMENT
  ROOMING_LIST_SUBMISSION
  ROOMING_LIST_ACKNOWLEDGMENT
  VOUCHER_SENT
  PAYMENT_REMINDER
  RECONFIRMATION
  SPECIAL_REQUEST_NOTIFICATION
  GENERAL_CORRESPONDENCE
}

enum CommunicationChannel {
  EMAIL
  FAX
  API
  PHONE
  PORTAL
  SMS
}

enum CommunicationDirection {
  OUTBOUND           // sent from system
  INBOUND            // received from supplier/agent
}

enum DeadlineType {
  OPTION_EXPIRY
  DEPOSIT_DUE
  BALANCE_DUE
  ROOMING_LIST
  FREE_CANCELLATION
  AMENDMENT_DEADLINE
  NAME_CHANGE_DEADLINE
  RECONFIRMATION
  SUPPLIER_PAYMENT
  ALLOTMENT_RELEASE
}

enum DeadlineStatus {
  UPCOMING           // not yet due
  WARNING            // approaching (configurable threshold)
  OVERDUE            // past due, action required
  COMPLETED          // action taken
  EXTENDED           // deadline extended
  WAIVED             // deadline waived by manager
}

enum GuestType {
  LEAD_GUEST         // primary contact
  ADULT              // additional adult
  CHILD              // child (age-based pricing)
  INFANT             // infant
  TOUR_LEADER        // group tour leader
  DRIVER             // tour bus driver
  VIP                // VIP guest
}

enum VipLevel {
  NONE
  SILVER
  GOLD
  PLATINUM
  DIAMOND
}

enum SpecialRequestStatus {
  REQUESTED
  CONFIRMED
  NOT_AVAILABLE
  CANCELLED
}

enum DocumentType {
  BOOKING_CONFIRMATION
  HOTEL_RESERVATION_REQUEST   // sent TO HOTEL — full booking details WITHOUT price
  HOTEL_VOUCHER
  PROFORMA_INVOICE
  FINAL_INVOICE
  CREDIT_NOTE
  CANCELLATION_CONFIRMATION
  AMENDMENT_CONFIRMATION
  ROOMING_LIST
  RECEIPT
}

enum GroupRoomStatus {
  BLOCKED            // room reserved in block
  NAMED              // guest name assigned
  CONFIRMED          // confirmed with hotel
  RELEASED           // released back from block
  CANCELLED          // individual room cancelled
  NO_SHOW            // guest no-show for this room
  CHECKED_IN         // guest arrived
  CHECKED_OUT        // guest departed
}
```

### Core Models

```prisma
// ============================================================
// BOOKING (Master Reservation)
// ============================================================

model Booking {
  id                    String          @id @default(cuid())
  bookingRef            String          @unique              // BK-2026-00001
  status                BookingStatus   @default(DRAFT)
  bookingType           BookingType     @default(FIT)
  source                BookingSource   @default(DIRECT_PHONE)

  // --- Hotel & Contract (from Contracting module) ---
  hotelId               String
  hotel                 Hotel           @relation(fields: [hotelId], references: [id])
  contractId            String
  contract              Contract        @relation(fields: [contractId], references: [id])

  // --- Tour Operator & Agent ---
  tourOperatorId        String
  tourOperator          TourOperator    @relation(fields: [tourOperatorId], references: [id])
  agentId               String?                              // sub-agent if applicable
  agent                 User?           @relation("BookingAgent", fields: [agentId], references: [id])
  marketId              String?                              // source market
  market                Market?         @relation(fields: [marketId], references: [id])

  // --- Dates ---
  checkIn               DateTime        @db.Date
  checkOut              DateTime        @db.Date
  nights                Int                                  // computed: checkOut - checkIn

  // --- Occupancy Summary ---
  totalRooms            Int             @default(1)
  totalAdults           Int             @default(2)
  totalChildren         Int             @default(0)
  totalInfants          Int             @default(0)

  // --- Pricing (all amounts in booking currency) ---
  currencyId            String
  currency              Currency        @relation(fields: [currencyId], references: [id])
  exchangeRate          Decimal         @default(1)          // rate frozen at booking time
  costPrice             Decimal         @default(0)          // net cost from contract
  markupAmount          Decimal         @default(0)          // markup applied
  sellingPrice          Decimal         @default(0)          // price to TO/agent
  taxAmount             Decimal         @default(0)          // taxes
  totalPrice            Decimal         @default(0)          // sellingPrice + taxAmount
  supplementsTotal      Decimal         @default(0)          // extras/supplements total
  penaltyAmount         Decimal         @default(0)          // cancellation/no-show penalty
  grandTotal            Decimal         @default(0)          // totalPrice + supplementsTotal

  // --- Billing & Payment Responsibility ---
  billingType           BillingType     @default(TOUR_OPERATOR) // who pays: TO, guest, split
  toPaymentAgreementId  String?                              // TO's payment agreement (auto-set from TO)
  toPaymentAgreement    TOPaymentAgreement? @relation(fields: [toPaymentAgreementId], references: [id])

  // --- Payment ---
  paymentStatus         PaymentStatus   @default(UNPAID)
  depositAmount         Decimal         @default(0)          // deposit required
  depositDueDate        DateTime?       @db.Date
  balanceDueDate        DateTime?       @db.Date
  totalPaid             Decimal         @default(0)
  totalRefunded         Decimal         @default(0)
  outstandingBalance    Decimal         @default(0)          // grandTotal - totalPaid + totalRefunded

  // --- TO Billing (when billingType = TOUR_OPERATOR or PREPAID_TO) ---
  toInvoiceRef          String?                              // invoice number sent to TO
  toInvoiceDate         DateTime?       @db.Date
  toPaymentDueDate      DateTime?       @db.Date             // calculated from agreement credit terms
  toStatementId         String?                              // linked statement (if billed via statement)
  toStatement           TOStatement?    @relation(fields: [toStatementId], references: [id])
  commissionAmount      Decimal         @default(0)          // TO commission (if commission-based)
  remittanceAmount      Decimal         @default(0)          // net amount after commission

  // --- Guest Billing (when billingType = DIRECT_GUEST or SPLIT_BILLING) ---
  guestPayerName        String?                              // paying guest name (may differ from lead guest)
  guestPayerEmail       String?
  guestPayerPhone       String?

  // --- Option / Tentative ---
  optionDate            DateTime?                            // option expiry date
  isOptionExpired       Boolean         @default(false)

  // --- References ---
  supplierRef           String?                              // hotel's confirmation number
  agentRef              String?                              // agent's own reference
  clientRef             String?                              // end customer reference
  groupCode             String?                              // for group bookings
  seriesCode            String?                              // for series bookings
  cancellationRef       String?                              // cancellation reference number
  voucherNumber         String?                              // generated voucher number

  // --- Flight Details (for Traffic module integration) ---
  arrivalFlightNumber   String?                              // e.g. "EK203"
  arrivalFlightDate     DateTime?     @db.Date               // flight arrival date
  arrivalFlightTime     String?                              // "14:30" (local time)
  arrivalAirport        String?                              // IATA code e.g. "DXB"
  arrivalTerminal       String?                              // "Terminal 3"
  departureFlightNumber String?                              // e.g. "EK204"
  departureFlightDate   DateTime?     @db.Date               // flight departure date
  departureFlightTime   String?                              // "22:15" (local time)
  departureAirport      String?                              // IATA code e.g. "DXB"
  departureTerminal     String?                              // "Terminal 3"

  // --- Notes ---
  internalNotes         String?                              // internal team notes
  supplierNotes         String?                              // notes for hotel
  agentNotes            String?                              // notes from agent
  cancellationReason    String?

  // --- Relationships ---
  rooms                 BookingRoom[]
  guests                BookingGuest[]
  extras                BookingExtra[]
  payments              BookingPayment[]
  amendments            BookingAmendment[]
  communications        BookingCommunication[]
  deadlines             BookingDeadline[]
  documents             BookingDocument[]
  auditLogs             BookingAuditLog[]
  specialRequests       BookingSpecialRequest[]
  statementLines        TOStatementLine[]       // if billed via TO statement

  // --- Group Booking ---
  groupBooking          GroupBooking?

  // --- Split Stay Links ---
  splitStayParentId     String?                              // parent booking for split stays
  splitStayParent       Booking?        @relation("SplitStay", fields: [splitStayParentId], references: [id])
  splitStaySegments     Booking[]       @relation("SplitStay")
  splitStaySequence     Int?                                 // order within split stay

  // --- Audit ---
  createdById           String
  createdBy             User            @relation("BookingCreator", fields: [createdById], references: [id])
  confirmedAt           DateTime?
  checkedInAt           DateTime?
  checkedOutAt          DateTime?
  cancelledAt           DateTime?
  finalizedAt           DateTime?

  // --- Meta ---
  companyId             String
  company               Company         @relation(fields: [companyId], references: [id])
  createdAt             DateTime        @default(now())
  updatedAt             DateTime        @updatedAt

  @@index([hotelId, checkIn, checkOut])
  @@index([tourOperatorId])
  @@index([status])
  @@index([checkIn])
  @@index([createdAt])
}

// ============================================================
// BOOKING ROOMS (per-room detail within a booking)
// ============================================================

model BookingRoom {
  id                    String          @id @default(cuid())
  bookingId             String
  booking               Booking         @relation(fields: [bookingId], references: [id], onDelete: Cascade)
  roomSequence          Int             @default(1)          // room 1, 2, 3...

  // --- Room Configuration ---
  roomTypeId            String
  roomType              HotelRoomType   @relation(fields: [roomTypeId], references: [id])
  mealBasisId           String
  mealBasis             HotelMealBasis  @relation(fields: [mealBasisId], references: [id])

  // --- Occupancy ---
  adults                Int             @default(2)
  children              Int             @default(0)
  infants               Int             @default(0)
  childAges             Int[]           @default([])         // ages of each child

  // --- Dates (can differ per room in multi-room) ---
  checkIn               DateTime        @db.Date
  checkOut              DateTime        @db.Date
  nights                Int

  // --- Rate Breakdown (per room) ---
  costPerNight          Decimal         @default(0)          // net rate per night
  totalCost             Decimal         @default(0)          // cost × nights
  sellingPerNight       Decimal         @default(0)          // selling rate per night
  totalSelling          Decimal         @default(0)          // selling × nights

  // --- Rate Source ---
  calculatedRateId      String?                              // link to CalculatedRate used
  calculatedRate        CalculatedRate? @relation(fields: [calculatedRateId], references: [id])
  rateBreakdown         Json?                                // per-night breakdown by season if multi-season stay

  // --- Offers Applied ---
  offersApplied         BookingRoomOffer[]
  totalDiscount         Decimal         @default(0)          // total discount from offers

  // --- Special Meals ---
  specialMealCharges    Decimal         @default(0)          // gala dinner supplements

  // --- Service Status ---
  serviceStatus         ServiceStatus   @default(REQUESTED)

  // --- Allotment ---
  allotmentDeducted     Boolean         @default(false)
  allotmentSource       String?                              // "ALLOTMENT", "FREESALE", "ON_REQUEST"

  // --- Guests assigned to this room ---
  guests                BookingRoomGuest[]
  specialRequests       BookingSpecialRequest[]

  // --- Group room status (for group bookings) ---
  groupRoomStatus       GroupRoomStatus?

  createdAt             DateTime        @default(now())
  updatedAt             DateTime        @updatedAt

  @@unique([bookingId, roomSequence])
}

// --- Offers applied to a booking room ---

model BookingRoomOffer {
  id                    String        @id @default(cuid())
  bookingRoomId         String
  bookingRoom           BookingRoom   @relation(fields: [bookingRoomId], references: [id], onDelete: Cascade)
  specialOfferId        String
  specialOffer          SpecialOffer  @relation(fields: [specialOfferId], references: [id])
  offerName             String                               // snapshot of offer name at booking time
  discountType          String                               // "PERCENTAGE", "FREE_NIGHTS", "UPGRADE", etc.
  discountValue         Decimal                              // percentage or amount
  discountAmount        Decimal                              // actual monetary discount applied
  freeNights            Int?                                 // free nights granted (for free-night offers)
  notes                 String?

  createdAt             DateTime      @default(now())
}

// ============================================================
// GUESTS
// ============================================================

model GuestProfile {
  id                    String        @id @default(cuid())
  title                 String?                              // Mr, Mrs, Ms, Dr
  firstName             String
  lastName              String
  middleName            String?
  email                 String?
  phone                 String?
  mobile                String?
  dateOfBirth           DateTime?     @db.Date
  gender                String?                              // M, F, O
  nationalityId         String?
  nationality           Country?      @relation("GuestNationality", fields: [nationalityId], references: [id])

  // --- Documents ---
  passportNumber        String?
  passportIssueDate     DateTime?     @db.Date
  passportExpiryDate    DateTime?     @db.Date
  passportCountryId     String?
  nationalIdNumber      String?

  // --- Preferences ---
  preferredLanguage     String?
  preferredRoomType     String?
  preferredBedConfig    String?
  preferredFloor        String?
  dietaryRequirements   String?
  allergies             String?
  smokingPreference     String?                              // "non-smoking", "smoking"
  accessibilityNeeds    String?

  // --- Loyalty ---
  vipLevel              VipLevel      @default(NONE)
  loyaltyNumber         String?
  totalBookings         Int           @default(0)
  totalNights           Int           @default(0)
  lastStayDate          DateTime?     @db.Date

  // --- Emergency Contact ---
  emergencyName         String?
  emergencyPhone        String?
  emergencyRelation     String?

  // --- Notes ---
  internalNotes         String?

  // --- Relationships ---
  bookingGuests         BookingGuest[]

  // --- Meta ---
  active                Boolean       @default(true)
  companyId             String
  company               Company       @relation(fields: [companyId], references: [id])
  createdAt             DateTime      @default(now())
  updatedAt             DateTime      @updatedAt

  @@index([lastName, firstName])
  @@index([passportNumber])
  @@index([email])
}

model BookingGuest {
  id                    String        @id @default(cuid())
  bookingId             String
  booking               Booking       @relation(fields: [bookingId], references: [id], onDelete: Cascade)
  guestProfileId        String?
  guestProfile          GuestProfile? @relation(fields: [guestProfileId], references: [id])

  // --- Inline guest data (snapshot or for guests without profile) ---
  title                 String?
  firstName             String
  lastName              String
  dateOfBirth           DateTime?     @db.Date
  age                   Int?                                 // computed or manual
  nationalityId         String?
  passportNumber        String?
  passportExpiry        DateTime?     @db.Date

  // --- Type ---
  guestType             GuestType     @default(ADULT)
  isLeadGuest           Boolean       @default(false)
  vipLevel              VipLevel      @default(NONE)

  // --- Per-Guest Flight Details (override booking-level if guest has different flights) ---
  arrivalFlightNumber   String?                              // e.g. "EK203"
  arrivalFlightDate     DateTime?     @db.Date
  arrivalFlightTime     String?                              // "14:30"
  arrivalAirport        String?                              // IATA code
  departureFlightNumber String?                              // e.g. "EK204"
  departureFlightDate   DateTime?     @db.Date
  departureFlightTime   String?                              // "22:15"
  departureAirport      String?                              // IATA code

  // --- Room Assignment ---
  roomAssignments       BookingRoomGuest[]

  createdAt             DateTime      @default(now())
  updatedAt             DateTime      @updatedAt
}

model BookingRoomGuest {
  id                    String        @id @default(cuid())
  bookingRoomId         String
  bookingRoom           BookingRoom   @relation(fields: [bookingRoomId], references: [id], onDelete: Cascade)
  bookingGuestId        String
  bookingGuest          BookingGuest  @relation(fields: [bookingGuestId], references: [id], onDelete: Cascade)

  @@unique([bookingRoomId, bookingGuestId])
}

// ============================================================
// SPECIAL REQUESTS
// ============================================================

model BookingSpecialRequest {
  id                    String               @id @default(cuid())
  bookingId             String
  booking               Booking              @relation(fields: [bookingId], references: [id], onDelete: Cascade)
  bookingRoomId         String?                              // specific room (null = whole booking)
  bookingRoom           BookingRoom?         @relation(fields: [bookingRoomId], references: [id])
  category              String                               // "bed", "floor", "view", "dietary", "celebration", "accessibility", "other"
  request               String                               // the actual request text
  status                SpecialRequestStatus @default(REQUESTED)
  hotelResponse         String?                              // hotel's response
  isChargeable          Boolean              @default(false)
  charge                Decimal?                             // charge amount if applicable
  notes                 String?

  createdAt             DateTime             @default(now())
  updatedAt             DateTime             @updatedAt
}

// ============================================================
// EXTRAS & TRANSFERS
// ============================================================

model BookingExtra {
  id                    String          @id @default(cuid())
  bookingId             String
  booking               Booking         @relation(fields: [bookingId], references: [id], onDelete: Cascade)
  extraType             ExtraType
  name                  String                               // "Airport Arrival Transfer", "Honeymoon Package"
  description           String?

  // --- Transfer-specific fields ---
  transferType          TransferType?
  vehicleType           VehicleType?
  pickupLocation        String?
  dropoffLocation       String?
  pickupDateTime        DateTime?
  flightNumber          String?
  flightTime            DateTime?
  meetAndGreet          Boolean         @default(false)
  passengers            Int?
  driverName            String?
  driverPhone           String?

  // --- Pricing ---
  pricingBasis          ExtraPricingBasis @default(FIXED)
  unitPrice             Decimal         @default(0)
  quantity              Int             @default(1)
  totalPrice            Decimal         @default(0)
  costPrice             Decimal         @default(0)          // supplier cost
  sellingPrice          Decimal         @default(0)          // selling price

  // --- Supplier ---
  supplierId            String?                              // may be different from hotel
  supplierRef           String?                              // supplier's confirmation

  // --- Service Status ---
  serviceStatus         ServiceStatus   @default(REQUESTED)

  // --- Dates ---
  serviceDate           DateTime?       @db.Date
  serviceDateTo         DateTime?       @db.Date             // for multi-day extras

  notes                 String?
  createdAt             DateTime        @default(now())
  updatedAt             DateTime        @updatedAt
}

// ============================================================
// PAYMENTS
// ============================================================

model BookingPayment {
  id                    String        @id @default(cuid())
  bookingId             String
  booking               Booking       @relation(fields: [bookingId], references: [id], onDelete: Cascade)
  date                  DateTime      @db.Date
  amount                Decimal
  currencyId            String
  currency              Currency      @relation(fields: [currencyId], references: [id])
  exchangeRate          Decimal       @default(1)

  // --- Payer (who is paying — TO or guest) ---
  paidBy                String        @default("TOUR_OPERATOR")  // "TOUR_OPERATOR", "GUEST", "CORPORATE", "OTHER"
  tourOperatorId        String?                              // if paid by TO
  tourOperator          TourOperator? @relation(fields: [tourOperatorId], references: [id])
  payerName             String?                              // payer name (guest name or TO name)
  payerEmail            String?

  // --- Payment Details ---
  paymentMethod         String                               // "bank_transfer", "credit_card", "credit_account", "cash", "cheque", "to_credit"
  paymentReference      String?                              // transaction ID / reference
  receiptNumber         String?
  bankDetails           String?

  // --- Type ---
  isDeposit             Boolean       @default(false)
  isRefund              Boolean       @default(false)        // true = refund (negative)

  // --- TO Statement Link (if payment via TO statement) ---
  toStatementId         String?                              // linked TO statement (for TO payments)
  toStatement           TOStatement?  @relation(fields: [toStatementId], references: [id])

  // --- Status ---
  status                String        @default("cleared")    // "pending", "cleared", "bounced", "refunded"

  // --- Linked Finance (to Finance module) ---
  moveId                String?                              // link to accounting journal entry
  move                  Move?         @relation(fields: [moveId], references: [id])

  notes                 String?
  recordedById          String
  recordedBy            User          @relation(fields: [recordedById], references: [id])
  createdAt             DateTime      @default(now())
  updatedAt             DateTime      @updatedAt
}

// ============================================================
// AMENDMENTS / MODIFICATIONS
// ============================================================

model BookingAmendment {
  id                    String        @id @default(cuid())
  bookingId             String
  booking               Booking       @relation(fields: [bookingId], references: [id], onDelete: Cascade)
  amendmentRef          String        @unique                // AMD-2026-00001
  amendmentType         AmendmentType
  sequence              Int           @default(1)            // amendment number for this booking

  // --- Before / After ---
  fieldChanged          String                               // which field changed
  oldValue              String?                              // previous value (serialized)
  newValue              String?                              // new value (serialized)

  // --- Price Impact ---
  priceDifference       Decimal       @default(0)            // positive = surcharge, negative = refund
  amendmentFee          Decimal       @default(0)            // amendment processing fee
  penaltyApplied        Decimal       @default(0)            // penalty if outside free amendment window

  // --- Status ---
  status                String        @default("applied")    // "pending", "applied", "rejected", "reversed"

  // --- Supplier ---
  supplierConfirmed     Boolean       @default(false)
  supplierRef           String?                              // supplier's amendment reference

  reason                String?
  notes                 String?

  // --- Audit ---
  requestedById         String
  requestedBy           User          @relation(fields: [requestedById], references: [id])
  requestedAt           DateTime      @default(now())
  processedAt           DateTime?
}

// ============================================================
// CANCELLATION POLICY (contract-level or booking-level)
// ============================================================

model CancellationPolicy {
  id                    String               @id @default(cuid())
  name                  String                               // "Standard 30/14/7 day policy"
  policyType            CancellationPolicyType

  // --- Contract link (inherited from contract, can override per booking) ---
  contractId            String?
  contract              Contract?            @relation(fields: [contractId], references: [id])
  hotelId               String?
  hotel                 Hotel?               @relation(fields: [hotelId], references: [id])

  // --- Tiers (for TIERED policy type) ---
  tiers                 CancellationPolicyTier[]

  // --- Simple policies ---
  penaltyBasis          PenaltyBasis?
  penaltyValue          Decimal?                             // percentage, nights count, or fixed amount
  freeCancellationDays  Int?                                 // days before check-in for free cancellation

  // --- No-Show ---
  noShowPenaltyBasis    PenaltyBasis  @default(FIRST_NIGHT)
  noShowPenaltyValue    Decimal       @default(1)

  // --- Season-specific ---
  seasonId              String?                              // different policy per season
  season                ContractSeason? @relation(fields: [seasonId], references: [id])

  // --- Group-specific ---
  isGroupPolicy         Boolean       @default(false)
  minimumRooms          Int?                                 // applies to groups of X+ rooms

  active                Boolean       @default(true)
  companyId             String
  company               Company       @relation(fields: [companyId], references: [id])
  createdAt             DateTime      @default(now())
  updatedAt             DateTime      @updatedAt
}

model CancellationPolicyTier {
  id                    String             @id @default(cuid())
  policyId              String
  policy                CancellationPolicy @relation(fields: [policyId], references: [id], onDelete: Cascade)
  daysBeforeCheckIn     Int                                  // cancel X+ days before → this tier applies
  penaltyBasis          PenaltyBasis
  penaltyValue          Decimal                              // percentage, nights, or fixed amount
  description           String?                              // "30+ days: free cancellation"
  sortOrder             Int                @default(0)

  @@unique([policyId, daysBeforeCheckIn])
}

// ============================================================
// COMMUNICATION LOG
// ============================================================

model BookingCommunication {
  id                    String                 @id @default(cuid())
  bookingId             String
  booking               Booking                @relation(fields: [bookingId], references: [id], onDelete: Cascade)
  type                  CommunicationType
  channel               CommunicationChannel   @default(EMAIL)
  direction             CommunicationDirection
  subject               String?
  body                  String?                              // message content
  sender                String?
  recipient             String?
  recipientEmail        String?

  // --- Status ---
  status                String        @default("sent")       // "draft", "sent", "delivered", "read", "failed", "bounced"

  // --- Attachments ---
  attachments           String[]      @default([])           // file URLs

  // --- Linked document ---
  documentId            String?
  document              BookingDocument? @relation(fields: [documentId], references: [id])

  // --- Auto vs Manual ---
  isAutoGenerated       Boolean       @default(false)
  templateId            String?                              // email template used

  sentById              String?
  sentBy                User?         @relation(fields: [sentById], references: [id])
  sentAt                DateTime?
  receivedAt            DateTime?
  createdAt             DateTime      @default(now())
}

// ============================================================
// DEADLINES
// ============================================================

model BookingDeadline {
  id                    String          @id @default(cuid())
  bookingId             String
  booking               Booking         @relation(fields: [bookingId], references: [id], onDelete: Cascade)
  deadlineType          DeadlineType
  dueDate               DateTime        @db.Date
  status                DeadlineStatus  @default(UPCOMING)

  // --- Alert Config ---
  alertDaysBefore       Int[]           @default([7, 3, 1])  // send alerts X days before
  lastAlertSent         DateTime?
  escalationSent        Boolean         @default(false)

  // --- Resolution ---
  completedAt           DateTime?
  completedById         String?
  completedBy           User?           @relation(fields: [completedById], references: [id])
  notes                 String?

  // --- Extension ---
  originalDueDate       DateTime?       @db.Date             // if extended
  extendedById          String?
  extensionReason       String?

  createdAt             DateTime        @default(now())
  updatedAt             DateTime        @updatedAt

  @@index([dueDate, status])
  @@index([bookingId])
}

// ============================================================
// DOCUMENTS (generated files)
// ============================================================

model BookingDocument {
  id                    String        @id @default(cuid())
  bookingId             String
  booking               Booking       @relation(fields: [bookingId], references: [id], onDelete: Cascade)
  documentType          DocumentType
  documentNumber        String?                              // e.g. VCH-2026-00001, INV-2026-00001
  fileUrl               String?                              // stored file URL
  fileName              String?
  version               Int           @default(1)            // version for re-issued documents

  // --- Content snapshot ---
  generatedData         Json?                                // snapshot of data used to generate

  // --- Branding ---
  brandingTourOperatorId String?                             // TO-specific branding
  language              String        @default("en")         // document language

  generatedById         String
  generatedBy           User          @relation(fields: [generatedById], references: [id])
  generatedAt           DateTime      @default(now())

  // --- Communication link ---
  communications        BookingCommunication[]
}

// ============================================================
// AUDIT LOG (immutable)
// ============================================================

model BookingAuditLog {
  id                    String        @id @default(cuid())
  bookingId             String
  booking               Booking       @relation(fields: [bookingId], references: [id], onDelete: Cascade)
  action                String                               // "created", "confirmed", "amended", "cancelled", "payment_received", etc.
  description           String                               // human-readable description
  fieldChanges          Json?                                // { field: { old: X, new: Y } }
  userId                String
  user                  User          @relation(fields: [userId], references: [id])
  ipAddress             String?
  timestamp             DateTime      @default(now())

  @@index([bookingId, timestamp])
}

// ============================================================
// GROUP BOOKING EXTENSIONS
// ============================================================

model GroupBooking {
  id                    String        @id @default(cuid())
  bookingId             String        @unique
  booking               Booking       @relation(fields: [bookingId], references: [id], onDelete: Cascade)

  // --- Group Details ---
  groupName             String                               // "ABC Tours — Summer Group 2026"
  groupLeaderName       String?
  groupLeaderPhone      String?
  groupLeaderEmail      String?

  // --- Room Block ---
  totalRoomsBlocked     Int                                  // rooms originally blocked
  minimumGuarantee      Int?                                 // minimum rooms guaranteed
  cutoffDate            DateTime?     @db.Date               // date to release unbooked rooms
  attritionPercent      Decimal?                             // allowed attrition %

  // --- Complimentary Rooms ---
  compRoomRatio         String?                              // "1:20" (1 free per 20 paid)
  compRoomsGranted      Int           @default(0)
  guideRooms            Int           @default(0)            // guide/driver rooms at special rate
  guideRoomRate         Decimal?                             // rate for guide rooms

  // --- Deposit Schedule ---
  depositSchedule       GroupDepositSchedule[]

  // --- Rooming List ---
  roomingListDeadline   DateTime?     @db.Date
  roomingListSubmitted  Boolean       @default(false)
  roomingListSubmittedAt DateTime?

  // --- Materialization ---
  roomsActuallyUsed    Int            @default(0)           // actual rooms checked-in
  materializationPercent Decimal       @default(0)           // (actual / blocked) × 100

  // --- Sub-Groups ---
  subGroups             GroupSubBlock[]

  notes                 String?
  createdAt             DateTime      @default(now())
  updatedAt             DateTime      @updatedAt
}

model GroupDepositSchedule {
  id                    String        @id @default(cuid())
  groupBookingId        String
  groupBooking          GroupBooking  @relation(fields: [groupBookingId], references: [id], onDelete: Cascade)
  dueDate               DateTime      @db.Date
  percentageDue         Decimal                              // e.g. 30%
  amountDue             Decimal
  isPaid                Boolean       @default(false)
  paidDate              DateTime?     @db.Date
  notes                 String?
  sortOrder             Int           @default(0)
}

model GroupSubBlock {
  id                    String        @id @default(cuid())
  groupBookingId        String
  groupBooking          GroupBooking  @relation(fields: [groupBookingId], references: [id], onDelete: Cascade)
  name                  String                               // "Sub-Group A — UK delegates"
  roomsAllocated        Int
  checkIn               DateTime      @db.Date
  checkOut              DateTime      @db.Date
  contactName           String?
  contactEmail          String?
  notes                 String?

  createdAt             DateTime      @default(now())
  updatedAt             DateTime      @updatedAt
}

// ============================================================
// SERIES / RECURRING BOOKINGS
// ============================================================

model SeriesBooking {
  id                    String        @id @default(cuid())
  seriesCode            String        @unique                // SER-2026-00001
  name                  String                               // "Weekly ABC Tours — Hilton Dubai"
  hotelId               String
  hotel                 Hotel         @relation(fields: [hotelId], references: [id])
  tourOperatorId        String
  tourOperator          TourOperator  @relation(fields: [tourOperatorId], references: [id])

  // --- Template ---
  templateRoomTypeId    String
  templateMealBasisId   String
  templateRoomsPerWeek  Int
  templateNights        Int
  templateCheckInDay    String                               // "Saturday", "Monday", etc.

  // --- Date Range ---
  seriesFrom            DateTime      @db.Date               // series start date
  seriesTo              DateTime      @db.Date               // series end date
  frequency             String        @default("WEEKLY")     // WEEKLY, BIWEEKLY, MONTHLY

  // --- Generated Bookings ---
  bookings              Booking[]     @relation("SeriesBookings")
  totalDepartures       Int           @default(0)
  confirmedDepartures   Int           @default(0)

  // --- Pricing ---
  contractId            String
  contract              Contract      @relation(fields: [contractId], references: [id])

  active                Boolean       @default(true)
  notes                 String?
  companyId             String
  company               Company       @relation(fields: [companyId], references: [id])
  createdAt             DateTime      @default(now())
  updatedAt             DateTime      @updatedAt
}

// ============================================================
// CREDIT LIMITS
// ============================================================

model CreditLimit {
  id                    String        @id @default(cuid())
  tourOperatorId        String
  tourOperator          TourOperator  @relation(fields: [tourOperatorId], references: [id])

  // --- Limit ---
  creditLimit           Decimal                              // max outstanding balance
  currencyId            String
  currency              Currency      @relation(fields: [currencyId], references: [id])
  warningThreshold      Decimal       @default(80)           // alert at X% utilization

  // --- Current Utilization (computed, cached) ---
  currentUtilization    Decimal       @default(0)            // unpaid invoices + unconfirmed bookings value
  availableCredit       Decimal       @default(0)            // creditLimit - utilization

  // --- Credit Terms ---
  paymentTermDays       Int           @default(30)           // Net 30, Net 60, etc.
  requiresDeposit       Boolean       @default(false)
  depositPercent        Decimal?                             // e.g. 30%

  // --- Status ---
  isOnHold              Boolean       @default(false)        // manually frozen
  holdReason            String?
  holdDate              DateTime?

  // --- History ---
  lastPaymentDate       DateTime?
  lastPaymentAmount     Decimal?
  totalLifetimeBookings Decimal       @default(0)

  companyId             String
  company               Company       @relation(fields: [companyId], references: [id])
  updatedAt             DateTime      @updatedAt

  @@unique([tourOperatorId, currencyId])
}

// ============================================================
// TOUR OPERATOR PAYMENT AGREEMENT
// ============================================================

model TOPaymentAgreement {
  id                    String          @id @default(cuid())
  tourOperatorId        String
  tourOperator          TourOperator    @relation(fields: [tourOperatorId], references: [id])

  // --- Payment Basis ---
  paymentBasis          TOPaymentBasis  @default(CREDIT)         // how the TO pays
  billingCycle          TOBillingCycle  @default(PER_BOOKING)    // how often invoiced

  // --- Credit Terms (when paymentBasis = CREDIT) ---
  creditDays            Int             @default(30)             // Net 30, Net 60, etc.
  gracePeriodDays       Int             @default(0)              // extra grace before late penalty
  latePaymentPenalty    Decimal?                                 // % penalty per month on overdue
  earlyPaymentDiscount  Decimal?                                 // % discount for early payment
  earlyPaymentDays      Int?                                     // pay within X days for discount

  // --- Deposit (when paymentBasis = DEPOSIT_BALANCE) ---
  depositPercent        Decimal?                                 // e.g. 30%
  depositDueDays        Int?                                     // deposit due X days after booking
  balanceDueDays        Int?                                     // balance due X days before check-in

  // --- Prepay (when paymentBasis = PREPAY) ---
  prepayRequired        Boolean         @default(false)          // if true, confirmation only after payment
  prepayDeadlineDays    Int?                                     // pay within X days or auto-cancel

  // --- Billing Contact ---
  billingContactName    String?
  billingContactEmail   String?
  billingAddress        String?
  vatNumber             String?

  // --- Statement Settings ---
  statementDay          Int?                                     // day of month for monthly statements (1-28)
  statementEmail        String?                                  // email for statements
  statementCurrency     String?                                  // currency for consolidated statements
  includeBreakdown      Boolean         @default(true)           // include per-booking breakdown in statement

  // --- Commission (if TO earns commission instead of markup) ---
  commissionBased       Boolean         @default(false)
  commissionPercent     Decimal?                                 // TO takes X% commission, remits net
  commissionOn          String?                                  // "NET", "SELLING" — basis for commission

  // --- Status ---
  isActive              Boolean         @default(true)
  validFrom             DateTime        @db.Date
  validTo               DateTime?       @db.Date
  notes                 String?

  // --- Meta ---
  companyId             String
  company               Company         @relation(fields: [companyId], references: [id])
  createdAt             DateTime        @default(now())
  updatedAt             DateTime        @updatedAt

  @@unique([tourOperatorId, companyId])
}

// ============================================================
// TOUR OPERATOR STATEMENT (periodic billing)
// ============================================================

model TOStatement {
  id                    String          @id @default(cuid())
  statementRef          String          @unique                  // STM-2026-02-ABC-001
  tourOperatorId        String
  tourOperator          TourOperator    @relation(fields: [tourOperatorId], references: [id])

  // --- Period ---
  periodFrom            DateTime        @db.Date                 // statement covers from
  periodTo              DateTime        @db.Date                 // statement covers to
  issueDate             DateTime        @db.Date
  dueDate               DateTime        @db.Date                 // payment due date

  // --- Currency ---
  currencyId            String
  currency              Currency        @relation(fields: [currencyId], references: [id])

  // --- Amounts ---
  totalBookings         Int             @default(0)              // number of bookings in statement
  totalRoomNights       Int             @default(0)              // total room nights
  grossAmount           Decimal         @default(0)              // total before adjustments
  creditNoteAmount      Decimal         @default(0)              // credit notes / refunds in period
  adjustmentAmount      Decimal         @default(0)              // manual adjustments
  netAmount             Decimal         @default(0)              // grossAmount - creditNotes + adjustments
  paidAmount            Decimal         @default(0)              // amount received so far
  outstandingAmount     Decimal         @default(0)              // netAmount - paidAmount

  // --- Commission (if applicable) ---
  commissionAmount      Decimal         @default(0)              // TO's commission deducted
  remittanceAmount      Decimal         @default(0)              // net due after commission

  // --- Status ---
  status                StatementStatus @default(DRAFT)

  // --- Line Items ---
  lines                 TOStatementLine[]
  payments              TOStatementPayment[]

  // --- Linked Finance ---
  moveId                String?                                  // linked accounting journal entry
  move                  Move?           @relation(fields: [moveId], references: [id])

  // --- Notes ---
  notes                 String?
  disputeNotes          String?                                  // if status = DISPUTED

  // --- Audit ---
  issuedById            String?
  issuedBy              User?           @relation(fields: [issuedById], references: [id])
  issuedAt              DateTime?

  companyId             String
  company               Company         @relation(fields: [companyId], references: [id])
  createdAt             DateTime        @default(now())
  updatedAt             DateTime        @updatedAt

  @@index([tourOperatorId, periodFrom])
  @@index([status])
}

model TOStatementLine {
  id                    String          @id @default(cuid())
  statementId           String
  statement             TOStatement     @relation(fields: [statementId], references: [id], onDelete: Cascade)

  // --- Booking Reference ---
  bookingId             String
  booking               Booking         @relation(fields: [bookingId], references: [id])
  bookingRef            String                                   // snapshot of booking ref

  // --- Details ---
  hotelName             String                                   // snapshot
  guestName             String                                   // lead guest name
  checkIn               DateTime        @db.Date
  checkOut              DateTime        @db.Date
  nights                Int
  rooms                 Int
  roomType              String                                   // snapshot

  // --- Amounts ---
  sellingAmount         Decimal                                  // booking selling price
  creditNoteAmount      Decimal         @default(0)              // if credit note against this booking
  netAmount             Decimal                                  // selling - credit notes
  commissionAmount      Decimal         @default(0)              // TO commission on this booking

  // --- Status ---
  isCredit              Boolean         @default(false)          // true = credit note line
  lineType              String          @default("BOOKING")      // "BOOKING", "CREDIT_NOTE", "ADJUSTMENT", "PENALTY"

  sortOrder             Int             @default(0)
  createdAt             DateTime        @default(now())
}

model TOStatementPayment {
  id                    String          @id @default(cuid())
  statementId           String
  statement             TOStatement     @relation(fields: [statementId], references: [id], onDelete: Cascade)
  date                  DateTime        @db.Date
  amount                Decimal
  paymentMethod         String                                   // "bank_transfer", "cheque", etc.
  paymentReference      String?                                  // bank reference / cheque number
  notes                 String?
  recordedById          String
  recordedBy            User            @relation(fields: [recordedById], references: [id])
  createdAt             DateTime        @default(now())
}

// ============================================================
// OVERBOOKING / WALK MANAGEMENT
// ============================================================

model WalkRelocation {
  id                    String        @id @default(cuid())
  bookingId             String
  booking               Booking       @relation(fields: [bookingId], references: [id])
  originalHotelId       String
  originalHotel         Hotel         @relation("WalkFrom", fields: [originalHotelId], references: [id])
  alternativeHotelId    String
  alternativeHotel      Hotel         @relation("WalkTo", fields: [alternativeHotelId], references: [id])

  // --- Dates ---
  walkDate              DateTime      @db.Date               // date of relocation
  returnDate            DateTime?     @db.Date               // return to original hotel (if partial walk)

  // --- Cost ---
  alternativeRoomCost   Decimal                              // cost at alternative hotel
  transportCost         Decimal       @default(0)            // transport to alternative
  compensationCost      Decimal       @default(0)            // guest compensation
  totalWalkCost         Decimal                              // sum of all costs
  costDifference        Decimal                              // alternative cost - original cost

  // --- Details ---
  alternativeRoomType   String?
  reason                String?
  guestCompensation     String?                              // description of compensation offered
  guestAccepted         Boolean       @default(false)

  processedById         String
  processedBy           User          @relation(fields: [processedById], references: [id])
  createdAt             DateTime      @default(now())
}

// ============================================================
// NOTIFICATION TEMPLATES
// ============================================================

model NotificationTemplate {
  id                    String        @id @default(cuid())
  name                  String                               // "Booking Confirmation", "Payment Reminder"
  eventType             String                               // "booking_confirmed", "payment_due", "option_expiry", etc.
  channel               CommunicationChannel
  subject               String?                              // email subject (with {{variables}})
  body                  String                               // template body (with {{variables}})
  language              String        @default("en")
  isActive              Boolean       @default(true)

  companyId             String
  company               Company       @relation(fields: [companyId], references: [id])
  createdAt             DateTime      @default(now())
  updatedAt             DateTime      @updatedAt

  @@unique([eventType, language, companyId])
}
```

---

## UI Structure

### Sidebar Navigation (Reservations Module)

```
RESERVATIONS
├── Dashboard
│   ├── Today's Overview
│   ├── Deadlines & Alerts
│   └── Quick Search
│
├── Bookings
│   ├── All Bookings
│   ├── New Booking (Search)
│   ├── FIT Bookings
│   ├── Group Bookings
│   ├── Series Bookings
│   ├── On-Request / Waitlist
│   ├── Options (Tentative)
│   └── Cancelled Bookings
│
├── Today's Operations
│   ├── Arrivals Today
│   ├── Departures Today
│   ├── In-House Guests
│   ├── No-Shows
│   └── Check-In / Check-Out
│
├── Rooming Lists
│   ├── Pending Rooming Lists
│   ├── Submitted Rooming Lists
│   └── Deadline Calendar
│
├── Guests
│   ├── Guest Directory
│   ├── VIP Guests
│   └── Guest Merge
│
├── Extras & Transfers
│   ├── All Extras
│   ├── Transfers Today
│   └── Pending Confirmations
│
├── Payments & Billing
│   ├── Payment Tracker
│   ├── Outstanding Balances
│   ├── Deposit Due
│   ├── Refund Queue
│   ├── TO Statements
│   │   ├── All Statements
│   │   ├── Draft Statements
│   │   ├── Issued / Pending
│   │   ├── Overdue
│   │   └── Generate Statement
│   └── TO Payment Agreements
│
├── Documents
│   ├── Vouchers
│   ├── Confirmations
│   ├── Invoices / Pro-Forma
│   └── Credit Notes
│
├── Communications
│   ├── Outbox (Pending)
│   ├── Sent
│   ├── Inbox
│   └── Templates
│
├── Reports
│   ├── Materialization Report
│   ├── Occupancy Report
│   ├── Pickup / Pace Report
│   ├── Revenue Report
│   ├── Production Report (by TO)
│   ├── Cancellation Report
│   ├── No-Show Report
│   ├── Allotment Utilization
│   ├── Booking Lead Time
│   ├── Market Mix Report
│   ├── Credit Limit Report
│   ├── TO Account Statement
│   ├── TO Commission Report
│   └── Audit Trail Report
│
└── Configuration
    ├── Settings
    ├── Cancellation Policies
    ├── Notification Templates
    ├── Document Templates
    ├── Credit Limits
    ├── Booking Sources
    └── Overbooking Rules
```

### Booking Search / New Booking View

```
┌──────────────────────────────────────────────────────────────────┐
│ New Booking — Hotel Search & Rate Calculator                      │
│                                                                    │
│ ┌─── Search Parameters ───────────────────────────────────────┐   │
│ │ Booking Source: [● From Tour Operator] [○ Direct Guest]      │   │
│ │                                                              │   │
│ │ Tour Operator: [ABC Tours International  ▾]                  │   │
│ │ Market:        [UK Market ▾]  (auto-set from TO)            │   │
│ │ Payment Terms: Net 30 / Monthly Statement (auto from TO)    │   │
│ │                                                              │   │
│ │ Destination:   [Dubai ▾]      Hotel: [All Hotels ▾]         │   │
│ │ Check-in:      [15/06/2026]   Check-out: [22/06/2026]      │   │
│ │ Nights:        7 (auto)                                      │   │
│ │                                                              │   │
│ │ Rooms:                                                       │   │
│ │  Room 1: Adults [2▾]  Children [1▾]  Child Ages: [8▾]      │   │
│ │  Room 2: Adults [2▾]  Children [0▾]            [+ Add Room] │   │
│ │                                                              │   │
│ │ Meal Basis:    [All ▾]        Room Type: [All ▾]            │   │
│ │                                                              │   │
│ │                                    [🔍 Search Availability]  │   │
│ └──────────────────────────────────────────────────────────────┘   │
│                                                                    │
│ ══════════════════════════════════════════════════════════════════ │
│ RESULTS — Hilton Dubai Marina ★★★★★                               │
│ Contract: CTR-HLT-DXB-2026-S1 | Season: HIGH                     │
│ Rate Basis: Per Person Per Night | Currency: USD                   │
│                                                                    │
│ ⚠ STOP SALE: Standard Room — 18 Jun to 20 Jun                    │
│   [Continue Anyway (override)] [Adjust Dates]                      │
│                                                                    │
│ ┌─ Room 1: 2 Adults + 1 Child (age 8) ─────────────────────────┐ │
│ │ ┌───────────┬──────┬─────────┬─────────┬─────────┬─────────┐ │ │
│ │ │ Room Type │ Avail│ BB      │ HB      │ FB      │ AI      │ │ │
│ │ ├───────────┼──────┼─────────┼─────────┼─────────┼─────────┤ │ │
│ │ │ Standard  │ 5/10 │ $1,085  │ $1,344  │ $1,540  │ $1,869  │ │ │
│ │ │           │  🟢  │ (2×$105 │ (2×$127 │ (2×$143 │ (2×$170 │ │ │
│ │ │           │      │  +1×$35)│  +1×$50)│  +1×$62)│  +1×$82)│ │ │
│ │ │           │      │  ×7 nts │  ×7 nts │  ×7 nts │  ×7 nts │ │ │
│ │ ├───────────┼──────┼─────────┼─────────┼─────────┼─────────┤ │ │
│ │ │ Superior  │ 3/5  │ $1,260  │ $1,519  │ $1,715  │ $2,044  │ │ │
│ │ │ (+$25)    │  🟡  │         │         │         │         │ │ │
│ │ ├───────────┼──────┼─────────┼─────────┼─────────┼─────────┤ │ │
│ │ │ Deluxe SV │ 2/3  │ $1,435  │ $1,694  │ $1,890  │ $2,219  │ │ │
│ │ │ (+$50)    │  🟡  │         │         │         │         │ │ │
│ │ ├───────────┼──────┼─────────┼─────────┼─────────┼─────────┤ │ │
│ │ │ Jr Suite  │ 2/2  │ $1,715  │ $1,974  │ $2,170  │ $2,499  │ │ │
│ │ │ (+$90)    │  🟢  │         │         │         │         │ │ │
│ │ └───────────┴──────┴─────────┴─────────┴─────────┴─────────┘ │ │
│ │ Eligible Offers:                                              │ │
│ │  ✓ EBD 15% (book 60+ days before) → saves $162 on STD BB    │ │
│ │  ✓ Stay 7 Pay 6 → saves $155 on STD BB                      │ │
│ │  ✓ EBD + Long Stay combinable → saves $285 on STD BB        │ │
│ │                                                               │ │
│ │ [Select: STD BB ●]  [Select: STD HB ○]  [Select: SUP BB ○]  │ │
│ └───────────────────────────────────────────────────────────────┘ │
│                                                                    │
│ ┌─ Room 2: 2 Adults ────────────────────────────────────────────┐ │
│ │ (same rate grid for 2-adult occupancy)                        │ │
│ │ [Select: STD BB ●]                                            │ │
│ └───────────────────────────────────────────────────────────────┘ │
│                                                                    │
│ ┌─ Booking Summary ─────────────────────────────────────────────┐ │
│ │ Room 1: STD BB — 2AD+1CH — 7 nights — $1,085.00             │ │
│ │ Room 2: STD BB — 2AD     — 7 nights — $735.00               │ │
│ │                                                               │ │
│ │ Subtotal (Net):                $1,820.00                      │ │
│ │ EBD 15%:                       -$273.00                       │ │
│ │ Stay 7 Pay 6:                  -$200.00 (applied after EBD)  │ │
│ │ Net After Offers:              $1,347.00                      │ │
│ │ Markup (TO: 15%):              +$202.05                       │ │
│ │ Selling Price:                 $1,549.05                      │ │
│ │ Tax:                           +$0.00                         │ │
│ │ Grand Total:                   $1,549.05                      │ │
│ │                                                               │ │
│ │ Billing: [● TO Account]  [○ Direct Guest]  [○ Split]          │ │
│ │ Payment Terms: Net 30 (Credit) — per monthly statement       │ │
│ │ Credit Available: $45,000.00 ✅                               │ │
│ │ Deposit Required: N/A (credit terms)                          │ │
│ │                                                               │ │
│ │          [Save as Quote]  [Hold as Option]  [Book & Confirm]  │ │
│ └───────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────┘
```

### Booking Form View (Existing Booking)

```
┌──────────────────────────────────────────────────────────────────┐
│ Status: [● Draft] — [○ Option] — [○ Confirmed] — [○ Checked In]│
│                                           — [○ Checked Out]      │
│ [Confirm] [Amend] [Cancel] [Generate Voucher]                    │
│ [📨 Send to Hotel (no price)] [Send Amendment] [Resend]          │
├──────────────────────────────────────────────────────────────────┤
│                                                                    │
│  Booking: BK-2026-00142          Supplier Ref: HLT-CF-98765      │
│  Agent Ref: ABC-UK-2026-0043    Status: CONFIRMED ✅              │
│                                                                    │
│  ┌─── Booking Details ────────┐  ┌─── Financial Summary ──────┐  │
│  │ Hotel: Hilton Dubai Marina │  │ Net Cost:     $1,347.00    │  │
│  │ Contract: CTR-HLT-DXB-S1  │  │ Markup 15%:   $202.05     │  │
│  │ TO: ABC Tours International│  │ Selling:      $1,549.05    │  │
│  │ Market: UK                 │  │ Extras:       $85.00       │  │
│  │ Source: B2B Portal         │  │ Grand Total:  $1,634.05    │  │
│  │ Check-in: 15 Jun 2026 Sun │  │ ─────────────────────────  │  │
│  │ Check-out: 22 Jun 2026 Sun│  │ Billing: TO Account ✅     │  │
│  │ Nights: 7                  │  │ Terms: Net 30 (Credit)     │  │
│  │ Rooms: 2 | Pax: 4AD + 1CH │  │ Cycle: Monthly Statement   │  │
│  │                            │  │ Paid:         $0.00        │  │
│  │                            │  │ Outstanding:  $1,634.05    │  │
│  │                            │  │ Due: Feb 2026 Statement    │  │
│  └────────────────────────────┘  └─────────────────────────────┘  │
│                                                                    │
│  ┌─── Flight Details ──────────────────────────────────────────┐  │
│  │ ✈ Arrival:   EK203 — 15 Jun 2026, 14:30 — DXB Terminal 3  │  │
│  │ ✈ Departure: EK204 — 22 Jun 2026, 22:15 — DXB Terminal 3  │  │
│  │ [Edit Flights]  (feeds into Traffic module)                 │  │
│  └─────────────────────────────────────────────────────────────┘  │
│                                                                    │
├──────────────────────────────────────────────────────────────────┤
│ [Rooms] [Guests] [Extras] [Payments] [Documents] [Communications]│
│ [Special Requests] [Deadlines] [Amendments] [Audit Log]          │
├──────────────────────────────────────────────────────────────────┤
│                                                                    │
│ ROOMS TAB:                                                        │
│ ┌─────┬──────────┬──────┬──────┬──────┬──────────┬─────────────┐ │
│ │ Rm# │ Room Type│ Meal │ Occ  │ Nts  │ Net/Night│ Total       │ │
│ ├─────┼──────────┼──────┼──────┼──────┼──────────┼─────────────┤ │
│ │ 1   │ Standard │ BB   │2AD+1C│ 7    │ $155.00  │ $1,085.00  │ │
│ │     │          │      │ (8yr)│      │(2×$105+  │ EBD: -$163  │ │
│ │     │          │      │      │      │ 1×$35)   │ Long:-$120  │ │
│ │     │ Status: ✅ Confirmed | Allotment: ALLOTMENT (5 avail) │ │
│ ├─────┼──────────┼──────┼──────┼──────┼──────────┼─────────────┤ │
│ │ 2   │ Standard │ BB   │ 2AD  │ 7    │ $105.00  │ $735.00    │ │
│ │     │          │      │      │      │(2×$105/n)│ EBD: -$110  │ │
│ │     │ Status: ✅ Confirmed | Allotment: ALLOTMENT (4 avail) │ │
│ └─────┴──────────┴──────┴──────┴──────┴──────────┴─────────────┘ │
│                                                                    │
│ GUESTS TAB:                                                        │
│ ┌─────┬──────┬───────────────────┬──────┬────────┬──────┬──────┐ │
│ │ Rm# │ Type │ Name              │ Age  │Passport│ Natnl│ VIP  │ │
│ ├─────┼──────┼───────────────────┼──────┼────────┼──────┼──────┤ │
│ │ 1   │ Lead │ Mr John Smith     │ 42   │AB12345 │ UK   │ Gold │ │
│ │ 1   │ Adult│ Mrs Jane Smith    │ 39   │AB12346 │ UK   │ —    │ │
│ │ 1   │ Child│ Tom Smith         │ 8    │AB12347 │ UK   │ —    │ │
│ │ 2   │ Adult│ Mr David Brown    │ 55   │CD78901 │ UK   │ —    │ │
│ │ 2   │ Adult│ Mrs Sarah Brown   │ 52   │CD78902 │ UK   │ —    │ │
│ │ [+ Add Guest] [Import from File] [Assign to Rooms]           │ │
│ └──────────────────────────────────────────────────────────────┘ │
│                                                                    │
│ ── Messages / Activities / Audit Log ──                           │
└──────────────────────────────────────────────────────────────────┘
```

### Materialization Report View

```
┌──────────────────────────────────────────────────────────────────┐
│ MATERIALIZATION REPORT                                            │
│ Hotel: [Hilton Dubai Marina ▾]  Period: [Jun 2026 ▾]             │
│ Contract: [CTR-HLT-DXB-2026-S1 ▾]  [Export PDF] [Export Excel]  │
├──────────────────────────────────────────────────────────────────┤
│                                                                    │
│ Overall: 156 rooms blocked | 127 rooms used | 81.4% materialized │
│                                                                    │
│ ┌─── By Room Type ──────────────────────────────────────────────┐ │
│ │ ┌───────────┬────────┬────────┬──────┬───────┬──────────────┐ │ │
│ │ │ Room Type │Alloc'd │ Booked │ Used │ Avail │ Materialzn % │ │ │
│ │ ├───────────┼────────┼────────┼──────┼───────┼──────────────┤ │ │
│ │ │ Standard  │ 300    │ 275    │ 258  │ 25    │ 86.0% ██████ │ │ │
│ │ │ Superior  │ 150    │ 128    │ 119  │ 22    │ 79.3% █████▒ │ │ │
│ │ │ Deluxe SV │ 90     │ 82     │ 78   │ 8     │ 86.7% ██████ │ │ │
│ │ │ Jr Suite  │ 60     │ 48     │ 42   │ 12    │ 70.0% █████  │ │ │
│ │ │ Suite     │ 60     │ 39     │ 35   │ 21    │ 58.3% ████   │ │ │
│ │ ├───────────┼────────┼────────┼──────┼───────┼──────────────┤ │ │
│ │ │ TOTAL     │ 660    │ 572    │ 532  │ 88    │ 80.6%        │ │ │
│ │ └───────────┴────────┴────────┴──────┴───────┴──────────────┘ │ │
│ └────────────────────────────────────────────────────────────────┘ │
│                                                                    │
│ ┌─── Daily Breakdown (Standard Room) ───────────────────────────┐ │
│ │ ┌──────┬────────┬────────┬──────┬──────┬──────────┬────────┐  │ │
│ │ │ Date │ Alloc  │ Booked │ C/In │ C/Out│ In-House │ Util%  │  │ │
│ │ ├──────┼────────┼────────┼──────┼──────┼──────────┼────────┤  │ │
│ │ │ 01/06│ 10     │ 9      │ 3    │ 1    │ 8        │ 80%    │  │ │
│ │ │ 02/06│ 10     │ 10     │ 2    │ 0    │ 10       │ 100% 🔴│  │ │
│ │ │ 03/06│ 10     │ 8      │ 0    │ 2    │ 8        │ 80%    │  │ │
│ │ │ 04/06│ 10     │ 7      │ 1    │ 2    │ 7        │ 70%    │  │ │
│ │ │ ...  │ ...    │ ...    │ ...  │ ...  │ ...      │ ...    │  │ │
│ │ └──────┴────────┴────────┴──────┴──────┴──────────┴────────┘  │ │
│ └────────────────────────────────────────────────────────────────┘ │
│                                                                    │
│ ┌─── By Tour Operator ──────────────────────────────────────────┐ │
│ │ ┌──────────────────┬────────┬────────┬──────┬──────────────┐  │ │
│ │ │ Tour Operator    │ Rooms  │ Used   │ Rev  │ Materialzn % │  │ │
│ │ ├──────────────────┼────────┼────────┼──────┼──────────────┤  │ │
│ │ │ ABC Tours Intl   │ 85     │ 78     │$12.4K│ 91.8% ██████ │  │ │
│ │ │ XYZ Travel       │ 62     │ 51     │$8.2K │ 82.3% █████▒ │  │ │
│ │ │ Global Voyages   │ 43     │ 32     │$5.8K │ 74.4% █████  │  │ │
│ │ │ Sunway Holidays  │ 38     │ 29     │$4.1K │ 76.3% █████  │  │ │
│ │ └──────────────────┴────────┴────────┴──────┴──────────────┘  │ │
│ └────────────────────────────────────────────────────────────────┘ │
│                                                                    │
│ ┌─── Group Materialization ─────────────────────────────────────┐ │
│ │ ┌──────────────────┬────────┬────────┬──────┬──────┬───────┐  │ │
│ │ │ Group Name       │Blocked │ Named  │ Used │ NoSho│ Matrz%│  │ │
│ │ ├──────────────────┼────────┼────────┼──────┼──────┼───────┤  │ │
│ │ │ UK Summer Group  │ 40     │ 38     │ 36   │ 2    │ 90.0% │  │ │
│ │ │ CIS June Series  │ 25     │ 20     │ 18   │ 2    │ 72.0% │  │ │
│ │ └──────────────────┴────────┴────────┴──────┴──────┴───────┘  │ │
│ └────────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────┘
```

### Dashboard View

```
┌──────────────────────────────────────────────────────────────────┐
│ RESERVATIONS DASHBOARD — 22 Feb 2026                              │
├──────────────────────────────────────────────────────────────────┤
│                                                                    │
│ ┌─ TODAY'S OPERATIONS ──────────────────────────────────────────┐ │
│ │ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐         │ │
│ │ │ ARRIVALS │ │DEPARTURES│ │ IN-HOUSE │ │ NO-SHOWS │         │ │
│ │ │    12    │ │     8    │ │    156   │ │     1    │         │ │
│ │ │ 3 pending│ │ 2 late   │ │ 42 hotels│ │ ⚠ action │         │ │
│ │ └──────────┘ └──────────┘ └──────────┘ └──────────┘         │ │
│ └────────────────────────────────────────────────────────────────┘ │
│                                                                    │
│ ┌─ URGENT DEADLINES ───────────────────────────────────────────┐ │
│ │ 🔴 3 options expiring TODAY                                   │ │
│ │ 🔴 2 deposits overdue                                         │ │
│ │ 🟡 5 rooming lists due within 3 days                          │ │
│ │ 🟡 8 balance payments due within 7 days                       │ │
│ │ 🟢 12 allotment releases in 14 days                           │ │
│ └────────────────────────────────────────────────────────────────┘ │
│                                                                    │
│ ┌─ BOOKINGS SUMMARY ──────┐  ┌─ REVENUE THIS MONTH ───────────┐ │
│ │ Total Active: 342       │  │ Total:     $485,200             │ │
│ │ Confirmed:    289       │  │ Net Cost:  $398,400             │ │
│ │ On-Request:   18        │  │ Margin:    $86,800 (17.9%)      │ │
│ │ Options:      23        │  │ Outstanding: $124,500           │ │
│ │ Waitlisted:   12        │  │ ┌─ [~sparkline graph] ─┐       │ │
│ │ New Today:    7         │  │ └──────────────────────┘       │ │
│ └──────────────────────────┘  └─────────────────────────────────┘ │
│                                                                    │
│ ┌─ ON-REQUEST AWAITING RESPONSE ────────────────────────────────┐ │
│ │ BK-2026-00189 | Marriott JBR | 3 rooms | sent 2 days ago    │ │
│ │ BK-2026-00192 | Atlantis     | 1 suite | sent 1 day ago     │ │
│ │ BK-2026-00198 | Kempinski    | 5 rooms | sent today         │ │
│ └────────────────────────────────────────────────────────────────┘ │
│                                                                    │
│ ┌─ RECENT BOOKINGS ────────────────────────────────────────────┐ │
│ │ ┌──────┬───────────┬────────┬──────┬──────┬────────┬───────┐ │ │
│ │ │ Ref  │ Hotel     │ TO     │ In   │ Nts  │ Total  │Status │ │ │
│ │ ├──────┼───────────┼────────┼──────┼──────┼────────┼───────┤ │ │
│ │ │ 0198 │ Kempinski │ ABC    │ 15/06│ 7    │ $2,450 │ RQ    │ │ │
│ │ │ 0197 │ Hilton    │ XYZ    │ 20/06│ 5    │ $1,890 │ CF    │ │ │
│ │ │ 0196 │ Marriott  │ Global │ 01/07│ 10   │ $5,200 │ CF    │ │ │
│ │ │ 0195 │ Atlantis  │ ABC    │ 15/07│ 4    │ $3,100 │ OP    │ │ │
│ │ └──────┴───────────┴────────┴──────┴──────┴────────┴───────┘ │ │
│ └────────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────┘
```

---

## Business Logic & Workflows

### Booking Lifecycle

```
DRAFT ──[Submit]──→ QUOTATION ──[Hold]──→ OPTION (with expiry date)
  │                     │                     │
  │                     └──[Book]──→ ┌────────┤
  │                                  │        │
  └──[Book Direct]──→ ──────────────┘        └──[Confirm]──→ ┐
                                                              │
   ┌─── From Allotment (instant) ────────────────────────────┘
   │
   ├──→ CONFIRMED ──[Check-in]──→ CHECKED_IN ──[Check-out]──→ CHECKED_OUT ──→ FINALIZED
   │        │              │              │
   │        │              │              └──[No-Show]──→ NO_SHOW ──→ FINALIZED
   │        │              │
   │        │              └──[Amend]──→ AMENDED ──→ CONFIRMED
   │        │
   │        └──[Cancel]──→ CANCELLED / CANCELLED_PENALTY
   │
   └─── On Request ──→ ON_REQUEST ──[Hotel Confirms]──→ CONFIRMED
                            │
                            ├──[Hotel Rejects]──→ REJECTED
                            │
                            └──[Timeout]──→ EXPIRED

   OPTION ──[Expiry Date Passes]──→ EXPIRED

   WAITLISTED ──[Availability Opens]──→ CONFIRMED
       └──[Cancel]──→ CANCELLED
```

### Booking Rate Calculation (from Contract)

```
ON New Booking Search:
  INPUT: hotelId, tourOperatorId, checkIn, checkOut, rooms[{adults, children, childAges}]

  1. FIND applicable contract:
     a. Match hotel + market (from TO's assigned market)
     b. Contract status must be PUBLISHED
     c. Contract validity must cover check-in to check-out dates
     d. If multiple contracts match, use market-specific first, then generic
     e. If TO has ContractTourOperator assignment, use that contract

  2. RESOLVE seasons for date range:
     - Map each night to its ContractSeason
     - Handle multi-season stays (split calculation)

  3. FOR each room in booking:
    FOR each available roomType in contract:
      FOR each mealBasis in contract:

        a. LOOKUP CalculatedRate for (roomType, mealBasis, occupancy, season)
        b. If multi-season: compute weighted rate across seasons
        c. Accumulate: costPerNight × nights = totalCost

        d. CHECK stop sales:
           - If stop sale active for any date → flag WARNING
           - Display alert: "Stop sale on [dates] for [roomType]"
           - Offer options: [Continue with Override] [Adjust Dates] [Skip Room Type]

        e. CHECK allotment:
           - Query Allocation for each night
           - Show availability count and color code (🟢🟡🔴)
           - If ON_REQUEST: flag as on-request booking

        f. CHECK eligible special offers:
           - Evaluate each SpecialOffer against booking parameters
           - Booking date, stay dates, min stay, lead days, age conditions
           - Calculate discount amount for each eligible offer
           - Apply combinability rules (best single or combined stack)
           - Show offer breakdown

        g. CHECK special meals:
           - If stay includes gala dinner dates → add supplement

        h. APPLY markup:
           - Find MarkupRule for (contract, TO, market)
           - sellingPrice = netCost × (1 + markup%)

  4. CHECK credit limit:
     - Compare grandTotal against TO's availableCredit
     - If insufficient → warning with available balance
     - Block booking or allow with manager override

  5. RETURN results matrix:
     {roomType, mealBasis, availability, netRate, offers, sellingRate, warnings}
```

### Allotment Deduction

```
ON Booking Confirmation:
  FOR each room in booking:
    FOR each night (checkIn to checkOut - 1):
      1. Find Allocation for (hotel, roomType, contract, date)
      2. IF allocationBasis == FREESALE:
           → No deduction needed, auto-confirm
      3. IF allocationBasis == ALLOCATION or COMMITMENT:
           → Check availableRooms > 0
           → IF available: bookedRooms += 1, availableRooms -= 1
           → IF not available: mark room as ON_REQUEST
      4. IF allocationBasis == ON_REQUEST:
           → Send request to hotel, booking status = ON_REQUEST
      5. Check release period:
           → IF date - today < releaseDays: warn "Release period approaching"

ON Booking Cancellation:
  FOR each room in cancelled booking:
    FOR each night:
      → IF allotment was deducted: bookedRooms -= 1, availableRooms += 1
      → Only restore if within release period (not yet released)

ON Booking Amendment (date/room change):
  → Release old allotment (as per cancellation)
  → Deduct new allotment (as per confirmation)
```

### Stop Sale Enforcement

```
ON Booking Search / Creation:
  FOR each date in stay range:
    FOR each roomType requested:
      IF StopSale exists WHERE:
        hotelId = booking.hotelId
        AND dateFrom <= date <= dateTo
        AND active = true
        AND (scope = ALL
             OR (scope = ROOM_TYPE AND roomType in stopSale.roomTypes)
             OR (scope = MEAL_BASIS AND meal in stopSale.mealBasis))
      THEN:
        → Display ALERT to reservation agent:
          "⚠ STOP SALE ACTIVE: [roomType] from [dateFrom] to [dateTo]
           Reason: [reason]"
        → Present options:
          [1] OVERRIDE — continue booking (requires reason, logged in audit)
          [2] ADJUST DATES — modify check-in/check-out to avoid stop sale
          [3] DIFFERENT ROOM — select alternative room type
          [4] CANCEL — abandon this booking
        → If OVERRIDE: log in BookingAuditLog with override reason
        → Agent must have permission: "reservation.stop_sale.override"
```

### Amendment Workflow

```
ON Booking Amendment Request:
  1. VALIDATE amendment is allowed:
     - Booking status must be CONFIRMED or OPTION
     - Check amendment deadline (if configured)
     - Check if free amendment window or penalty applies

  2. CALCULATE price impact:
     - Re-run rate calculation with new parameters
     - priceDifference = newTotal - oldTotal
     - Check amendment fee from cancellation policy

  3. IF allotment-based booking:
     - Release old allotment dates/rooms
     - Reserve new allotment dates/rooms
     - If new dates not available → reject or mark on-request

  4. IF on-request amendment:
     - Send amendment request to hotel
     - Status = AMENDED (pending supplier confirmation)
     - On supplier confirm → apply amendment
     - On supplier reject → revert to original

  5. APPLY amendment:
     - Update booking fields
     - Log in BookingAmendment (before/after)
     - Log in BookingAuditLog
     - Recalculate totals
     - Generate updated confirmation document
     - Send updated confirmation to hotel (if required)
     - Invoice price difference or issue credit note
```

### Send Reservation to Hotel (Price-Excluded)

The system sends booking details to the hotel directly from the reservation window. This is a **cross-module function** that pulls data from Reservations, Contracting, and Communications.

**Key rule: ALL pricing information is excluded.** The hotel receives guest details, room requirements, dates, meals, special requests, and flight details — never the selling price, net cost, markup, or any financial data.

```
ON "Send to Hotel" Action (from reservation form):
  INPUT: bookingId

  CROSS-MODULE DATA GATHERING:
  ┌─────────────────────────────────────────────────────────────┐
  │ FROM RESERVATIONS MODULE:                                    │
  │  - Booking reference (bookingRef)                            │
  │  - Agent reference (agentRef)                                │
  │  - Check-in / Check-out dates                                │
  │  - Number of nights                                          │
  │  - Rooms: room type, meal basis, occupancy per room          │
  │  - Guests: names, nationalities, passport details per room   │
  │  - Flight details (arrival & departure)                      │
  │  - Special requests per room and per booking                 │
  │  - Booking status                                            │
  │  - Cancellation policy reference                             │
  │                                                              │
  │ FROM CONTRACTING MODULE:                                     │
  │  - Hotel name, address, phone, email                         │
  │  - Hotel.reservationEmail (primary recipient)                │
  │  - Hotel.contactPerson (attention to)                        │
  │  - Contract reference (code only, no rates)                  │
  │  - Tour Operator name (who the booking is from)              │
  │                                                              │
  │ EXCLUDED (never sent to hotel):                              │
  │  ✗ Net cost / cost per night                                 │
  │  ✗ Selling price / selling per night                         │
  │  ✗ Markup amount / markup percentage                         │
  │  ✗ Discount amounts / offer discount values                  │
  │  ✗ Commission / margin                                       │
  │  ✗ Any financial totals                                      │
  │  ✗ Payment status / amounts paid                             │
  │  ✗ Credit limit information                                  │
  │  ✗ Tour operator's financial terms                           │
  └─────────────────────────────────────────────────────────────┘

  WORKFLOW:
  1. GENERATE Hotel Reservation Request document (PDF + email body):
     - Company letterhead / branding
     - "RESERVATION REQUEST" header
     - Booking reference + agent reference
     - Hotel name & address
     - Check-in / check-out / nights
     - Room-by-room breakdown:
       Room 1: [Room Type] — [Meal Basis] — [Adults]AD + [Children]CH (ages)
               Guest: Mr John Smith, Mrs Jane Smith, Tom Smith (8 yrs)
               Passport: AB12345, AB12346, AB12347
               Special Requests: High floor, King bed, cot
     - Flight Information:
       Arrival: EK203 — 15 Jun 2026 — 14:30 — DXB Terminal 3
       Departure: EK204 — 22 Jun 2026 — 22:15 — DXB Terminal 3
     - Special requests (booking-level)
     - Cancellation policy text (no penalty amounts, just deadline info)
     - Sender details (company name, contact, signature)

  2. SEND via email to Hotel.reservationEmail:
     - CC: Hotel.contactPerson email (if different)
     - CC: booking agent (optional, configurable)
     - Attach: PDF version of the reservation request

  3. LOG in BookingCommunication:
     - type = HOTEL_RESERVATION_SEND
     - channel = EMAIL
     - direction = OUTBOUND
     - recipient = Hotel.reservationEmail
     - attachments = [PDF URL]
     - status = "sent"

  4. LOG in BookingDocument:
     - documentType = HOTEL_RESERVATION_REQUEST
     - generatedData = snapshot of all data sent (for audit)

  5. UPDATE BookingAuditLog:
     - action = "reservation_sent_to_hotel"
     - description = "Reservation sent to [Hotel Name] at [email]"

  6. AWAIT hotel response:
     - If hotel replies with confirmation number → agent updates supplierRef
     - If hotel replies with rejection → agent updates status to REJECTED
     - All hotel replies logged as INBOUND communications

  AVAILABLE IN STATUSES: DRAFT, OPTION, ON_REQUEST, CONFIRMED
  (Can re-send on amendment — generates new version with "[AMENDED]" prefix)
```

**Hotel Reservation Request Document Template:**

```
┌─────────────────────────────────────────────────────────────────┐
│              RESERVATION REQUEST                                 │
│         [Company Logo / Letterhead]                              │
│                                                                   │
│ Date: 22 Feb 2026                                                │
│ Our Ref: BK-2026-00142         Agent Ref: ABC-UK-2026-0043      │
│ Tour Operator: ABC Tours International                           │
│                                                                   │
│ ─────────────────────────────────────────────────────────────── │
│ TO: Hilton Dubai Marina                                          │
│ Attn: Reservations Department                                    │
│ Email: reservations@hilton-dubai-marina.com                      │
│ ─────────────────────────────────────────────────────────────── │
│                                                                   │
│ BOOKING DETAILS                                                  │
│ Check-in:  Sunday, 15 June 2026                                 │
│ Check-out: Sunday, 22 June 2026                                 │
│ Duration:  7 nights                                              │
│                                                                   │
│ ROOM REQUIREMENTS                                                │
│ ┌────┬──────────────┬──────┬──────────────────────────────────┐ │
│ │ Rm │ Room Type    │ Meal │ Guests                           │ │
│ ├────┼──────────────┼──────┼──────────────────────────────────┤ │
│ │ 1  │ Standard Dbl │ BB   │ Mr John Smith (UK, PP: AB12345)  │ │
│ │    │              │      │ Mrs Jane Smith (UK, PP: AB12346) │ │
│ │    │              │      │ Tom Smith, 8 yrs (UK, PP:AB12347)│ │
│ ├────┼──────────────┼──────┼──────────────────────────────────┤ │
│ │ 2  │ Standard Dbl │ BB   │ Mr David Brown (UK, PP: CD78901) │ │
│ │    │              │      │ Mrs Sarah Brown (UK, PP: CD78902)│ │
│ └────┴──────────────┴──────┴──────────────────────────────────┘ │
│                                                                   │
│ FLIGHT INFORMATION                                               │
│ Arrival:   EK203 — 15 Jun 2026 — 14:30 — DXB Terminal 3       │
│ Departure: EK204 — 22 Jun 2026 — 22:15 — DXB Terminal 3       │
│                                                                   │
│ SPECIAL REQUESTS                                                 │
│ - Room 1: High floor preferred, King bed, baby cot required     │
│ - Room 2: Twin beds, quiet room away from elevator              │
│ - General: Early check-in requested if available                │
│                                                                   │
│ Please confirm this reservation at your earliest convenience.    │
│ Kindly reply with your confirmation number.                      │
│                                                                   │
│ ─────────────────────────────────────────────────────────────── │
│ [Company Name]                                                   │
│ [Contact Person] | [Email] | [Phone]                            │
│                                                                   │
│ ** NO PRICING INFORMATION IS INCLUDED IN THIS DOCUMENT **        │
└─────────────────────────────────────────────────────────────────┘
```

### Flight Details & Traffic Module Integration

Flight details are captured at two levels and feed into the future Traffic module for arrival/departure management.

```
FLIGHT DATA HIERARCHY:
  Level 1: BOOKING-LEVEL (default for all guests in the booking)
    → booking.arrivalFlightNumber, arrivalFlightDate, arrivalFlightTime, arrivalAirport
    → booking.departureFlightNumber, departureFlightDate, departureFlightTime, departureAirport

  Level 2: GUEST-LEVEL (override when guests arrive on different flights)
    → bookingGuest.arrivalFlightNumber, arrivalFlightDate, arrivalFlightTime, arrivalAirport
    → bookingGuest.departureFlightNumber, departureFlightDate, departureFlightTime, departureAirport

  RESOLUTION: If guest has own flight → use guest flight. Else → use booking flight.

TRAFFIC MODULE INTEGRATION (future):
  The Reservations module exposes flight data that the Traffic module will consume:

  1. ARRIVAL MANIFEST:
     - All bookings arriving on a given date
     - Grouped by flight number → list of guests per flight
     - Used for: airport transfer scheduling, meet & greet coordination
     - API: GET /api/reservations/reports/arrivals?date=2026-06-15&includeFlights=true

  2. DEPARTURE MANIFEST:
     - All bookings departing on a given date
     - Grouped by flight number → list of guests per flight
     - Used for: departure transfer scheduling, luggage collection timing
     - API: GET /api/reservations/reports/departures?date=2026-06-22&includeFlights=true

  3. TRANSFER AUTO-LINKING:
     - When flight details are entered on a booking, system can auto-suggest
       transfer creation (BookingExtra with extraType=TRANSFER)
     - Arrival flight → suggest AIRPORT_ARRIVAL transfer
     - Departure flight → suggest AIRPORT_DEPARTURE transfer
     - Pre-fill: pickupLocation, flightNumber, flightTime, passengers count

  4. FLIGHT CHANGE CASCADING:
     - When flight details are amended on a booking:
       → Auto-update linked transfer extras (pickupDateTime, flightNumber)
       → Notify transfer supplier if transfer already confirmed
       → Log in BookingAmendment and BookingAuditLog

  5. DATA EXPOSED FOR TRAFFIC MODULE:
     {
       bookingRef, hotelName, hotelId,
       arrivalFlight: { flightNumber, date, time, airport, terminal },
       departureFlight: { flightNumber, date, time, airport, terminal },
       guests: [{ name, guestType, personalFlight? }],
       linkedTransfers: [{ transferType, vehicleType, status }],
       roomCount, totalPax
     }
```

### No-Show Handling

```
DAILY CRON (run at configurable time, e.g., 6 AM):
  FOR each booking WHERE:
    status = CONFIRMED
    AND checkIn < today
    AND checkedInAt IS NULL
  DO:
    1. SET status = NO_SHOW
    2. CALCULATE no-show penalty:
       - Find applicable CancellationPolicy
       - Apply noShowPenaltyBasis (typically FIRST_NIGHT or FULL_STAY)
       - SET penaltyAmount on booking
    3. RESTORE allotment for remaining nights (nights after check-in date)
    4. GENERATE no-show charge invoice
    5. SEND notification to agent/TO
    6. LOG in BookingAuditLog
    7. ADD to No-Show Report
```

### Group Booking Workflow

```
ON Group Booking Creation:
  1. Create master Booking (bookingType = GROUP)
  2. Create GroupBooking extension:
     - Set totalRoomsBlocked, cutoffDate, minimumGuarantee
     - Calculate compRoomsGranted from compRoomRatio
  3. Create BookingRoom entries for each blocked room (status = BLOCKED)
  4. Block allotment for all rooms × all dates
  5. Set deadlines: cutoffDate, roomingListDeadline, depositSchedule
  6. Status = CONFIRMED (from allotment) or ON_REQUEST

ON Rooming List Submission:
  1. Agent uploads guest names (manual entry or CSV/Excel import)
  2. System assigns guests to rooms (auto or manual)
  3. Update BookingRoom.groupRoomStatus = NAMED
  4. Validate all rooms have names (warn on incomplete)
  5. Generate rooming list document
  6. Send to hotel (auto or manual trigger)

ON Cutoff Date:
  1. Count rooms with status NAMED or CONFIRMED
  2. Release unnamed/unconfirmed rooms back to allotment
  3. Check against minimumGuarantee:
     → If actual < minimum: apply attrition penalty
  4. Update GroupBooking.roomsActuallyUsed

ON Group Materialization (post-stay):
  1. Count rooms where groupRoomStatus = CHECKED_OUT
  2. materializationPercent = (checkedOut / totalRoomsBlocked) × 100
  3. Generate Materialization Report
```

---

## Booking Rate Calculation Engine

### Calculation Flow (Detailed)

```
INPUT:
  - tourOperatorId, hotelId (or search by destination)
  - checkIn, checkOut
  - rooms: [{ adults, children, childAges[], mealBasisId?, roomTypeId? }]

STEP 1: Contract Resolution
  → Find PUBLISHED contracts for hotel
  → Match by market (TO's market) → fallback to generic
  → Validate date coverage

STEP 2: Season Mapping
  FOR each night in (checkIn .. checkOut-1):
    → Map to ContractSeason by date range
    → Output: [{seasonId, dateFrom, dateTo, nightsInSeason}]

STEP 3: Rate Lookup (per room)
  FOR each room:
    FOR each seasonSegment:
      → Lookup CalculatedRate (seasonId, roomTypeId, mealBasisId, adults, children)
      → Get netRate per night
    → weightedNightlyRate = SUM(segmentRate × segmentNights) / totalNights
    → totalRoomCost = SUM(segmentRate × segmentNights) for each segment

STEP 4: Special Offer Application
  → Gather all eligible SpecialOffers for this contract
  → Evaluate conditions:
    - bookingDate within offer.bookingFrom..bookingTo
    - stayDates within offer.stayFrom..stayTo
    - nights >= offer.minimumStay
    - leadDays = checkIn - today >= offer.minimumLeadDays
    - roomType in offer applicability
    - mealBasis in offer applicability
  → Sort by priority
  → Apply combinability rules:
    - Non-combinable: pick best single offer
    - Combinable: stack in priority order (discount on discounted)
  → Output: discountedTotalCost, offersApplied[]

STEP 5: Special Meals
  FOR each night in stay:
    → Check SpecialMeal for this date
    → If mandatory gala: add supplement (adult × adultRate + child × childRate)

STEP 6: Markup Application
  → Find MarkupRule for (contract, TO, market) using hierarchy
  → Apply: sellingPrice = netCost × (1 + markupValue/100)
  → Or fixed: sellingPrice = netCost + fixedMarkup

STEP 7: Tax Calculation (if applicable)
  → Apply configured tax rules (city tax, tourism tax, VAT)

STEP 8: Credit Check
  → currentUtilization + bookingValue <= creditLimit?
  → Return warning or block

STEP 9: Freeze Exchange Rate
  → If booking currency ≠ contract currency
  → Fetch current rate from CurrencyRate
  → Store as booking.exchangeRate (frozen for this booking)

OUTPUT:
  {
    contract, seasons, rateMatrix: [{
      roomType, mealBasis, availability, allotmentSource,
      netPerNight, totalNet, offersApplied, discountTotal,
      specialMealCharges, sellingPerNight, totalSelling,
      warnings: ["stop sale", "low allotment", "release approaching"]
    }],
    creditCheck: { available, sufficient },
    grandTotal, depositRequired
  }
```

---

## Cancellation & Penalty Engine

### Penalty Calculation

```
ON Cancellation Request:
  INPUT: bookingId, cancellationDate (usually today)

  1. FIND applicable CancellationPolicy:
     - Check booking-level override
     - Check contract + season specific policy
     - Check hotel-level default
     - Check global default

  2. CALCULATE days before check-in:
     leadDays = booking.checkIn - cancellationDate

  3. IF policyType == FREE:
     → If leadDays >= freeCancellationDays: penalty = 0
     → Else: apply default penalty

  4. IF policyType == TIERED:
     → Find applicable tier: WHERE daysBeforeCheckIn <= leadDays
     → Use the tier with the highest daysBeforeCheckIn that qualifies
     → Apply tier's penaltyBasis:
       - FIRST_NIGHT: penalty = 1 night × room rate × rooms
       - FULL_STAY: penalty = total booking value
       - PERCENTAGE: penalty = total × penaltyValue / 100
       - FIXED_AMOUNT: penalty = penaltyValue
       - NIGHTS_COUNT: penalty = penaltyValue nights × rate × rooms

  5. IF policyType == NON_REFUNDABLE:
     → penalty = total booking value (100%)

  6. CALCULATE refund:
     refund = totalPaid - penalty
     IF refund > 0: create credit note / refund
     IF refund < 0: invoice remaining penalty

  7. RESTORE allotment (if applicable and within release period)

  8. UPDATE booking:
     - status = CANCELLED or CANCELLED_PENALTY
     - penaltyAmount = calculated penalty
     - cancellationRef = generated reference
     - cancellationReason = agent's input

  9. GENERATE documents:
     - Cancellation confirmation
     - Credit note (if refund)
     - Penalty invoice (if balance due)

  10. SEND communications:
      - Cancellation notice to hotel
      - Cancellation confirmation to agent/TO

  11. LOG in audit trail
```

---

## Payment & Credit Management

### Billing Type Determination

Bookings can be paid by different parties depending on the source and agreement:

```
ON Booking Creation:
  DETERMINE billing type:

  CASE 1: TOUR_OPERATOR (most common in B2B travel)
    → Booking received from / on behalf of a Tour Operator
    → TO pays per their payment agreement (credit, prepay, deposit+balance)
    → Guest NEVER pays the company directly
    → Invoicing follows TO's billing cycle (per booking, weekly, monthly)
    → Payment tracked against TO account, not per-guest

  CASE 2: DIRECT_GUEST
    → Booking made directly (walk-in, website, phone)
    → No Tour Operator involvement
    → Guest pays deposit + balance directly
    → Standard payment terms apply

  CASE 3: SPLIT_BILLING
    → Part paid by TO (e.g., room + meals), part by guest (e.g., extras, upgrades)
    → Separate payment tracking for each portion
    → TO invoiced for their portion, guest invoiced for theirs

  CASE 4: PREPAID_TO
    → TO has pre-deposited funds for a block of bookings (common in group/series)
    → Bookings drawn down against pre-paid balance
    → No per-booking payment required

  CASE 5: CORPORATE
    → Corporate account billing (company pays for employee travel)
    → Similar to TO but with corporate payment terms

  AUTO-SET:
    → When tourOperatorId is selected, billing type defaults to TOUR_OPERATOR
    → System loads TO's payment agreement and sets terms automatically
    → Agent can override if booking is mixed/split billing
```

### TO Payment Agreement Logic

```
EACH Tour Operator has a TOPaymentAgreement that determines:

  1. PAYMENT BASIS:
     CREDIT:
       → Booking confirmed immediately (no upfront payment)
       → Invoice generated per billing cycle
       → TO pays within creditDays (e.g., Net 30 = 30 days from invoice)
       → Overdue → late penalty applies, credit hold possible

     PREPAY:
       → Booking stays PENDING_PAYMENT until TO pays
       → If TO doesn't pay within prepayDeadlineDays → auto-cancel
       → Only moves to CONFIRMED after payment cleared

     DEPOSIT_BALANCE:
       → Booking confirmed on receipt of deposit (depositPercent of total)
       → Deposit due within depositDueDays after booking
       → Balance due balanceDueDays before check-in
       → If deposit not received → auto-cancel after deadline

     GUARANTEE_ONLY:
       → TO provides credit card guarantee
       → Card charged only on no-show or late cancellation
       → No upfront payment, no invoice until penalty event

     POST_STAY:
       → Booking confirmed based on credit
       → Invoice generated only after guest check-out
       → TO pays within creditDays from invoice date

  2. BILLING CYCLE:
     PER_BOOKING:
       → Individual invoice generated for each booking
       → Sent immediately on confirmation (or on departure for POST_STAY)

     WEEKLY:
       → All bookings in the week consolidated into one statement
       → Issued on statementDay (e.g., every Monday)
       → Single payment for all bookings in the period

     MONTHLY:
       → All bookings in the month consolidated into one statement
       → Issued on statementDay (e.g., 1st of next month)
       → TO receives one invoice/statement per month
       → Credit notes from cancellations netted off

     ON_DEPARTURE:
       → Invoice generated on check-out date
       → Grouped by departure date in statements

  3. COMMISSION MODEL (alternative to markup):
     → If TO operates on commission basis:
       → sellingPrice is what TO collects from their client
       → commissionAmount = sellingPrice × commissionPercent
       → remittanceAmount = sellingPrice - commissionAmount (what TO pays us)
       → Statement shows gross, commission deduction, net remittance
```

### Payment Workflow (differentiated by billing type)

```
═══════════════════════════════════════════════════════════
TOUR OPERATOR BOOKING PAYMENT WORKFLOW
═══════════════════════════════════════════════════════════

ON Booking Creation (billingType = TOUR_OPERATOR):
  1. LOAD TOPaymentAgreement for this TO
  2. SET billing terms on booking:
     - toPaymentDueDate = calculated from agreement
     - depositAmount = if agreement requires deposit
     - commissionAmount = if commission-based

  BASED ON paymentBasis:

    [CREDIT]:
      → Booking auto-confirmed (if allotment available + credit limit OK)
      → Invoice added to next billing cycle (per/weekly/monthly)
      → No immediate payment expected
      → TO pays per statement due date
      → Deadline: SUPPLIER_PAYMENT set per creditDays

    [PREPAY]:
      → Booking status = PENDING_PAYMENT
      → Pro-forma invoice sent to TO immediately
      → Deadline: DEPOSIT_DUE set per prepayDeadlineDays
      → ON payment received → status = CONFIRMED
      → ON deadline passed without payment → status = EXPIRED (auto-cancel)

    [DEPOSIT_BALANCE]:
      → Booking status = CONFIRMED (tentative until deposit)
      → Deposit invoice sent: depositPercent of total
      → Deadline: DEPOSIT_DUE set per depositDueDays
      → Balance invoice sent: balanceDueDays before check-in
      → Deadline: BALANCE_DUE

    [POST_STAY]:
      → Booking confirmed on credit
      → NO invoice until after check-out
      → ON check-out → generate final invoice
      → TO pays within creditDays from check-out date

ON Payment Received from TO:
  1. Create BookingPayment (paidBy = "TOUR_OPERATOR", tourOperatorId = TO)
  2. If paying against statement → link toStatementId
  3. If paying per booking → link to individual booking
  4. Update booking.totalPaid, outstandingBalance, paymentStatus
  5. Update CreditLimit.currentUtilization (decrease by payment amount)
  6. Create journal entry in Finance module
  7. If paying via statement → update TOStatement.paidAmount
  8. Generate receipt / payment acknowledgment

═══════════════════════════════════════════════════════════
DIRECT GUEST PAYMENT WORKFLOW
═══════════════════════════════════════════════════════════

ON Booking Creation (billingType = DIRECT_GUEST):
  1. Calculate deposit:
     - From contract default deposit terms (e.g., 30%)
     - depositAmount = grandTotal × depositPercent / 100
  2. Set depositDueDate (immediate or within 3 days)
  3. Set balanceDueDate (e.g., 30 days before check-in)
  4. Create BookingDeadlines for DEPOSIT_DUE and BALANCE_DUE
  5. Generate pro-forma invoice to guest
  6. Booking stays PENDING_PAYMENT until deposit received

ON Payment Receipt from Guest:
  1. Create BookingPayment (paidBy = "GUEST", payerName = guest name)
  2. Update booking.totalPaid
  3. Recalculate outstandingBalance
  4. Update paymentStatus:
     - If totalPaid >= depositAmount but < grandTotal → DEPOSIT_PAID
     - If totalPaid > 0 but < depositAmount → PARTIALLY_PAID
     - If totalPaid >= grandTotal → FULLY_PAID
     - If totalPaid > grandTotal → OVERPAID (credit due)
  5. Mark related deadline as COMPLETED
  6. Create journal entry in Finance module
  7. Send payment receipt to guest

═══════════════════════════════════════════════════════════
SPLIT BILLING WORKFLOW
═══════════════════════════════════════════════════════════

ON Booking Creation (billingType = SPLIT_BILLING):
  1. Define split: what TO pays vs. what guest pays
     e.g., TO covers room + meals ($1,200), guest covers extras ($300)
  2. TO portion follows TO payment agreement terms
  3. Guest portion follows direct guest payment terms
  4. Separate invoices generated for each party
  5. Payment tracked per payer: paidBy = "TOUR_OPERATOR" or "GUEST"
  6. Booking FULLY_PAID only when both TO and guest portions settled

CREDIT LIMIT CHECK:
  ON each booking (where billingType in [TOUR_OPERATOR, PREPAID_TO]):
    1. currentUtilization = SUM(outstanding balances for all TO bookings)
    2. projectedUtilization = currentUtilization + newBookingValue
    3. IF projectedUtilization > creditLimit:
       → BLOCK booking with message:
         "Credit limit exceeded. Available: $X. Required: $Y."
       → Options: [Request Override] [Make Payment] [Cancel]
    4. IF projectedUtilization > creditLimit × warningThreshold/100:
       → WARNING: "Credit utilization at X%. Limit: $Y."
    5. Manager override: logs override in audit trail
    6. NOT applicable for DIRECT_GUEST bookings (no credit check needed)
```

### TO Statement Generation

```
ON Statement Generation Trigger (manual or scheduled cron):
  INPUT: tourOperatorId, periodFrom, periodTo

  1. FIND all bookings WHERE:
     - tourOperatorId matches
     - billingType = TOUR_OPERATOR or PREPAID_TO
     - status in (CONFIRMED, CHECKED_IN, CHECKED_OUT, FINALIZED)
     - checkIn within period (or checkOut within period for POST_STAY)
     - NOT already included in another statement

  2. CREATE TOStatement:
     - statementRef = auto-generated (STM-{year}-{month}-{TO code}-{seq})
     - dueDate = issueDate + TO's creditDays

  3. FOR each booking found:
     → CREATE TOStatementLine:
       - Booking details snapshot (ref, hotel, guest, dates, rooms)
       - sellingAmount from booking
       - creditNoteAmount if any cancellation credit exists
       - commissionAmount if commission-based
       - netAmount = sellingAmount - creditNoteAmount - commissionAmount

  4. CALCULATE statement totals:
     - grossAmount = SUM of sellingAmounts
     - creditNoteAmount = SUM of credits
     - commissionAmount = SUM of commissions
     - netAmount = gross - credits
     - remittanceAmount = netAmount - commissions (what TO owes)

  5. GENERATE statement document (PDF):
     - Company header / TO details
     - Period covered
     - Per-booking breakdown table (if includeBreakdown = true)
     - Credits / adjustments section
     - Commission summary (if applicable)
     - Net amount due / remittance required
     - Payment instructions / bank details

  6. SEND to TO:
     - Email to TOPaymentAgreement.statementEmail
     - Attach PDF
     - Log in communications

  7. UPDATE bookings:
     - Link each booking to this statement (toStatementId)
     - Set toInvoiceDate, toPaymentDueDate

  RECONCILIATION:
    ON Payment against statement:
      → Match payment to statement (by reference or manual)
      → Update statement paidAmount
      → If paidAmount >= netAmount → status = FULLY_PAID
      → If partial → status = PARTIALLY_PAID
      → Update each booking's totalPaid proportionally
      → Update TO credit utilization
```

---

## Voucher & Document Generation

### Hotel Voucher Content

```
┌─────────────────────────────────────────────────────────────────┐
│                    HOTEL VOUCHER                                 │
│          [Tour Operator Logo / Branding]                         │
│                                                                   │
│ Voucher No: VCH-2026-00142       Date Issued: 22 Feb 2026       │
│ Booking Ref: BK-2026-00142       Agent Ref: ABC-UK-2026-0043    │
│                                                                   │
│ ─────────────────────────────────────────────────────────────── │
│ HOTEL DETAILS                                                    │
│ Hotel: Hilton Dubai Marina ★★★★★                                │
│ Address: Dubai Marina, Dubai, UAE                                │
│ Phone: +971-4-XXX-XXXX    Email: res@hilton-dxb.com            │
│ ─────────────────────────────────────────────────────────────── │
│ RESERVATION DETAILS                                              │
│ Check-in:  Sunday, 15 June 2026 (14:00)                        │
│ Check-out: Sunday, 22 June 2026 (12:00)                        │
│ Nights:    7                                                     │
│                                                                   │
│ Room 1: Standard Double — Bed & Breakfast                        │
│         Mr John Smith, Mrs Jane Smith, Tom Smith (age 8)        │
│                                                                   │
│ Room 2: Standard Double — Bed & Breakfast                        │
│         Mr David Brown, Mrs Sarah Brown                          │
│                                                                   │
│ MEAL PLAN: Bed & Breakfast included                              │
│ ─────────────────────────────────────────────────────────────── │
│ SPECIAL REQUESTS                                                 │
│ - Room 1: High floor, King bed, cot for child                   │
│ - Room 2: Twin beds, quiet room                                  │
│ ─────────────────────────────────────────────────────────────── │
│ BILLING INSTRUCTIONS                                             │
│ All charges to: ABC Tours International                          │
│ Ref: ABC-UK-2026-0043                                           │
│ ─────────────────────────────────────────────────────────────── │
│ EMERGENCY CONTACT: +44-XXX-XXXX (24/7 support)                  │
│                                                                   │
│ [QR CODE]                                                        │
│                                                                   │
│ This voucher confirms the above reservation.                     │
│ Subject to standard terms and conditions.                        │
└─────────────────────────────────────────────────────────────────┘
```

### Document Types & Rules

| Document | Generated When | Conditions |
|----------|---------------|-----------|
| Hotel Reservation Request | On "Send to Hotel" action from reservation window | Any status (Draft, Option, Confirmed). **Excludes ALL pricing** — only booking details, guests, rooms, dates, meals, flights, special requests. Sent to hotel.reservationEmail (from Contracting module Hotel record). |
| Booking Confirmation | On status → CONFIRMED | Always |
| Hotel Voucher | Manual trigger or auto on CONFIRMED + FULLY_PAID | Status must be CONFIRMED or later, payment status must be DEPOSIT_PAID or FULLY_PAID (configurable) |
| Pro-Forma Invoice | On status → CONFIRMED | Always |
| Final Invoice | Manual or on check-out | After CHECKED_OUT |
| Credit Note | On cancellation with refund, or amendment with price reduction | Refund amount > 0 |
| Cancellation Confirmation | On status → CANCELLED | Always |
| Amendment Confirmation | On amendment applied | Always |
| Rooming List | Manual trigger for group bookings | Group bookings with named guests |
| Receipt | On payment recorded | Always on payment |

---

## API Routes

```
/api/reservations/
│
├── search/
│   ├── availability              POST (body: {hotelId?, destinationId?, tourOperatorId,
│   │                                    checkIn, checkOut, rooms[{adults, children, childAges}]})
│   │                             → returns rate matrix with availability, offers, warnings
│   └── quick-quote               POST (simplified search for single room)
│
├── bookings/                     GET (list with filters: hotel, status, TO, dates, source)
│   ├── POST                      Create new booking
│   ├── [id]/                     GET, PUT
│   ├── [id]/confirm              POST → draft/option/quote → confirmed
│   ├── [id]/check-in             POST → confirmed → checked-in
│   ├── [id]/check-out            POST → checked-in → checked-out
│   ├── [id]/finalize             POST → checked-out → finalized
│   ├── [id]/cancel               POST → any → cancelled (with penalty calc)
│   │   body: { reason, overridePenalty? }
│   ├── [id]/no-show              POST → confirmed → no-show
│   ├── [id]/hold-option          POST → draft/quote → option (with expiryDate)
│   ├── [id]/send-to-hotel        POST → send confirmation request to hotel
│   ├── [id]/mark-on-request      POST → set as on-request (awaiting hotel)
│   ├── [id]/supplier-confirm     POST → hotel confirmed (with supplierRef)
│   ├── [id]/supplier-reject      POST → hotel rejected
│   │
│   ├── [id]/rooms/               GET, POST (add room)
│   │   ├── [roomId]/             GET, PUT, DELETE
│   │   └── [roomId]/guests/      GET, POST, DELETE (assign guests to room)
│   │
│   ├── [id]/guests/              GET, POST
│   │   └── [guestId]/            GET, PUT, DELETE
│   │
│   ├── [id]/extras/              GET, POST
│   │   └── [extraId]/            GET, PUT, DELETE
│   │
│   ├── [id]/amendments/          GET
│   │   └── request               POST (body: { amendmentType, changes })
│   │
│   ├── [id]/payments/            GET, POST
│   │   └── [paymentId]/          GET, PUT
│   │
│   ├── [id]/special-requests/    GET, POST
│   │   └── [reqId]/              GET, PUT, DELETE
│   │
│   ├── [id]/communications/      GET, POST (send message)
│   │
│   ├── [id]/deadlines/           GET
│   │   ├── [dlId]/complete       POST
│   │   └── [dlId]/extend         POST (body: { newDate, reason })
│   │
│   ├── [id]/documents/           GET
│   │   ├── generate-voucher      POST → generate hotel voucher PDF
│   │   ├── generate-confirmation POST → generate confirmation PDF
│   │   ├── generate-proforma     POST → generate pro-forma invoice
│   │   ├── generate-invoice      POST → generate final invoice
│   │   ├── generate-credit-note  POST → generate credit note
│   │   └── [docId]/download      GET → download document file
│   │
│   ├── [id]/audit-log/           GET (immutable history)
│   │
│   ├── [id]/stop-sale-check      GET → check stop sales for this booking's dates
│   │   returns: { alerts[], canOverride }
│   ├── [id]/stop-sale-override   POST (body: { reason })
│   │
│   └── [id]/split-stay/          POST (body: { segments[] }) → create split stay
│       └── segments/             GET (all segments of a split stay)
│
├── groups/
│   ├── [bookingId]/              GET group booking details
│   ├── [bookingId]/rooming-list  GET, POST (submit rooming list)
│   │   ├── import                POST (CSV/Excel upload)
│   │   ├── export                GET → download rooming list
│   │   └── send-to-hotel         POST → send rooming list to hotel
│   ├── [bookingId]/sub-blocks/   GET, POST
│   │   └── [subId]/              GET, PUT, DELETE
│   ├── [bookingId]/deposit-schedule/ GET, PUT
│   └── [bookingId]/materialization   GET → materialization summary
│
├── series/                       GET, POST
│   ├── [id]/                     GET, PUT, DELETE
│   ├── [id]/generate             POST → generate individual bookings from series template
│   └── [id]/bookings             GET → all bookings in this series
│
├── guests/
│   ├── profiles/                 GET, POST (guest profile database)
│   │   ├── [id]/                 GET, PUT, DELETE
│   │   ├── [id]/bookings         GET → all bookings for this guest
│   │   ├── search                GET (?name, ?passport, ?email)
│   │   └── merge                 POST (body: { sourceIds[], targetId })
│   └── import                    POST (CSV/Excel upload)
│
├── credit/
│   ├── limits/                   GET, POST
│   │   └── [id]/                 GET, PUT
│   ├── check                     POST (body: { tourOperatorId, amount })
│   │   returns: { available, sufficient, utilization }
│   └── override                  POST (body: { bookingId, reason }) — manager only
│
├── to-payment-agreements/        GET, POST
│   ├── [id]/                     GET, PUT, DELETE
│   └── by-to/[tourOperatorId]    GET → get agreement for specific TO
│
├── to-statements/                GET (list with filters: TO, status, period)
│   ├── [id]/                     GET, PUT
│   ├── [id]/issue                POST → issue statement to TO (draft → issued)
│   ├── [id]/send                 POST → email statement to TO
│   ├── [id]/record-payment       POST (body: { amount, method, reference })
│   ├── [id]/dispute              POST (body: { notes })
│   ├── [id]/lines/               GET → booking lines in this statement
│   ├── [id]/payments/            GET → payments against this statement
│   ├── [id]/download             GET → download statement PDF
│   ├── generate                  POST (body: { tourOperatorId, periodFrom, periodTo })
│   │                             → auto-generate statement for period
│   ├── generate-batch            POST (body: { periodFrom, periodTo })
│   │                             → generate statements for ALL TOs with due bookings
│   └── overdue                   GET → all overdue statements
│
├── walk/
│   ├── relocations/              GET (all walk records)
│   ├── [bookingId]/relocate      POST (body: { alternativeHotelId, ... })
│   └── alternatives              GET (?hotelId, ?date, ?roomType) → suggest alternative hotels
│
├── deadlines/
│   ├── dashboard                 GET → all upcoming deadlines across bookings
│   ├── overdue                   GET → overdue deadlines requiring action
│   └── expiring-options          GET → options expiring today/soon
│
├── cancellation-policies/        GET, POST
│   ├── [id]/                     GET, PUT, DELETE
│   └── [id]/tiers/               GET, POST, PUT, DELETE
│
├── notifications/
│   ├── templates/                GET, POST
│   │   └── [id]/                 GET, PUT, DELETE
│   └── send-batch                POST (body: { templateId, bookingIds[] })
│
├── reports/
│   ├── materialization           GET (?hotelId, ?contractId, ?period, ?tourOperatorId)
│   ├── occupancy                 GET (?hotelId, ?dateFrom, ?dateTo)
│   ├── pickup-pace               GET (?hotelId, ?period, ?compareWith)
│   ├── revenue                   GET (?dateFrom, ?dateTo, ?groupBy)
│   ├── production                GET (?tourOperatorId, ?dateFrom, ?dateTo)
│   ├── cancellations             GET (?dateFrom, ?dateTo, ?hotelId)
│   ├── no-shows                  GET (?dateFrom, ?dateTo, ?hotelId)
│   ├── allotment-utilization     GET (?hotelId, ?contractId, ?period)
│   ├── booking-lead-time         GET (?period)
│   ├── market-mix                GET (?period, ?hotelId)
│   ├── credit-limits             GET → all TOs with credit status
│   ├── arrivals                  GET (?date, ?hotelId)
│   ├── departures                GET (?date, ?hotelId)
│   ├── in-house                  GET (?date, ?hotelId)
│   ├── outstanding-payments      GET (?tourOperatorId)
│   ├── to-account-statement      GET (?tourOperatorId) → aging analysis, statement status
│   ├── to-commission             GET (?tourOperatorId, ?period) → commission report
│   ├── audit-trail               GET (?bookingId, ?userId, ?dateFrom, ?dateTo)
│   └── daily-summary             GET (?date) → comprehensive daily snapshot
│
├── dashboard/                    GET → aggregated KPIs and widgets
│
└── settings/                     GET, PUT
```

---

## File Structure

```
src/
├── app/(dashboard)/reservations/
│   ├── page.tsx                                    # Reservations dashboard
│   ├── layout.tsx                                  # Module sidebar layout
│   │
│   ├── search/
│   │   └── page.tsx                                # New booking search & availability
│   │
│   ├── bookings/
│   │   ├── page.tsx                                # All bookings list (filterable)
│   │   ├── new/page.tsx                            # Booking creation wizard
│   │   ├── fit/page.tsx                            # FIT bookings filtered view
│   │   ├── on-request/page.tsx                     # On-request & waitlisted
│   │   ├── options/page.tsx                        # Tentative/options list
│   │   ├── cancelled/page.tsx                      # Cancelled bookings
│   │   └── [id]/
│   │       ├── page.tsx                            # Booking form (all tabs)
│   │       ├── rooms/page.tsx                      # Room management
│   │       ├── guests/page.tsx                     # Guest assignment
│   │       ├── extras/page.tsx                     # Transfers & extras
│   │       ├── payments/page.tsx                   # Payment tracker
│   │       ├── amendments/page.tsx                 # Amendment history
│   │       ├── communications/page.tsx             # Communication log
│   │       ├── documents/page.tsx                  # Vouchers, invoices, etc.
│   │       ├── deadlines/page.tsx                  # Deadlines for this booking
│   │       └── audit/page.tsx                      # Audit log
│   │
│   ├── groups/
│   │   ├── page.tsx                                # Group bookings list
│   │   ├── new/page.tsx                            # Create group booking
│   │   └── [id]/
│   │       ├── page.tsx                            # Group booking detail
│   │       ├── rooming-list/page.tsx               # Rooming list management
│   │       ├── sub-blocks/page.tsx                 # Sub-group management
│   │       └── materialization/page.tsx            # Group materialization
│   │
│   ├── series/
│   │   ├── page.tsx                                # Series bookings list
│   │   ├── new/page.tsx                            # Create series template
│   │   └── [id]/page.tsx                           # Series detail + departures
│   │
│   ├── operations/
│   │   ├── arrivals/page.tsx                       # Today's arrivals
│   │   ├── departures/page.tsx                     # Today's departures
│   │   ├── in-house/page.tsx                       # In-house guest list
│   │   ├── no-shows/page.tsx                       # No-show management
│   │   └── check-in-out/page.tsx                   # Check-in / check-out processing
│   │
│   ├── rooming-lists/
│   │   ├── page.tsx                                # All pending rooming lists
│   │   └── calendar/page.tsx                       # Rooming list deadline calendar
│   │
│   ├── guests/
│   │   ├── page.tsx                                # Guest directory
│   │   ├── [id]/page.tsx                           # Guest profile detail
│   │   ├── vip/page.tsx                            # VIP guests
│   │   └── merge/page.tsx                          # Merge duplicate profiles
│   │
│   ├── extras/
│   │   ├── page.tsx                                # All extras & transfers
│   │   └── transfers-today/page.tsx                # Today's transfers
│   │
│   ├── payments/
│   │   ├── page.tsx                                # Payment tracker
│   │   ├── outstanding/page.tsx                    # Outstanding balances
│   │   ├── deposits-due/page.tsx                   # Deposits due
│   │   ├── refunds/page.tsx                        # Refund queue
│   │   ├── to-agreements/
│   │   │   ├── page.tsx                            # TO payment agreements list
│   │   │   └── [id]/page.tsx                       # Agreement detail/edit
│   │   └── to-statements/
│   │       ├── page.tsx                            # All TO statements list
│   │       ├── draft/page.tsx                      # Draft statements
│   │       ├── overdue/page.tsx                    # Overdue statements
│   │       ├── generate/page.tsx                   # Statement generation wizard
│   │       └── [id]/page.tsx                       # Statement detail (lines, payments)
│   │
│   ├── documents/
│   │   ├── vouchers/page.tsx                       # All vouchers
│   │   ├── confirmations/page.tsx                  # All confirmations
│   │   ├── invoices/page.tsx                       # Invoices & pro-formas
│   │   └── credit-notes/page.tsx                   # Credit notes
│   │
│   ├── communications/
│   │   ├── page.tsx                                # Communication center
│   │   └── templates/page.tsx                      # Email/notification templates
│   │
│   ├── deadlines/
│   │   ├── page.tsx                                # Deadline dashboard
│   │   └── calendar/page.tsx                       # Deadline calendar view
│   │
│   ├── walk/
│   │   └── page.tsx                                # Walk/relocation management
│   │
│   ├── reports/
│   │   ├── materialization/page.tsx                # Materialization report
│   │   ├── occupancy/page.tsx                      # Occupancy report
│   │   ├── pickup-pace/page.tsx                    # Pickup & pace report
│   │   ├── revenue/page.tsx                        # Revenue report
│   │   ├── production/page.tsx                     # Production by TO
│   │   ├── cancellations/page.tsx                  # Cancellation report
│   │   ├── no-shows/page.tsx                       # No-show report
│   │   ├── allotment-utilization/page.tsx          # Allotment utilization
│   │   ├── booking-lead-time/page.tsx              # Lead time analysis
│   │   ├── market-mix/page.tsx                     # Market mix report
│   │   ├── credit-limits/page.tsx                  # Credit limit report
│   │   ├── outstanding-payments/page.tsx           # Outstanding payments
│   │   ├── to-account-statement/page.tsx           # TO account aging report
│   │   ├── to-commission/page.tsx                  # TO commission report
│   │   ├── daily-summary/page.tsx                  # Daily operations summary
│   │   └── audit-trail/page.tsx                    # Audit trail report
│   │
│   └── configuration/
│       ├── settings/page.tsx                       # Module settings
│       ├── cancellation-policies/
│       │   ├── page.tsx                            # Policy list
│       │   └── [id]/page.tsx                       # Policy detail with tiers
│       ├── notification-templates/page.tsx         # Notification templates
│       ├── document-templates/page.tsx             # Document layout templates
│       ├── credit-limits/page.tsx                  # Credit limit management
│       ├── booking-sources/page.tsx                # Booking source configuration
│       └── overbooking-rules/page.tsx              # Overbooking thresholds
│
├── components/reservations/
│   ├── BookingSearchForm.tsx                       # Hotel search with availability check
│   ├── AvailabilityResultsGrid.tsx                 # Rate matrix results with availability indicators
│   ├── BookingSummaryPanel.tsx                     # Booking cost summary with offers
│   ├── BookingForm.tsx                             # Full booking form with all tabs
│   ├── BookingRoomCard.tsx                         # Per-room configuration card
│   ├── BookingRoomGrid.tsx                         # Multi-room grid editor
│   ├── GuestAssignment.tsx                         # Assign guests to rooms
│   ├── GuestProfileForm.tsx                        # Guest profile create/edit
│   ├── GuestSearch.tsx                             # Search existing guest profiles
│   ├── RoomingListEditor.tsx                       # Rooming list entry/import/export
│   ├── RoomingListImporter.tsx                     # CSV/Excel rooming list import
│   ├── SpecialRequestForm.tsx                      # Special request entry
│   ├── BookingExtraForm.tsx                        # Extras & transfer form
│   ├── TransferBookingForm.tsx                     # Transfer-specific booking form
│   ├── PaymentForm.tsx                             # Record payment
│   ├── PaymentTracker.tsx                          # Payment history & balance
│   ├── CreditLimitCheck.tsx                        # Credit check widget
│   ├── CreditLimitManager.tsx                      # Credit limit CRUD
│   ├── AmendmentWizard.tsx                         # Amendment request wizard
│   ├── AmendmentHistory.tsx                        # Amendment log timeline
│   ├── CancellationDialog.tsx                      # Cancellation with penalty preview
│   ├── CancellationPolicyEditor.tsx                # Policy + tiers editor
│   ├── PenaltyCalculator.tsx                       # Penalty calculation display
│   ├── StopSaleAlert.tsx                           # Stop sale warning with options
│   ├── AllotmentIndicator.tsx                      # Availability color indicator (🟢🟡🔴)
│   ├── OfferEligibilityBadge.tsx                   # Eligible offer display
│   ├── VoucherPreview.tsx                          # Voucher preview before generation
│   ├── DocumentGenerator.tsx                       # Document generation controls
│   ├── CommunicationComposer.tsx                   # Compose message to hotel
│   ├── CommunicationLog.tsx                        # Communication timeline
│   ├── DeadlineDashboard.tsx                       # Color-coded deadline overview
│   ├── DeadlineCalendar.tsx                        # Calendar view of deadlines
│   ├── NoShowProcessor.tsx                         # No-show handling UI
│   ├── WalkRelocationForm.tsx                      # Walk/relocation wizard
│   ├── GroupBookingForm.tsx                        # Group booking extensions
│   ├── GroupRoomBlockGrid.tsx                      # Room block management grid
│   ├── GroupMaterializationView.tsx                # Materialization chart/table
│   ├── SeriesBookingForm.tsx                       # Series template form
│   ├── SeriesDepartureGrid.tsx                     # Individual departures grid
│   ├── SplitStayBuilder.tsx                        # Split stay segment builder
│   ├── MaterializationReport.tsx                   # Full materialization report
│   ├── OccupancyReport.tsx                         # Occupancy report chart/table
│   ├── PickupPaceReport.tsx                        # Pickup & pace comparison
│   ├── RevenueReport.tsx                           # Revenue dashboard
│   ├── ProductionReport.tsx                        # Production by TO
│   ├── BookingAuditTimeline.tsx                    # Audit log timeline
│   ├── DailySummaryDashboard.tsx                   # Daily operations dashboard
│   ├── BookingStatusBar.tsx                        # Status pipeline bar
│   ├── QuickSearchWidget.tsx                       # Global booking search
│   ├── ReservationsSidebar.tsx                     # Module sidebar navigation
│   ├── BillingTypeSelector.tsx                     # TO / Guest / Split billing selector
│   ├── TOPaymentAgreementForm.tsx                  # TO payment agreement CRUD
│   ├── TOPaymentTermsDisplay.tsx                   # Display TO's terms on booking form
│   ├── TOStatementGenerator.tsx                    # Statement generation wizard (select TO, period)
│   ├── TOStatementView.tsx                         # Statement detail view with lines & payments
│   ├── TOStatementLineGrid.tsx                     # Editable grid of booking lines in statement
│   ├── TOStatementPaymentForm.tsx                  # Record payment against TO statement
│   └── TOStatementPDF.tsx                          # Statement PDF preview/download
│
├── lib/reservations/
│   ├── booking-rate-engine.ts                      # Rate calculation from contracts
│   ├── contract-resolver.ts                        # Find applicable contract for TO/market/hotel
│   ├── availability-checker.ts                     # Check allotment + stop sales + release periods
│   ├── offer-applicator.ts                         # Apply special offers to booking
│   ├── penalty-calculator.ts                       # Cancellation penalty computation
│   ├── credit-checker.ts                           # Credit limit validation
│   ├── allotment-deductor.ts                       # Allotment deduction/restoration
│   ├── stop-sale-checker.ts                        # Stop sale validation with alerts
│   ├── amendment-processor.ts                      # Amendment workflow engine
│   ├── no-show-processor.ts                        # No-show detection and penalty
│   ├── deadline-manager.ts                         # Deadline creation, tracking, alerts
│   ├── voucher-generator.ts                        # Hotel voucher PDF generation
│   ├── confirmation-generator.ts                   # Booking confirmation PDF
│   ├── invoice-generator.ts                        # Pro-forma and final invoice generation
│   ├── credit-note-generator.ts                    # Credit note generation
│   ├── rooming-list-processor.ts                   # Rooming list import/export/validation
│   ├── communication-sender.ts                     # Email/notification dispatch
│   ├── template-renderer.ts                        # Email/doc template variable substitution
│   ├── booking-validator.ts                        # Pre-booking validation rules engine
│   ├── duplicate-detector.ts                       # Detect potential duplicate bookings
│   ├── exchange-rate-freezer.ts                    # Freeze exchange rate at booking time
│   ├── group-booking-manager.ts                    # Group-specific logic (blocks, cutoff, attrition)
│   ├── series-generator.ts                         # Generate bookings from series template
│   ├── walk-manager.ts                             # Walk/relocation workflow
│   ├── materialization-calculator.ts               # Materialization report computation
│   ├── audit-logger.ts                             # Immutable audit log writer
│   ├── booking-ref-generator.ts                    # Reference number generation (BK-, VCH-, AMD-, etc.)
│   ├── billing-type-resolver.ts                    # Determine billing type from TO agreement
│   ├── to-payment-terms-engine.ts                  # Calculate due dates from TO agreement
│   ├── to-statement-generator.ts                   # Generate periodic TO statements
│   └── to-statement-reconciler.ts                  # Match payments to statement lines
│
└── prisma/
    └── schema.prisma                               # All Reservations models added
```

---

## Reports

### 1. Materialization Report

Per-hotel room type consumption against allocation — the core operational report.

**Dimensions:** Hotel × Contract × Room Type × Period × Tour Operator

**Metrics:**
- Rooms Allocated (blocked)
- Rooms Booked (confirmed)
- Rooms Actually Used (checked-in/out)
- Rooms Available (remaining)
- No-Shows
- Cancellations
- Materialization % = (Used / Allocated) × 100
- Revenue generated

**Drill-down levels:**
1. Hotel summary → by room type → by daily breakdown
2. By tour operator → by booking detail
3. By group → individual rooms within group

### 2. Occupancy Report

Room nights sold as percentage of available inventory.

**Metrics:** Occupancy %, ADR (Average Daily Rate), RevPAR (Revenue per Available Room)

### 3. Pickup / Pace Report

Net change in reservations over time for future dates. Compares current booking pace against same period last year or budget targets.

**View:** Table + line chart showing booking accumulation curve

### 4. Revenue Report

Total revenue by period, segmented by hotel, destination, tour operator, market, booking source.

**Includes:** Net cost, markup, selling price, margin %, commission

### 5. Production Report (by Tour Operator)

Room nights and revenue produced by each TO/agent. Rankings and trend comparison.

### 6. Cancellation Report

All cancellations with: booking ref, hotel, dates, reason, penalty amount, refund issued.

### 7. No-Show Report

All no-shows with: booking ref, hotel, dates, penalty applied, financial impact.

### 8. Allotment Utilization Report

Usage of contracted allotments — highlights underutilized allotments before release dates.

### 9. Booking Lead Time Report

Average days between booking creation and check-in date — by hotel, market, season.

### 10. Market Mix Report

Breakdown of bookings by source market, nationality, channel. Trend analysis.

### 11. Credit Limit Report

Per-TO credit utilization: limit, used, available, overdue invoices, payment history.

### 12. Daily Summary Report

Comprehensive daily snapshot: arrivals, departures, in-house count, new bookings, cancellations, payments received, outstanding deadlines.

### 13. TO Account Statement Report

Per-TO account status: outstanding statements, overdue amounts, payment history, aging analysis (current, 30, 60, 90+ days). Drill-down from TO summary → individual statements → booking lines.

### 14. TO Commission Report

For commission-based TOs: total bookings, gross amount, commission earned, net remittance, payment status. By period, by TO, by hotel.

---

## Implementation Phases

| Phase | Scope | Description |
|-------|-------|-------------|
| **Phase 1: Booking Core** | Booking, BookingRoom, BookingGuest, GuestProfile, BookingRoomGuest, BookingAuditLog, booking-ref-generator, booking-validator | Core booking creation, room configuration, guest management, audit logging. Basic booking lifecycle (Draft → Confirmed). |
| **Phase 2: Rate Engine Integration** | booking-rate-engine, contract-resolver, availability-checker, offer-applicator, exchange-rate-freezer | Search & availability with real-time rate calculation from contracts. Season mapping, offer eligibility, allotment display. |
| **Phase 3: Allotment & Stop Sales** | allotment-deductor, stop-sale-checker, StopSaleAlert component | Allotment deduction on booking, restoration on cancellation. Stop sale enforcement with override capability. |
| **Phase 4: Payments & Credit** | BookingPayment, CreditLimit, credit-checker, PaymentTracker, CreditLimitManager, BillingTypeSelector | Payment recording, deposit tracking, balance calculation, credit limit checks, manager overrides. Billing type determination (TO vs guest vs split). |
| **Phase 4b: TO Billing & Statements** | TOPaymentAgreement, TOStatement, TOStatementLine, TOStatementPayment, to-payment-terms-engine, to-statement-generator, to-statement-reconciler, TOStatementGenerator, TOStatementView | Per-TO payment agreement configuration. Periodic statement generation (per-booking, weekly, monthly). Statement reconciliation. Commission-based settlement. Aging reports. |
| **Phase 5: Amendments & Cancellations** | BookingAmendment, CancellationPolicy, CancellationPolicyTier, amendment-processor, penalty-calculator | Amendment workflow with price recalculation. Cancellation with tiered penalty engine. Refund/credit note generation. |
| **Phase 6: Documents & Vouchers** | BookingDocument, voucher-generator, confirmation-generator, invoice-generator, credit-note-generator, template-renderer | Voucher generation (branded PDF), booking confirmations, pro-forma/final invoices, credit notes. Multi-language support. |
| **Phase 7: Communications & Deadlines** | BookingCommunication, BookingDeadline, NotificationTemplate, communication-sender, deadline-manager | Communication log, automated email dispatch, deadline tracking with alerts, escalation rules. |
| **Phase 8: Group Bookings** | GroupBooking, GroupDepositSchedule, GroupSubBlock, group-booking-manager, RoomingListEditor, RoomingListImporter | Group room blocks, rooming list management (entry, import, export, send), cutoff dates, attrition, complimentary rooms. |
| **Phase 9: Advanced Features** | SeriesBooking, series-generator, WalkRelocation, walk-manager, BookingExtra, TransferBookingForm, SplitStayBuilder, duplicate-detector | Series/recurring bookings, overbooking/walk management, transfers & extras, split stays, duplicate detection. |
| **Phase 10: Special Requests & Guest Profiles** | BookingSpecialRequest, GuestProfile enhancements, VIP management, guest merge | Special request workflow (request → confirm → not available), guest profile database, VIP recognition, guest merge tool. |
| **Phase 11: Reports** | MaterializationReport, OccupancyReport, PickupPaceReport, RevenueReport, ProductionReport, all report endpoints | All reporting views with filters, drill-down, PDF/Excel export, chart visualizations. Materialization report with daily breakdown. |
| **Phase 12: No-Show & Operations** | no-show-processor, NoShowProcessor UI, DailySummaryDashboard, operations pages (arrivals, departures, in-house, check-in/out) | Daily operations views, no-show auto-detection cron, operational dashboard, daily summary report. |
