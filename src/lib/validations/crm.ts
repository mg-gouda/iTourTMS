import { z } from "zod";

// ── Lead Schemas ──

export const leadCreateSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional().or(z.literal("")),
  source: z.enum(["WEBSITE", "REFERRAL", "WALK_IN", "PHONE", "EMAIL", "SOCIAL_MEDIA", "PARTNER", "EVENT", "OTHER"]).default("WEBSITE"),
  status: z.enum(["NEW", "CONTACTED", "QUALIFIED", "PROPOSAL", "NEGOTIATION", "WON", "LOST", "DORMANT"]).default("NEW"),
  assignedToId: z.string().optional().or(z.literal("")),
  notes: z.string().optional().or(z.literal("")),
});

export const leadUpdateSchema = leadCreateSchema.partial();

// ── Opportunity Schemas ──

export const opportunityCreateSchema = z.object({
  title: z.string().min(1, "Title is required"),
  stage: z.enum(["PROSPECTING", "QUALIFICATION", "PROPOSAL", "NEGOTIATION", "CLOSED_WON", "CLOSED_LOST"]).default("PROSPECTING"),
  value: z.number().min(0).optional(),
  probability: z.number().min(0).max(100).optional(),
  expectedCloseDate: z.string().optional().or(z.literal("")),
  ownerId: z.string().optional().or(z.literal("")),
  leadId: z.string().optional().or(z.literal("")),
  customerId: z.string().optional().or(z.literal("")),
  notes: z.string().optional().or(z.literal("")),
});

export const opportunityUpdateSchema = opportunityCreateSchema.partial();

// ── Activity Schemas ──

export const activityCreateSchema = z.object({
  type: z.enum(["CALL", "EMAIL", "MEETING", "NOTE", "TASK", "FOLLOW_UP"]),
  subject: z.string().min(1, "Subject is required"),
  description: z.string().optional().or(z.literal("")),
  dueDate: z.string().optional().or(z.literal("")),
  assignedToId: z.string().optional().or(z.literal("")),
  leadId: z.string().optional().or(z.literal("")),
  opportunityId: z.string().optional().or(z.literal("")),
  customerId: z.string().optional().or(z.literal("")),
  bookingId: z.string().optional().or(z.literal("")),
});

export const activityUpdateSchema = activityCreateSchema.partial().extend({
  completedAt: z.string().optional().or(z.literal("")).or(z.null()),
});

// ── Customer Schemas ──

export const customerCreateSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional().or(z.literal("")),
  nationality: z.string().optional().or(z.literal("")),
  dateOfBirth: z.string().optional().or(z.literal("")),
  loyaltyTier: z.string().optional(),
  partnerId: z.string().optional().or(z.literal("")),
  notes: z.string().optional().or(z.literal("")),
});

export const customerUpdateSchema = customerCreateSchema.partial();

// ── Supplier Schemas ──

export const supplierCreateSchema = z.object({
  name: z.string().min(1, "Name is required"),
  contactName: z.string().optional().or(z.literal("")),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional().or(z.literal("")),
  type: z.string().optional().or(z.literal("")),
  notes: z.string().optional().or(z.literal("")),
  active: z.boolean().default(true),
});

export const supplierUpdateSchema = supplierCreateSchema.partial();

// ── Excursion Schemas ──

export const excursionCreateSchema = z.object({
  code: z.string().min(1, "Code is required").max(20),
  name: z.string().min(1, "Name is required"),
  productType: z.enum(["ACTIVITY", "TOUR_PACKAGE"]).default("ACTIVITY"),
  category: z.enum(["WATER_SPORTS", "DESERT_SAFARI", "CITY_TOUR", "CULTURAL", "ADVENTURE", "DINING", "ENTERTAINMENT", "WELLNESS", "SHOPPING", "TRANSFER", "OTHER"]).default("OTHER"),
  tripMode: z.enum(["SHARED", "PRIVATE", "VIP"]).default("SHARED"),
  duration: z.string().optional().or(z.literal("")),
  description: z.string().optional().or(z.literal("")),
  inclusions: z.string().optional().or(z.literal("")),
  exclusions: z.string().optional().or(z.literal("")),
  minPax: z.number().int().min(1).optional(),
  maxPax: z.number().int().min(1).optional(),
  active: z.boolean().default(true),
});

export const excursionUpdateSchema = excursionCreateSchema.partial();

// ── Program Schemas ──

export const programCreateSchema = z.object({
  excursionId: z.string().min(1),
  dayNumber: z.number().int().min(1).default(1),
  title: z.string().min(1, "Title is required"),
  description: z.string().optional().or(z.literal("")),
  sortOrder: z.number().int().default(0),
});

export const programUpdateSchema = programCreateSchema.omit({ excursionId: true }).partial();

// ── Program Item Schemas ──

export const programItemCreateSchema = z.object({
  programId: z.string().min(1),
  time: z.string().optional().or(z.literal("")),
  title: z.string().min(1, "Title is required"),
  description: z.string().optional().or(z.literal("")),
  location: z.string().optional().or(z.literal("")),
  sortOrder: z.number().int().default(0),
});

