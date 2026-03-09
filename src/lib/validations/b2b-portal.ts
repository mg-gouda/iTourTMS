import { z } from "zod";

// ── Partner (Tour Operator / Travel Agent) ──

export const b2bPartnerCreateSchema = z.object({
  name: z.string().min(1, "Name is required"),
  code: z.string().min(1, "Code is required").max(20),
  partnerType: z
    .enum(["tour_operator", "travel_agent"])
    .default("tour_operator"),
  contactPerson: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  countryId: z.string().optional(),
  marketId: z.string().optional(),
  creditLimit: z.number().min(0).default(0),
  paymentTermDays: z.number().int().min(0).default(30),
  commissionPct: z.number().min(0).max(100).default(0),
  active: z.boolean().default(true),
});

export const b2bPartnerUpdateSchema = b2bPartnerCreateSchema.partial();

// ── Credit Transaction ──

export const b2bCreditTxCreateSchema = z.object({
  tourOperatorId: z.string().min(1, "Partner is required"),
  type: z.enum([
    "BOOKING_CHARGE",
    "PAYMENT_RECEIVED",
    "CREDIT_NOTE",
    "ADJUSTMENT",
  ]),
  amount: z.number().positive("Amount must be positive"),
  reference: z.string().optional(),
  bookingId: z.string().optional(),
  notes: z.string().optional(),
});

// ── Rate Sheet Filter ──

export const b2bRateSheetFilterSchema = z.object({
  tourOperatorId: z.string().optional(),
  contractId: z.string().optional(),
});

// ── Search/Booking ──

export const b2bSearchSchema = z.object({
  tourOperatorId: z.string().min(1, "Partner is required"),
  destinationId: z.string().optional(),
  hotelId: z.string().optional(),
  checkIn: z.string().min(1, "Check-in is required"),
  checkOut: z.string().min(1, "Check-out is required"),
  adults: z.number().int().min(1).default(2),
  children: z.number().int().min(0).default(0),
  childAges: z.array(z.number().int().min(0).max(17)).optional(),
});

// ── Reports ──

export const b2bReportFilterSchema = z.object({
  tourOperatorId: z.string().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  status: z.string().optional(),
});

export const b2bStatementFilterSchema = z.object({
  tourOperatorId: z.string().min(1, "Partner is required"),
  dateFrom: z.string().min(1, "Start date is required"),
  dateTo: z.string().min(1, "End date is required"),
});
