# iTourTMS — CRM Module Specification

> Complete specification for the CRM module — an exact replica of Odoo ERP's CRM module (v17/18), adapted for the iTourTMS tech stack.

---

## Table of Contents

1. [Sub-Modules & Features](#sub-modules--features)
2. [Database Schema](#database-schema)
3. [UI Structure](#ui-structure)
4. [Views Per Section](#views-per-section)
5. [Business Logic & Workflows](#business-logic--workflows)
6. [API Routes](#api-routes)
7. [File Structure](#file-structure)
8. [Shared UI Components](#shared-ui-components)
9. [Implementation Phases](#implementation-phases)

---

## Sub-Modules & Features

| # | Sub-Module | Description |
|---|-----------|-------------|
| 1 | **Pipeline Management** | Kanban board with drag-and-drop stages, stage configuration, probability tracking, expected revenue per column |
| 2 | **Leads** | Pre-qualification step, lead creation from email/web/manual, lead mining, lead enrichment |
| 3 | **Opportunities** | Qualified deals in pipeline, revenue tracking, expected closing dates, win/loss tracking |
| 4 | **Lead-to-Opportunity Conversion** | Qualification wizard with merge/convert options, duplicate detection |
| 5 | **Activities** | Activity types (email, call, meeting, to-do), scheduling, follow-up reminders, overdue tracking, activity plans |
| 6 | **Sales Teams** | Team configuration, team members, team dashboard with KPIs, email aliases, invoicing targets |
| 7 | **Lead Assignment** | Rule-based auto-assignment, round-robin, capacity-based, manual/scheduled modes |
| 8 | **Lead Scoring** | Predictive scoring based on historical win/loss data, configurable variables, auto-probability |
| 9 | **Lost Reasons** | Mark as lost with reason + notes, restore functionality, win/loss analysis |
| 10 | **Quotations Integration** | Create quotations from opportunities, smart button counts, revenue flow tracking |
| 11 | **Recurring Revenue** | MRR/ARR tracking, recurring plans (monthly/quarterly/yearly), prorated revenue |
| 12 | **Email Integration** | Email aliases per team, email tracking, UTM campaign/medium/source tracking, mass mailing |
| 13 | **Phone Integration** | Click-to-call, call logging, phone/mobile fields with validation |
| 14 | **Meetings & Calendar** | Schedule meetings from opportunities, calendar view, meeting smart button |
| 15 | **Customer 360** | Full interaction history, chatter, activities, linked quotations/orders/meetings |
| 16 | **Duplicate Detection** | Auto-detect duplicates by email/phone, merge wizard |
| 17 | **Reporting & Analytics** | Pipeline analysis, forecast, lead analysis, activity analysis — pivot/graph/cohort views |
| 18 | **Dashboard** | Pipeline kanban, team dashboard cards, KPI summaries |
| 19 | **Tags** | Color-coded tags for categorization |
| 20 | **Configuration & Settings** | Lead mining, scoring, assignment, recurring revenue, enrichment toggles |

---

## Database Schema

### Enums

```prisma
enum LeadType {
  LEAD
  OPPORTUNITY
}

enum LeadPriority {
  LOW           // 0 - Normal
  MEDIUM        // 1 - Good
  HIGH          // 2 - Very Good
  URGENT        // 3 - Excellent
}

enum ActivityState {
  OVERDUE       // Past due date
  TODAY         // Due today
  PLANNED       // Future due date
}

enum ActivityAction {
  EMAIL
  PHONE_CALL
  MEETING
  TODO
  UPLOAD_DOCUMENT
  REQUEST_SIGNATURE
}

enum ActivityChaining {
  SUGGEST       // Suggest next activity
  TRIGGER       // Auto-trigger next activity
}

enum PhoneQuality {
  CORRECT
  INCORRECT
}

enum EmailQuality {
  CORRECT
  INCORRECT
}

enum AssignmentMode {
  MANUAL
  REPEATED
}

enum AssignmentInterval {
  MINUTES
  HOURS
  DAYS
  WEEKS
}

enum RecurringPeriod {
  MONTHLY
  QUARTERLY
  YEARLY
}
```

### Core Models

```prisma
// ============================================================
// PIPELINE STAGES
// ============================================================

model CrmStage {
  id           String    @id @default(cuid())
  name         String                          // e.g. "New", "Qualified", "Proposition", "Won"
  sequence     Int       @default(1)           // display order
  isWon        Boolean   @default(false)       // marks the "Won" stage
  requirements String?                         // internal requirements text
  teamId       String?                         // restrict to specific team (null = all teams)
  team         SalesTeam? @relation(fields: [teamId], references: [id], onDelete: SetNull)
  fold         Boolean   @default(false)       // fold column in kanban when empty
  leads        CrmLead[]
  companyId    String
  company      Company   @relation(fields: [companyId], references: [id])
  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt
}

// ============================================================
// LEADS & OPPORTUNITIES (Unified Model — crm.lead)
// ============================================================

model CrmLead {
  id                     String       @id @default(cuid())
  name                   String                          // opportunity title
  type                   LeadType     @default(LEAD)     // LEAD or OPPORTUNITY
  active                 Boolean      @default(true)     // false when lost
  color                  Int          @default(0)        // kanban color index
  priority               LeadPriority @default(LOW)

  // --- Pipeline ---
  stageId                String
  stage                  CrmStage     @relation(fields: [stageId], references: [id])
  userId                 String?                         // assigned salesperson
  user                   User?        @relation(fields: [userId], references: [id])
  teamId                 String?
  team                   SalesTeam?   @relation(fields: [teamId], references: [id], onDelete: SetNull)

  // --- Revenue ---
  expectedRevenue        Decimal      @default(0)        // deal value
  proratedRevenue        Decimal      @default(0)        // expectedRevenue × probability (computed)
  currencyId             String
  currency               Currency     @relation(fields: [currencyId], references: [id])

  // --- Recurring Revenue ---
  recurringRevenue       Decimal      @default(0)
  recurringPlanId        String?
  recurringPlan          RecurringPlan? @relation(fields: [recurringPlanId], references: [id])
  recurringRevenueMonthly        Decimal @default(0)     // computed: expected MRR
  recurringRevenueMonthlyProrated Decimal @default(0)    // computed: prorated MRR

  // --- Probability & Scoring ---
  probability            Float        @default(10)       // 0-100, avg aggregation
  automatedProbability   Float?                          // ML-computed probability
  isAutomatedProbability Boolean      @default(true)     // user hasn't overridden

  // --- Dates ---
  dateDeadline           DateTime?                       // expected closing date
  dateClosed             DateTime?                       // when won/lost
  dateOpen               DateTime?                       // when salesperson assigned
  dateConversion         DateTime?                       // when lead → opportunity
  dateLastStageUpdate    DateTime?                       // last stage change
  dateAutomationLast     DateTime?                       // last auto-action
  dayOpen                Float?                          // computed: days to assign
  dayClose               Float?                          // computed: days to close

  // --- Contact / Partner ---
  partnerId              String?
  partner                Partner?     @relation(fields: [partnerId], references: [id])
  partnerName            String?                         // company name (before partner creation)
  contactName            String?                         // contact person name
  titleId                String?
  title                  PartnerTitle? @relation(fields: [titleId], references: [id])
  function               String?                         // job position
  emailFrom              String?                         // contact email
  emailNormalized        String?                         // normalized email
  emailDomainCriterion   String?                         // domain for matching
  phone                  String?
  mobile                 String?
  phoneSanitized         String?                         // cleaned phone number
  phoneState             PhoneQuality?
  emailState             EmailQuality?
  website                String?

  // --- Address ---
  street                 String?
  street2                String?
  city                   String?
  zip                    String?
  stateId                String?
  state                  CountryState? @relation(fields: [stateId], references: [id])
  countryId              String?
  country                Country?     @relation(fields: [countryId], references: [id])

  // --- Language ---
  langId                 String?
  lang                   Language?    @relation(fields: [langId], references: [id])

  // --- UTM Tracking ---
  campaignId             String?
  campaign               UtmCampaign? @relation(fields: [campaignId], references: [id])
  mediumId               String?
  medium                 UtmMedium?   @relation(fields: [mediumId], references: [id])
  sourceId               String?
  source                 UtmSource?   @relation(fields: [sourceId], references: [id])

  // --- Loss ---
  lostReasonId           String?
  lostReason             CrmLostReason? @relation(fields: [lostReasonId], references: [id])
  lostNotes              String?                         // closing note when marking lost

  // --- References ---
  referred               String?                         // referred by
  description            String?                         // internal notes (HTML)

  // --- Relationships ---
  tags                   CrmTag[]     @relation("LeadTags")
  activities             Activity[]
  meetings               CalendarEvent[]
  messages               Message[]                       // chatter messages
  followers              Follower[]                      // followers list

  // --- Computed / Display ---
  messageBounce          Int          @default(0)        // email bounce count

  // --- Meta ---
  companyId              String
  company                Company      @relation(fields: [companyId], references: [id])
  createdAt              DateTime     @default(now())
  updatedAt              DateTime     @updatedAt

  @@index([emailNormalized])
  @@index([phoneSanitized])
  @@index([dateLastStageUpdate])
  @@index([emailDomainCriterion])
}

// ============================================================
// TAGS
// ============================================================

model CrmTag {
  id        String    @id @default(cuid())
  name      String                              // e.g. "VIP", "Hot Lead", "Returning"
  color     Int       @default(0)               // color index for badge display
  leads     CrmLead[] @relation("LeadTags")
  createdAt DateTime  @default(now())
}

// ============================================================
// LOST REASONS
// ============================================================

model CrmLostReason {
  id         String    @id @default(cuid())
  name       String                              // e.g. "Too Expensive", "Competitor", "No Budget"
  active     Boolean   @default(true)
  leads      CrmLead[]
  leadsCount Int       @default(0)               // computed: linked lost leads count
  createdAt  DateTime  @default(now())
  updatedAt  DateTime  @updatedAt
}

// ============================================================
// SALES TEAMS
// ============================================================

model SalesTeam {
  id                       String    @id @default(cuid())
  name                     String
  sequence                 Int       @default(10)
  active                   Boolean   @default(true)
  useLeads                 Boolean   @default(false)     // enable lead qualification step
  useOpportunities         Boolean   @default(true)

  // --- Email Alias ---
  aliasEmail               String?                       // e.g. "sales@company.com"
  aliasName                String?                       // alias name part

  // --- Assignment ---
  assignmentEnabled        Boolean   @default(false)
  assignmentAutoEnabled    Boolean   @default(false)     // scheduled auto-assignment
  assignmentOptout         Boolean   @default(false)     // skip auto assignment
  assignmentDomain         String?                       // JSON filter for lead assignment

  // --- Targets ---
  invoicingTarget          Decimal   @default(0)         // monthly revenue target

  // --- Custom Properties ---
  leadPropertiesDefinition Json?                         // JSON schema for custom lead fields

  // --- Relationships ---
  members                  SalesTeamMember[]
  stages                   CrmStage[]
  leads                    CrmLead[]

  // --- Computed Stats (query-time) ---
  // leadUnassignedCount, opportunitiesCount, opportunitiesAmount,
  // opportunitiesOverdueCount, opportunitiesOverdueAmount,
  // leadAllAssignedMonthCount, leadAllAssignedMonthExceeded

  // --- Meta ---
  companyId                String
  company                  Company   @relation(fields: [companyId], references: [id])
  createdAt                DateTime  @default(now())
  updatedAt                DateTime  @updatedAt
}

// ============================================================
// SALES TEAM MEMBERS
// ============================================================

model SalesTeamMember {
  id                  String    @id @default(cuid())
  teamId              String
  team                SalesTeam @relation(fields: [teamId], references: [id], onDelete: Cascade)
  userId              String
  user                User      @relation(fields: [userId], references: [id])

  // --- Assignment ---
  assignmentDomain    String?                             // individual filter criteria (JSON)
  assignmentOptout    Boolean   @default(false)           // skip auto assignment
  assignmentMax       Int       @default(30)              // monthly capacity (leads per 30 days)

  // --- Computed (query-time) ---
  // leadDayCount: leads assigned in last 24h
  // leadMonthCount: leads assigned in last 30 days

  createdAt           DateTime  @default(now())
  updatedAt           DateTime  @updatedAt

  @@unique([teamId, userId])
}

// ============================================================
// RECURRING PLANS
// ============================================================

model RecurringPlan {
  id              String    @id @default(cuid())
  name            String                                   // e.g. "Monthly", "Yearly", "3 Years"
  numberOfMonths  Int                                      // duration in months
  active          Boolean   @default(true)
  sequence        Int       @default(10)
  leads           CrmLead[]
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
}

// ============================================================
// LEAD SCORING FREQUENCY
// ============================================================

model LeadScoringFrequency {
  id        String     @id @default(cuid())
  variable  String                                         // field name being tracked
  value     String                                         // field value
  wonCount  Float      @default(0.1)                       // +0.1 to avoid division by zero
  lostCount Float      @default(0.1)
  teamId    String?
  team      SalesTeam? @relation(fields: [teamId], references: [id], onDelete: Cascade)
  createdAt DateTime   @default(now())
  updatedAt DateTime   @updatedAt

  @@index([variable])
  @@index([teamId])
}

// ============================================================
// ACTIVITIES
// ============================================================

model ActivityType {
  id              String           @id @default(cuid())
  name            String                                   // e.g. "Email", "Phone Call", "Meeting"
  action          ActivityAction                           // determines behavior
  defaultDays     Int              @default(0)             // schedule offset
  defaultUnit     String           @default("days")        // days, weeks, months
  icon            String?                                  // icon identifier
  chainingType    ActivityChaining @default(SUGGEST)       // suggest or trigger next
  suggestNextId   String?                                  // suggested next activity type
  suggestNext     ActivityType?    @relation("ChainedActivity", fields: [suggestNextId], references: [id])
  chainedFrom     ActivityType[]   @relation("ChainedActivity")
  activities      Activity[]
  companyId       String
  company         Company          @relation(fields: [companyId], references: [id])
  createdAt       DateTime         @default(now())
  updatedAt       DateTime         @updatedAt
}

model ActivityPlan {
  id          String             @id @default(cuid())
  name        String                                       // e.g. "New Client Onboarding"
  active      Boolean            @default(true)
  templates   ActivityPlanTemplate[]
  companyId   String
  company     Company            @relation(fields: [companyId], references: [id])
  createdAt   DateTime           @default(now())
  updatedAt   DateTime           @updatedAt
}

model ActivityPlanTemplate {
  id             String       @id @default(cuid())
  planId         String
  plan           ActivityPlan @relation(fields: [planId], references: [id], onDelete: Cascade)
  activityTypeId String
  activityType   ActivityType @relation(fields: [activityTypeId], references: [id])
  summary        String?
  note           String?                                   // HTML description
  delayDays      Int          @default(0)
  delayUnit      String       @default("days")
  responsibleType String     @default("assigned")          // assigned, coach, specific
  responsibleId  String?                                   // specific user
  sequence       Int          @default(10)
}

model Activity {
  id              String       @id @default(cuid())
  activityTypeId  String
  activityType    ActivityType @relation(fields: [activityTypeId], references: [id])
  summary         String?                                  // short description
  note            String?                                  // detailed notes (HTML)
  dateDue         DateTime                                 // deadline
  userId          String                                   // assigned to
  user            User         @relation(fields: [userId], references: [id])
  leadId          String?                                  // polymorphic: linked CRM lead
  lead            CrmLead?     @relation(fields: [leadId], references: [id], onDelete: Cascade)
  calendarEventId String?                                  // linked meeting (for Meeting type)
  calendarEvent   CalendarEvent? @relation(fields: [calendarEventId], references: [id])
  state           ActivityState                            // computed from dateDue vs today
  done            Boolean      @default(false)
  doneDate        DateTime?
  feedback        String?                                  // completion feedback
  companyId       String
  company         Company      @relation(fields: [companyId], references: [id])
  createdAt       DateTime     @default(now())
  updatedAt       DateTime     @updatedAt
}

// ============================================================
// CALENDAR / MEETINGS
// ============================================================

model CalendarEvent {
  id              String    @id @default(cuid())
  name            String                                   // meeting subject
  start           DateTime
  stop            DateTime
  allDay          Boolean   @default(false)
  location        String?
  description     String?                                  // HTML notes
  leadId          String?                                  // linked opportunity
  lead            CrmLead?  @relation(fields: [leadId], references: [id])
  userId          String                                   // organizer
  user            User      @relation(fields: [userId], references: [id])
  attendeeIds     CalendarAttendee[]
  activities      Activity[]
  recurrency      Boolean   @default(false)
  interval        Int?
  rruleType       String?                                  // daily, weekly, monthly, yearly
  endType         String?                                  // count, end_date, forever
  count           Int?
  until           DateTime?
  companyId       String
  company         Company   @relation(fields: [companyId], references: [id])
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
}

model CalendarAttendee {
  id        String        @id @default(cuid())
  eventId   String
  event     CalendarEvent @relation(fields: [eventId], references: [id], onDelete: Cascade)
  partnerId String
  partner   Partner       @relation(fields: [partnerId], references: [id])
  state     String        @default("needsAction")         // needsAction, accepted, declined, tentative
}

// ============================================================
// UTM TRACKING
// ============================================================

model UtmCampaign {
  id        String    @id @default(cuid())
  name      String
  active    Boolean   @default(true)
  leads     CrmLead[]
  companyId String
  company   Company   @relation(fields: [companyId], references: [id])
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt
}

model UtmMedium {
  id        String    @id @default(cuid())
  name      String                                         // e.g. "Email", "Website", "Phone"
  active    Boolean   @default(true)
  leads     CrmLead[]
  createdAt DateTime  @default(now())
}

model UtmSource {
  id        String    @id @default(cuid())
  name      String                                         // e.g. "Google Ads", "Newsletter", "Referral"
  active    Boolean   @default(true)
  leads     CrmLead[]
  createdAt DateTime  @default(now())
}

// ============================================================
// CHATTER (Messages & Followers)
// ============================================================

model Message {
  id          String    @id @default(cuid())
  body        String                                       // HTML message content
  messageType String   @default("comment")                 // comment, note, notification, email
  authorId    String?
  author      User?     @relation(fields: [authorId], references: [id])
  leadId      String?
  lead        CrmLead?  @relation(fields: [leadId], references: [id], onDelete: Cascade)
  subtype     String?                                      // e.g. "Discussions", "Note", "Stage Changed"
  emailFrom   String?
  replyTo     String?
  parentId    String?                                      // threaded replies
  parent      Message?  @relation("MessageThread", fields: [parentId], references: [id])
  replies     Message[] @relation("MessageThread")
  attachments Attachment[]
  createdAt   DateTime  @default(now())
}

model Follower {
  id        String    @id @default(cuid())
  partnerId String
  partner   Partner   @relation(fields: [partnerId], references: [id])
  leadId    String?
  lead      CrmLead?  @relation(fields: [leadId], references: [id], onDelete: Cascade)
  // Subtypes this follower is subscribed to
  subtypes  String[]  @default(["discussions", "activities", "note"])
  createdAt DateTime  @default(now())

  @@unique([partnerId, leadId])
}

model Attachment {
  id          String    @id @default(cuid())
  name        String                                       // filename
  mimeType    String?
  fileSize    Int?
  url         String?                                      // stored file URL
  messageId   String?
  message     Message?  @relation(fields: [messageId], references: [id])
  createdAt   DateTime  @default(now())
}

// ============================================================
// CRM SETTINGS (per company)
// ============================================================

model CrmSettings {
  id                       String    @id @default(cuid())

  // --- Lead Features ---
  useLeads                 Boolean   @default(false)       // enable lead qualification step
  useRecurringRevenue      Boolean   @default(false)

  // --- Lead Scoring ---
  predictiveScoringEnabled Boolean   @default(true)
  scoringVariables         String[]  @default(["stage_id", "team_id"])  // fields for scoring
  scoringLeadsAfter        DateTime?                       // only score leads after this date

  // --- Lead Assignment ---
  assignmentMode           AssignmentMode @default(MANUAL)
  assignmentInterval       AssignmentInterval @default(HOURS)
  assignmentIntervalNumber Int       @default(1)
  assignmentNextRun        DateTime?

  // --- Lead Enrichment ---
  leadEnrichmentEnabled    Boolean   @default(false)
  leadEnrichmentAuto       Boolean   @default(false)       // auto-enrich every 60 min

  // --- Lead Mining ---
  leadMiningEnabled        Boolean   @default(false)

  companyId                String    @unique
  company                  Company   @relation(fields: [companyId], references: [id])
  updatedAt                DateTime  @updatedAt
}
```

---

## UI Structure

### Sidebar Navigation (CRM Module)

```
CRM
├── Sales
│   ├── My Pipeline                  (Kanban — current user's opportunities)
│   ├── My Activities                (Activity view — scheduled tasks)
│   ├── Teams                        (Team dashboard — managers only)
│   └── Customers                    (Partner/contact list)
│
├── Leads                            (requires "Use Leads" enabled)
│   └── Leads                        (List/Kanban of unqualified leads)
│
├── Reporting
│   ├── Forecast                     (Revenue forecast — next 4 months)
│   ├── Pipeline Analysis            (Pivot/Graph/Cohort)
│   ├── Lead Analysis                (Lead-specific metrics)
│   └── Activity Analysis            (Activity performance)
│
└── Configuration
    ├── Settings                     (Module-level toggles)
    ├── Opportunities
    │   ├── Sales Teams
    │   └── Team Members
    ├── Activities
    │   ├── Activity Types
    │   └── Activity Plans
    ├── Recurring Plans              (when enabled)
    └── Pipeline
        ├── Stages
        ├── Tags
        └── Lost Reasons
```

### Pipeline Kanban View (Default — My Pipeline)

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ Breadcrumb: CRM > My Pipeline     [+ New]  [Import]    🔍 Search / Filter   │
│ Views: [■ Kanban] [≡ List] [📊 Graph] [📋 Pivot] [📅 Calendar] [● Activity]│
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│ ┌── New ─────────┐ ┌── Qualified ────┐ ┌── Proposition ─┐ ┌── Won ────────┐│
│ │  $45,200       │ │  $128,000       │ │  $87,500        │ │  $312,000     ││
│ │                │ │                 │ │                 │ │               ││
│ │ ┌────────────┐ │ │ ┌─────────────┐ │ │ ┌─────────────┐ │ │ ┌───────────┐││
│ │ │ Tour Pkg   │ │ │ │ Hotel Deal  │ │ │ │ Group Tour  │ │ │ │ VIP Tour  │││
│ │ │ ABC Travel │ │ │ │ XYZ Corp    │ │ │ │ MNO Agency  │ │ │ │ PQR Ltd   │││
│ │ │ $12,000    │ │ │ │ $45,000     │ │ │ │ $30,000     │ │ │ │ $85,000   │││
│ │ │ ★★☆ 🟢    │ │ │ │ ★★★ 🟠     │ │ │ │ ★★☆ 🔴     │ │ │ │ ★★★      │││
│ │ │ [VIP][Hot] │ │ │ │ [B2B]      │ │ │ │ [Group]     │ │ │ │ [VIP]     │││
│ │ │ 👤 John    │ │ │ │ 👤 Sarah   │ │ │ │ 👤 Ahmed    │ │ │ │ 👤 Sarah  │││
│ │ └────────────┘ │ │ └─────────────┘ │ │ └─────────────┘ │ │ └───────────┘││
│ │                │ │                 │ │                 │ │               ││
│ │ ┌────────────┐ │ │ ┌─────────────┐ │ │                 │ │               ││
│ │ │ Airport Tx │ │ │ │ MICE Event  │ │ │                 │ │               ││
│ │ │ DEF Corp   │ │ │ │ RST Inc     │ │ │                 │ │               ││
│ │ │ $3,200     │ │ │ │ $83,000     │ │ │                 │ │               ││
│ │ │ ★☆☆ 🟢    │ │ │ │ ★★★ 🟢     │ │ │                 │ │               ││
│ │ │ 👤 Ahmed   │ │ │ │ 👤 John    │ │ │                 │ │               ││
│ │ └────────────┘ │ │ └─────────────┘ │ │                 │ │               ││
│ │                │ │                 │ │                 │ │               ││
│ │ [+ Quick Add] │ │ [+ Quick Add]   │ │ [+ Quick Add]   │ │               ││
│ └────────────────┘ └─────────────────┘ └─────────────────┘ └───────────────┘│
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘

Card legend:  ★ = Priority   🟢 = Planned activity   🟠 = Due today   🔴 = Overdue
              [Tag] = Colored tag badges   👤 = Assigned salesperson avatar
```

### Opportunity Form View

```
┌──────────────────────────────────────────────────────────────────┐
│ Buttons: [Mark Won] [Lost ▾]  [New Quotation]                   │
│                                                                  │
│ Statusbar: [● New] ─── [○ Qualified] ─── [○ Proposition] ─── [○ Won] │
├──────────────────────────────────────────────────────────────────┤
│ [LOST ribbon]  or  [WON ribbon]  (when applicable)               │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Tour Package Deal for ABC Travel Agency                         │
│  ═══════════════════════════════════════                         │
│                                                                  │
│  Expected Revenue: [$12,000___]    Recurring Rev: [$2,000____]   │
│  Recurring Plan:   [Monthly___▾]   Probability:   [40_____%]    │
│                                                                  │
│  ┌─── Left Column ───────────┐  ┌─── Right Column ────────────┐ │
│  │ Customer:    [ABC Travel▾]│  │ Expected Closing: [03/2026] │ │
│  │ Email:       [abc@test.co]│  │ Priority:    [★★☆ ]         │ │
│  │ Phone:       [+1234567890]│  │ Tags:        [VIP] [Hot]    │ │
│  │ Mobile:      [+0987654321]│  │ Salesperson: [John ▾]       │ │
│  │ Best Phone:  [✓ correct  ]│  │ Sales Team:  [Direct Sales▾]│ │
│  │ Best Email:  [✓ correct  ]│  │ Company:     [iTour Co]     │ │
│  └───────────────────────────┘  └─────────────────────────────┘ │
│                                                                  │
│  ┌─ Internal Notes ──┬─ Extra Information ─────────────────────┐ │
│  │                                                             │ │
│  │  Client interested in premium tour packages for their       │ │
│  │  corporate retreat. Budget approved. Need to finalize       │ │
│  │  dates and hotel selection.                                 │ │
│  │                                                             │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  Smart Buttons: [📝 2 Quotations] [📦 1 Order] [📅 3 Meetings] │
├──────────────────────────────────────────────────────────────────┤
│ CHATTER                                                          │
│ [Send Message] [Log Note] [Schedule Activity]                    │
│                                                                  │
│ ┌────────────────────────────────────────────────────────────┐   │
│ │ Feb 20, 2026 — John Smith                                 │   │
│ │ Stage changed: New → Qualified                             │   │
│ │                                                            │   │
│ │ Feb 19, 2026 — Sarah Johnson                              │   │
│ │ 📧 Email sent to abc@test.co                              │   │
│ │                                                            │   │
│ │ Feb 18, 2026 — System                                     │   │
│ │ Lead created from email alias sales@itour.com             │   │
│ └────────────────────────────────────────────────────────────┘   │
│                                                                  │
│ Followers: 👤 John Smith, 👤 Sarah Johnson                      │
└──────────────────────────────────────────────────────────────────┘
```

### Extra Information Tab

```
┌─ Extra Information ──────────────────────────────────────────────┐
│                                                                  │
│  ┌─── Contact ────────────────┐  ┌─── Marketing ─────────────┐  │
│  │ Company Name: [ABC Travel] │  │ Campaign: [Summer 2026 ▾] │  │
│  │ Contact:      [John Doe]   │  │ Medium:   [Email ▾]       │  │
│  │ Title:        [Mr. ▾]      │  │ Source:   [Newsletter ▾]  │  │
│  │ Job Position: [CEO]        │  │                           │  │
│  │ Mobile:       [+123456]    │  │ Referred By: [Partner X]  │  │
│  │ Address:      [123 Main St]│  │                           │  │
│  │ City:         [Dubai]      │  └───────────────────────────┘  │
│  │ Country:      [UAE ▾]      │                                  │
│  │ Language:     [English ▾]  │  ┌─── Misc ──────────────────┐  │
│  └────────────────────────────┘  │ Type: [Opportunity]       │  │
│                                  │ Date Open: 2026-02-18     │  │
│                                  │ Date Closed: —            │  │
│                                  │ Days to Assign: 1.5       │  │
│                                  │ Days to Close: —          │  │
│                                  └───────────────────────────┘  │
└──────────────────────────────────────────────────────────────────┘
```

### Sales Team Dashboard

```
┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│ Direct Sales │ │ B2B Partners │ │ Online Sales │ │ MICE Team    │
│              │ │              │ │              │ │              │
│ 12 Open Opp  │ │ 8 Open Opp   │ │ 23 Open Opp  │ │ 5 Open Opp   │
│ 3 Quotations │ │ 5 Quotations │ │ 12 Quotations│ │ 2 Quotations │
│ 1 Order      │ │ 2 Orders     │ │ 5 Orders     │ │ 1 Order      │
│ $145,000     │ │ $280,000     │ │ $89,000      │ │ $520,000     │
│              │ │              │ │              │ │              │
│ ╭──────────╮ │ │ ╭──────────╮ │ │ ╭──────────╮ │ │ ╭──────────╮ │
│ │▓▓▓▒▒▒▒▒▒│ │ │ │▓▓▓▓▓▓▒▒▒│ │ │ │▓▓▒▒▒▒▒▒▒│ │ │ │▓▓▓▓▓▓▓▒▒│ │
│ ╰──────────╯ │ │ ╰──────────╯ │ │ ╰──────────╯ │ │ ╰──────────╯ │
│ New/week     │ │ New/week     │ │ New/week     │ │ New/week     │
│              │ │              │ │              │ │              │
│ Target:$200k │ │ Target:$350k │ │ Target:$100k │ │ Target:$600k │
│ ████████░░░░ │ │ ████████████ │ │ ██████░░░░░░ │ │ ██████████░░ │
│  72%         │ │  105% ✓      │ │  45%         │ │  87%         │
└──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘
```

### Activity View

```
┌──────────────────────────────────────────────────────────────────┐
│                 │ Email │ Phone Call │ Meeting │ To-Do │ Upload  │
├─────────────────┼───────┼───────────┼─────────┼───────┼─────────┤
│ Tour Pkg $12k   │  🟢   │    🔴     │   🟠    │       │         │
│ Hotel Deal $45k │       │    🟢     │         │  🟢   │         │
│ Group Tour $30k │  🔴   │           │   🟢    │       │   🟢    │
│ Airport Tx $3k  │       │           │         │  🟠   │         │
│ MICE Event $83k │  🟢   │    🟢     │   🟢    │  🟢   │         │
└─────────────────┴───────┴───────────┴─────────┴───────┴─────────┘
🟢 = Planned (future)   🟠 = Due today   🔴 = Overdue
```

### Mark Lost Dialog

```
┌─────────────────────────────────────────────┐
│ Mark as Lost                            [×] │
├─────────────────────────────────────────────┤
│                                             │
│ Lost Reason: [Too Expensive           ▾]    │
│                                             │
│ Closing Note:                               │
│ ┌─────────────────────────────────────────┐ │
│ │ Client went with a cheaper competitor   │ │
│ │ offering similar packages at 20% less.  │ │
│ └─────────────────────────────────────────┘ │
│                                             │
│              [Cancel]  [Mark as Lost]       │
└─────────────────────────────────────────────┘
```

### Lead-to-Opportunity Conversion Dialog

```
┌─────────────────────────────────────────────┐
│ Convert to Opportunity                  [×] │
├─────────────────────────────────────────────┤
│                                             │
│ Conversion Action:                          │
│ ○ Convert to opportunity                    │
│ ○ Merge with existing opportunities         │
│                                             │
│ Salesperson: [John Smith          ▾]        │
│ Sales Team:  [Direct Sales        ▾]        │
│                                             │
│ Similar Leads/Opportunities:                │
│ ┌─────────────────────────────────────────┐ │
│ │ ☐ OPP-001 — Same client, $8,000       │ │
│ │ ☐ LEAD-042 — Same email domain         │ │
│ └─────────────────────────────────────────┘ │
│                                             │
│              [Cancel]  [Convert]            │
└─────────────────────────────────────────────┘
```

---

## Views Per Section

| Section | Views | Key Features |
|---------|-------|-------------|
| **My Pipeline** | Kanban (default), List, Graph, Pivot, Calendar, Activity | Drag-and-drop stages, revenue totals per column, activity indicators, quick-create cards |
| **Leads** | List (default), Kanban, Form | Lead list with email/phone quality indicators, convert-to-opportunity button |
| **Opportunity Form** | Form | Status bar, smart buttons (Quotations/Orders/Meetings), inline revenue/probability, chatter, tabs |
| **Activities** | Activity view, List | Activity grid by type, color-coded status, schedule/mark done |
| **Team Dashboard** | Kanban | Team cards with open opp count, quotation count, revenue, bar graph, target progress |
| **Forecast** | Graph, Pivot, List, Cohort | Expected revenue by closing month, prorated amounts, 4-month window |
| **Pipeline Analysis** | Pivot (default), Graph, Cohort, List | Cross-tab by stage/user/team/date, measures: revenue/count/days to close |
| **Lead Analysis** | Pivot, Graph, List | Lead-specific: source, medium, campaign, conversion rates |
| **Activity Analysis** | Pivot, Graph, List | Activity completion rates, overdue counts, by type/user/team |
| **Stages Config** | List, Form | Sequence ordering, team assignment, won flag, requirements |
| **Tags** | List | Color picker, name editing |
| **Lost Reasons** | List | Name, active toggle, leads count |

### Search Filters & Group By

**Filters:**
- My Pipeline (current user)
- Unassigned (no salesperson)
- Open Opportunities (probability < 100)
- Unread Messages
- Won (is_won = true)
- Lost (probability = 0, active = false)
- Late Activities (overdue)
- Today Activities
- Future Activities
- Creation Date (range)
- Close Date (range)

**Group By:**
- Salesperson, Sales Team, Stage
- City, Country, Lost Reason, Company
- Campaign, Medium, Source
- Priority, Tags
- Creation Date, Conversion Date, Expected Closing, Closed Date

---

## Business Logic & Workflows

### Lead & Opportunity Lifecycle

```
[Lead Created]                        (type = LEAD, various sources)
     │
     │  Sources: Manual, Email Alias, Web Form, Lead Mining, Import
     │
     ▼
[Lead Qualification]                  (review, enrich, validate contact info)
     │
     │  [Convert to Opportunity] button
     │  Optionally merge with existing duplicates
     │
     ▼
[Opportunity in Pipeline]             (type = OPPORTUNITY)
     │
     ├──→ New (10%) ──→ Qualified (40%) ──→ Proposition (60%) ──→ Won (100%)
     │
     └──→ [Mark as Lost] at any stage ──→ Lost (probability=0, active=false)
                                              │
                                              └──→ [Restore] ──→ back to pipeline
```

### Stage Transition Logic

1. Moving an opportunity to a new stage updates `dateLastStageUpdate`
2. Probability auto-updates from predictive scoring (if `isAutomatedProbability = true`)
3. Moving to a `isWon = true` stage:
   - Sets `probability = 100`
   - Sets `dateClosed = now()`
   - Shows "WON" ribbon on form
4. Marking as lost:
   - Sets `probability = 0`
   - Sets `active = false`
   - Sets `dateClosed = now()`
   - Records `lostReasonId` and `lostNotes`
   - Shows "LOST" ribbon on form

### Lead-to-Opportunity Conversion

1. User clicks "Convert to Opportunity" on lead form
2. System shows conversion dialog:
   - Choose: Convert only OR Merge with existing
   - Assign salesperson and team
   - Show duplicate matches (by email/phone)
3. On confirm:
   - `type` changes from `LEAD` to `OPPORTUNITY`
   - `dateConversion = now()`
   - If merging: combine notes, activities, messages from all merged records
   - Redirect to opportunity form in pipeline

### Duplicate Detection

- Duplicates detected by matching:
  - Same `emailNormalized` (excluding empty)
  - Same `phoneSanitized` (excluding empty)
  - Same `emailDomainCriterion` + `partnerName`
- `duplicateLeadCount` computed for each lead
- Shown during conversion and as a warning on the form

### Predictive Lead Scoring

1. Collect historical win/loss data from closed opportunities
2. For each configured variable (stage, team, country, source, etc.):
   - Count wins and losses per variable value
   - Store in `LeadScoringFrequency` table
3. For each active opportunity:
   - `automatedProbability = Π(wonCount / (wonCount + lostCount))` for each variable
   - Normalized to 0-100% range
4. If user manually changes probability → `isAutomatedProbability = false`
5. Recalculation triggered by:
   - Scheduled cron job
   - Manual "Update Probabilities" button in settings
   - Stage changes (if user hasn't overridden)

### Lead Assignment Algorithm

1. Determine eligible leads: match team's `assignmentDomain`
2. For each team member:
   - Check `assignmentOptout = false`
   - Check `leadMonthCount < assignmentMax`
   - Match member's `assignmentDomain` (if set)
3. Assign using round-robin within eligible members
4. Set `userId` and `dateOpen` on the lead
5. Modes:
   - **Manual:** Triggered by clicking "Assign Leads" button
   - **Repeated:** Scheduled at configured interval

### Activity Workflow

1. Schedule activity: choose type, due date, assigned user, summary, notes
2. Activity states auto-computed:
   - `PLANNED` → due date in future
   - `TODAY` → due date is today
   - `OVERDUE` → due date has passed
3. Mark as done: enter feedback, optionally schedule next activity (based on chaining)
4. Activity Plans: schedule multiple activities at once from a template

### Revenue Computation

```
proratedRevenue = expectedRevenue × (probability / 100)
recurringRevenueMonthly = recurringRevenue / recurringPlan.numberOfMonths  (if plan set)
recurringRevenueMonthlyProrated = recurringRevenueMonthly × (probability / 100)
```

### Quotation Creation from Opportunity

1. Click "New Quotation" on opportunity form
2. If no partner linked → prompt to create/select partner
3. Creates `SaleOrder` with `opportunityId` linking back
4. Smart buttons update: Quotations count, Orders count
5. Revenue tracked separately (opportunity expected vs. actual order amounts)

---

## API Routes

```
/api/crm/
│
├── leads/                           GET (list with filters: type, stage, user, team, priority, date range)
│   ├── POST                         Create new lead/opportunity
│   ├── [id]/                        GET, PUT, DELETE
│   ├── [id]/convert                 POST → convert lead to opportunity (with merge options)
│   ├── [id]/mark-won                POST → move to won stage
│   ├── [id]/mark-lost               POST → mark as lost (body: {lostReasonId, lostNotes})
│   ├── [id]/restore                 POST → restore from lost
│   ├── [id]/duplicate-check         GET → find duplicate leads
│   └── [id]/new-quotation           POST → create quotation from opportunity
│
├── stages/                          GET, POST
│   └── [id]/                        GET, PUT, DELETE
│
├── tags/                            GET, POST
│   └── [id]/                        GET, PUT, DELETE
│
├── lost-reasons/                    GET, POST
│   └── [id]/                        GET, PUT, DELETE
│
├── teams/                           GET, POST
│   ├── [id]/                        GET, PUT, DELETE
│   ├── [id]/dashboard               GET (computed KPIs: opp count, revenue, target progress)
│   ├── [id]/assign-leads            POST → trigger manual lead assignment
│   └── [id]/members/                GET, POST
│       └── [memberId]/              GET, PUT, DELETE
│
├── activities/                      GET, POST
│   ├── [id]/                        GET, PUT, DELETE
│   ├── [id]/mark-done               POST (body: {feedback, scheduleNext?})
│   └── [id]/cancel                  POST
│
├── activity-types/                  GET, POST
│   └── [id]/                        GET, PUT, DELETE
│
├── activity-plans/                  GET, POST
│   ├── [id]/                        GET, PUT, DELETE
│   └── [id]/schedule                POST (body: {leadId}) → schedule all plan activities
│
├── calendar/                        GET, POST
│   ├── [id]/                        GET, PUT, DELETE
│   └── [id]/attendees/              GET, POST, DELETE
│
├── recurring-plans/                 GET, POST
│   └── [id]/                        GET, PUT, DELETE
│
├── scoring/
│   ├── frequencies/                 GET (scoring frequency data)
│   └── update-probabilities         POST → recalculate all probabilities
│
├── assignment/
│   ├── run                          POST → trigger manual assignment
│   └── config                       GET, PUT (assignment settings)
│
├── utm/
│   ├── campaigns/                   GET, POST
│   │   └── [id]/                    GET, PUT, DELETE
│   ├── mediums/                     GET, POST
│   │   └── [id]/                    GET, PUT, DELETE
│   └── sources/                     GET, POST
│       └── [id]/                    GET, PUT, DELETE
│
├── messages/                        GET, POST (chatter messages for a lead)
│   └── [id]/                        GET, DELETE
│
├── followers/                       GET, POST, DELETE (lead followers)
│
├── reports/
│   ├── pipeline-analysis            GET (?date_from, ?date_to, ?group_by, ?measures)
│   ├── forecast                     GET (?months_ahead, ?user, ?team)
│   ├── lead-analysis                GET (?date_from, ?date_to, ?source, ?medium, ?campaign)
│   ├── activity-analysis            GET (?date_from, ?date_to, ?user, ?type)
│   └── win-loss                     GET (?date_from, ?date_to, ?team, ?user, ?lost_reason)
│
├── settings/                        GET, PUT (CRM module settings)
│
└── dashboard/                       GET (aggregated: pipeline value, activity counts, team summaries)
```

---

## File Structure

```
src/
├── app/(dashboard)/crm/
│   ├── page.tsx                                 # My Pipeline — kanban view (default)
│   ├── layout.tsx                               # CRM module sidebar layout
│   │
│   ├── pipeline/
│   │   ├── page.tsx                             # Pipeline kanban (alias of main page)
│   │   └── [id]/page.tsx                        # Opportunity form view
│   │
│   ├── leads/
│   │   ├── page.tsx                             # Leads list view
│   │   ├── new/page.tsx                         # Create new lead
│   │   └── [id]/page.tsx                        # Lead form view
│   │
│   ├── activities/
│   │   └── page.tsx                             # My Activities — activity grid view
│   │
│   ├── teams/
│   │   ├── page.tsx                             # Teams dashboard — kanban cards
│   │   └── [id]/
│   │       ├── page.tsx                         # Team detail / edit
│   │       └── members/page.tsx                 # Team members management
│   │
│   ├── customers/
│   │   ├── page.tsx                             # Customer/partner list
│   │   └── [id]/page.tsx                        # Customer detail (360 view)
│   │
│   ├── calendar/
│   │   └── page.tsx                             # Calendar view of meetings
│   │
│   ├── reporting/
│   │   ├── forecast/page.tsx                    # Revenue forecast
│   │   ├── pipeline-analysis/page.tsx           # Pipeline analysis (pivot/graph/cohort)
│   │   ├── lead-analysis/page.tsx               # Lead analysis
│   │   └── activity-analysis/page.tsx           # Activity analysis
│   │
│   └── configuration/
│       ├── settings/page.tsx                    # CRM module settings
│       ├── stages/
│       │   ├── page.tsx                         # Stages list
│       │   └── [id]/page.tsx                    # Stage form
│       ├── tags/page.tsx                        # Tags management
│       ├── lost-reasons/page.tsx                # Lost reasons management
│       ├── activity-types/
│       │   ├── page.tsx
│       │   └── [id]/page.tsx
│       ├── activity-plans/
│       │   ├── page.tsx
│       │   └── [id]/page.tsx
│       └── recurring-plans/page.tsx             # Recurring plans config
│
├── components/crm/
│   ├── PipelineKanban.tsx                       # Drag-and-drop kanban board
│   ├── OpportunityCard.tsx                      # Kanban card (revenue, priority, activity, avatar)
│   ├── QuickCreateCard.tsx                      # Inline new opportunity form in kanban
│   ├── OpportunityForm.tsx                      # Full opportunity form with tabs
│   ├── LeadForm.tsx                             # Lead form (pre-qualification)
│   ├── ConvertToOpportunityDialog.tsx           # Lead → opportunity conversion wizard
│   ├── MarkLostDialog.tsx                       # Mark as lost dialog (reason + notes)
│   ├── RegisterPaymentFromOpp.tsx               # Quick link to create quotation
│   ├── ActivityScheduler.tsx                    # Schedule new activity dialog
│   ├── ActivityGrid.tsx                         # Activity view grid (type × record)
│   ├── ActivityIndicator.tsx                    # Green/orange/red activity dot
│   ├── TeamDashboardCard.tsx                    # Team kanban card with KPIs + sparkline
│   ├── ScoringBadge.tsx                         # Probability badge with auto/manual indicator
│   ├── DuplicateWarning.tsx                     # Duplicate detection banner
│   ├── SmartButtons.tsx                         # Quotations / Orders / Meetings count buttons
│   ├── PriorityStars.tsx                        # Star rating widget (0-3)
│   ├── TagBadges.tsx                            # Colored tag badges
│   ├── ForecastChart.tsx                        # Revenue forecast chart
│   ├── WinLossChart.tsx                         # Win/loss ratio visualization
│   ├── CohortTable.tsx                          # Cohort analysis table
│   └── CrmSidebar.tsx                           # Module sidebar navigation
│
├── lib/crm/
│   ├── lead-scoring.ts                          # Predictive scoring computation
│   ├── lead-assignment.ts                       # Auto-assignment algorithm (round-robin, capacity)
│   ├── duplicate-detection.ts                   # Email/phone-based duplicate matching
│   ├── probability-calculator.ts                # Probability computation from scoring frequencies
│   ├── revenue-calculator.ts                    # Prorated revenue computation
│   ├── activity-engine.ts                       # Activity state computation, chaining, due dates
│   ├── pipeline-analytics.ts                    # Pipeline analysis queries (pivot data, cohort)
│   ├── forecast-engine.ts                       # Revenue forecast computation
│   ├── lead-enrichment.ts                       # Lead data enrichment service
│   ├── merge-leads.ts                           # Lead merging logic (combine contacts, notes, activities)
│   └── utm-tracker.ts                           # UTM campaign/medium/source tracking
│
└── prisma/
    └── schema.prisma                            # All CRM models added
```

---

## Shared UI Components

| Component | Purpose | Odoo Equivalent |
|-----------|---------|-----------------|
| `<PipelineKanban>` | Drag-and-drop kanban board grouped by stages, revenue totals per column | Kanban view with `default_group_by="stage_id"` |
| `<OpportunityCard>` | Card: title, partner, revenue, priority stars, activity dot, user avatar, tags | Kanban card template |
| `<QuickCreateCard>` | Inline form in kanban column: partner, name, email, phone, revenue | `quick_create` |
| `<ConvertToOpportunityDialog>` | Wizard: convert/merge options, salesperson, team, duplicate list | `crm.lead2opportunity.partner` wizard |
| `<MarkLostDialog>` | Dialog: lost reason dropdown, closing notes textarea | `crm.lead.lost` wizard |
| `<ActivityScheduler>` | Dialog: type, due date, assigned user, summary, notes | `mail.activity` form |
| `<ActivityGrid>` | Matrix: activity types (columns) × records (rows), colored dots | Activity view |
| `<ActivityIndicator>` | Green/orange/red dot indicating activity status | `kanban_activity` widget |
| `<TeamDashboardCard>` | Card: opp count, quotation count, revenue, sparkline, target bar | Team kanban |
| `<ScoringBadge>` | Probability % with auto/manual indicator and tooltip | `probability` widget |
| `<PriorityStars>` | Clickable star rating (0-3 stars) | `priority` widget |
| `<TagBadges>` | Colored badge chips for tags | `many2many_tags` widget |
| `<SmartButtons>` | Count buttons: Quotations, Orders, Meetings | Smart buttons |
| `<DuplicateWarning>` | Banner: "X potential duplicate(s) found" with view link | Duplicate detection alert |
| `<ForecastChart>` | Bar/line chart: expected revenue by closing month | Forecast report graph |
| `<CohortTable>` | Time-period analysis table with color-coded cells | Cohort view |

---

## Implementation Phases

| Phase | Scope | Description |
|-------|-------|-------------|
| **Phase 1: Foundation** | CrmStage, CrmTag, CrmLostReason, SalesTeam, SalesTeamMember, CrmSettings | Core configuration entities. Stages, teams, tags, lost reasons. |
| **Phase 2: Pipeline Core** | CrmLead (unified lead/opportunity model), pipeline kanban, opportunity form, list view | The heart of CRM. Kanban board with drag-and-drop, opportunity CRUD, revenue tracking, probability. |
| **Phase 3: Activities** | ActivityType, ActivityPlan, ActivityPlanTemplate, Activity, CalendarEvent, CalendarAttendee | Activity scheduling, activity view grid, calendar integration, chaining/plans. |
| **Phase 4: Chatter** | Message, Follower, Attachment — applied to CrmLead | Full communication history: send messages, log notes, track followers, file attachments. |
| **Phase 5: Lead Qualification** | Lead views, lead-to-opportunity conversion wizard, duplicate detection, merge | Lead list, convert dialog, merge logic, duplicate matching by email/phone. |
| **Phase 6: Lead Scoring & Assignment** | LeadScoringFrequency, predictive scoring engine, assignment algorithm, round-robin | Auto-probability computation, manual/scheduled lead assignment, capacity tracking. |
| **Phase 7: Recurring Revenue** | RecurringPlan, MRR/ARR fields, prorated computation | Recurring revenue tracking on opportunities, MRR calculation, recurring plan configuration. |
| **Phase 8: UTM & Email** | UtmCampaign, UtmMedium, UtmSource, email alias per team, email tracking | Campaign/medium/source tracking, team email aliases, email quality validation. |
| **Phase 9: Reporting** | Pipeline analysis (pivot/graph/cohort), forecast, lead analysis, activity analysis, win/loss | All report views with date ranges, grouping, measures, drill-down, PDF/XLSX export. |
| **Phase 10: Integration** | Quotation creation from opportunity, smart buttons, customer 360 view, team dashboard | Link to Sales module, smart button counts, full customer interaction history, team KPI cards. |