export const programItemUpdateSchema = programItemCreateSchema.omit({ programId: true }).partial();

// ── Age Group Schemas ──

export const ageGroupCreateSchema = z.object({
  excursionId: z.string().min(1),
  label: z.enum(["ADULT", "CHILD", "INFANT"]),
  minAge: z.number().int().min(0),
  maxAge: z.number().int().min(0),
  sortOrder: z.number().int().default(0),
});

// ── Addon Schemas ──

export const addonCreateSchema = z.object({
  excursionId: z.string().min(1),
  name: z.string().min(1, "Name is required"),
  description: z.string().optional().or(z.literal("")),
  price: z.number().min(0).optional(),
  sortOrder: z.number().int().default(0),
});

export const addonUpdateSchema = addonCreateSchema.omit({ excursionId: true }).partial();

// ── Cost Sheet Schemas ──

export const costSheetCreateSchema = z.object({
  excursionId: z.string().min(1),
  name: z.string().min(1, "Name is required"),
  seasonType: z.enum(["PEAK", "HIGH", "SHOULDER", "LOW", "BLACKOUT"]).default("LOW"),
  nationalityTier: z.enum(["DEFAULT", "TIER_1", "TIER_2", "TIER_3"]).default("DEFAULT"),
  tripMode: z.enum(["SHARED", "PRIVATE", "VIP"]).default("SHARED"),
  validFrom: z.string().optional().or(z.literal("")),
  validTo: z.string().optional().or(z.literal("")),
  calcBasis: z.enum(["PER_PERSON", "PER_GROUP", "FLAT"]).default("PER_PERSON"),
  notes: z.string().optional().or(z.literal("")),
});

export const costSheetUpdateSchema = costSheetCreateSchema.omit({ excursionId: true }).partial();

// ── Cost Component Schemas ──

export const costComponentSchema = z.object({
  type: z.enum(["TRANSPORT", "TICKETS", "GUIDE_FEE", "MEALS", "EQUIPMENT", "INSURANCE", "COMMISSION", "PERMIT", "MISCELLANEOUS"]),
  description: z.string().min(1, "Description is required"),
  supplierId: z.string().optional().or(z.literal("")),
  unitCost: z.number().min(0),
  quantity: z.number().int().min(1).default(1),
  total: z.number().min(0),
  sortOrder: z.number().int().default(0),
});

export const costComponentBulkSaveSchema = z.object({
  costSheetId: z.string().min(1),
  components: z.array(costComponentSchema),
});

// ── Selling Price Schemas ──

export const sellingPriceSchema = z.object({
  ageGroupId: z.string().optional().or(z.literal("")),
  label: z.string().min(1, "Label is required"),
  markupType: z.enum(["PERCENTAGE", "FIXED"]).default("PERCENTAGE"),
  markupValue: z.number().min(0),
  costPerPerson: z.number().min(0),
  sellingPrice: z.number().min(0),
  currency: z.string().max(3).default("USD"),
  active: z.boolean().default(true),
  sortOrder: z.number().int().default(0),
});

export const sellingPriceBulkSaveSchema = z.object({
  costSheetId: z.string().min(1),
  prices: z.array(sellingPriceSchema),
});

// ── Booking Schemas ──

export const bookingItemSchema = z.object({
  excursionId: z.string().min(1),
  costSheetId: z.string().optional().or(z.literal("")),
  label: z.string().min(1),
  quantity: z.number().int().min(1).default(1),
  unitCost: z.number().min(0),
  unitPrice: z.number().min(0),
  totalCost: z.number().min(0),
  totalPrice: z.number().min(0),
  sortOrder: z.number().int().default(0),
});

export const bookingCreateSchema = z.object({
  customerId: z.string().optional().or(z.literal("")),
  opportunityId: z.string().optional().or(z.literal("")),
  status: z.enum(["DRAFT", "CONFIRMED", "CANCELLED", "COMPLETED", "NO_SHOW"]).default("DRAFT"),
  travelDate: z.string().min(1, "Travel date is required"),
  paxAdults: z.number().int().min(0).default(1),
  paxChildren: z.number().int().min(0).default(0),
  paxInfants: z.number().int().min(0).default(0),
  currency: z.string().max(3).default("USD"),
  notes: z.string().optional().or(z.literal("")),
  items: z.array(bookingItemSchema).min(1, "At least one item required"),
});

export const bookingUpdateSchema = z.object({
  customerId: z.string().optional().or(z.literal("")),
  opportunityId: z.string().optional().or(z.literal("")),
  status: z.enum(["DRAFT", "CONFIRMED", "CANCELLED", "COMPLETED", "NO_SHOW"]).optional(),
  travelDate: z.string().optional(),
  paxAdults: z.number().int().min(0).optional(),
  paxChildren: z.number().int().min(0).optional(),
  paxInfants: z.number().int().min(0).optional(),
  currency: z.string().max(3).optional(),
  notes: z.string().optional().or(z.literal("")),
});
