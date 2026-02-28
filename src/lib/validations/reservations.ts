import { z } from "zod";

// ── Guest Schemas ──

export const guestCreateSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email().nullish().or(z.literal("")),
  phone: z.string().nullish(),
  mobile: z.string().nullish(),
  nationality: z.string().nullish(),
  passportNo: z.string().nullish(),
  passportExpiry: z.string().nullish(),
  dateOfBirth: z.string().nullish(),
  gender: z.enum(["M", "F", "OTHER"]).nullish(),
  address: z.string().nullish(),
  city: z.string().nullish(),
  countryId: z.string().nullish(),
  notes: z.string().nullish(),
  isVip: z.boolean().default(false),
});

export const guestUpdateSchema = guestCreateSchema.partial();

// ── Booking Room Schema ──

export const roomGuestSchema = z.object({
  title: z.string().optional(),
  name: z.string().default(""),
  dob: z.string().optional(),
});

export const bookingRoomSchema = z.object({
  roomTypeId: z.string().min(1, "Room type is required"),
  mealBasisId: z.string().min(1, "Meal basis is required"),
  adults: z.number().int().min(1).max(6).default(2),
  children: z.number().int().min(0).max(4).default(0),
  infants: z.number().int().min(0).max(2).default(0),
  extraBed: z.boolean().default(false),
  buyingRatePerNight: z.number().min(0).optional(),
  sellingRatePerNight: z.number().min(0).optional(),
  specialRequests: z.string().nullish(),
  roomGuests: z.array(roomGuestSchema).optional(),
  guests: z
    .array(
      z.object({
        guestId: z.string().min(1),
        guestType: z.enum(["LEAD", "ADDITIONAL", "CHILD"]).default("ADDITIONAL"),
        isLeadGuest: z.boolean().default(false),
        childCategory: z.string().nullish(),
        childAge: z.number().int().min(0).nullish(),
      }),
    )
    .optional(),
});

// ── Booking Schemas ──

export const bookingCreateSchema = z
  .object({
    hotelId: z.string().min(1, "Hotel is required"),
    contractId: z.string().nullish(),
    marketId: z.string().nullish(),
    tourOperatorId: z.string().nullish(),
    externalRef: z.string().min(1, "T/O Booking Ref is required"),
    checkIn: z.string().min(1, "Arrival date is required"),
    checkOut: z.string().min(1, "Departure date is required"),
    currencyId: z.string().min(1, "Currency is required"),
    source: z.enum(["DIRECT", "TOUR_OPERATOR", "API"]).default("TOUR_OPERATOR"),
    manualRate: z.boolean().default(false),

    // Partner booking statuses
    htlBookingStatus: z
      .enum(["NEW_BOOKING", "SENT", "CONFIRMED", "REGRET", "STOP_SALE", "CANCELLED"])
      .default("SENT"),
    toBookingStatus: z
      .enum(["NEW_BOOKING", "SENT", "CONFIRMED", "REGRET", "STOP_SALE", "CANCELLED"])
      .default("SENT"),

    // Flight — Arrival
    arrivalFlightNo: z.string().nullish(),
    arrivalTime: z.string().nullish(),
    arrivalOriginApt: z.string().nullish(),
    arrivalDestApt: z.string().nullish(),
    arrivalTerminal: z.string().nullish(),

    // Flight — Departure
    departFlightNo: z.string().nullish(),
    departTime: z.string().nullish(),
    departOriginApt: z.string().nullish(),
    departDestApt: z.string().nullish(),
    departTerminal: z.string().nullish(),

    // Room summary
    roomOccupancy: z.enum(["SINGLE", "DOUBLE", "TRIPLE", "FAMILY"]).nullish(),
    noOfRooms: z.number().int().min(1).default(1),
    adults: z.number().int().min(1).default(2),
    children: z.number().int().min(0).default(0),
    infants: z.number().int().min(0).default(0),

    // Guest names — supports structured format [{ title, name, dob, roomIndex, type }]
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    guestNames: z.array(z.any()).default([]),

    // Child DOBs (legacy — now per-child in roomGuests)
    childDob1: z.string().nullish(),
    childDob2: z.string().nullish(),

    // Hotel payment
    hotelPaymentMethod: z.enum(["CASH", "VOUCHER"]).nullish(),
    paymentOptionDate: z.string().nullish(),

    specialRequests: z.string().nullish(),
    internalNotes: z.string().nullish(),
    bookingNotes: z.string().nullish(),
    meetAssistVisa: z.boolean().default(false),

    leadGuestName: z.string().nullish(),
    leadGuestEmail: z.string().email().nullish().or(z.literal("")),
    leadGuestPhone: z.string().nullish(),
    rooms: z.array(bookingRoomSchema).min(1, "At least one room is required"),
  })
  .refine((d) => d.checkOut > d.checkIn, {
    message: "Departure must be after arrival",
    path: ["checkOut"],
  });

export const bookingUpdateSchema = z.object({
  checkIn: z.string().optional(),
  checkOut: z.string().optional(),
  specialRequests: z.string().nullish(),
  internalNotes: z.string().nullish(),
  externalRef: z.string().nullish(),
  leadGuestName: z.string().nullish(),
  leadGuestEmail: z.string().email().nullish().or(z.literal("")),
  leadGuestPhone: z.string().nullish(),
});

// ── Booking Amendment ──

export const bookingAmendSchema = z.object({
  // Booking info
  htlBookingStatus: z
    .enum(["NEW_BOOKING", "SENT", "CONFIRMED", "REGRET", "STOP_SALE", "CANCELLED"])
    .nullish(),
  toBookingStatus: z
    .enum(["NEW_BOOKING", "SENT", "CONFIRMED", "REGRET", "STOP_SALE", "CANCELLED"])
    .nullish(),
  tourOperatorId: z.string().nullish(),
  externalRef: z.string().nullish(),
  hotelId: z.string().optional(),
  contractId: z.string().nullish(),
  marketId: z.string().nullish(),

  // Multi-room support
  rooms: z.array(bookingRoomSchema).optional(),

  // Legacy flat room fields (kept for backward compat)
  roomTypeId: z.string().optional(),
  mealBasisId: z.string().optional(),
  roomOccupancy: z.enum(["SINGLE", "DOUBLE", "TRIPLE", "FAMILY"]).nullish(),
  noOfRooms: z.number().int().min(1).optional(),
  adults: z.number().int().min(1).optional(),
  children: z.number().int().min(0).optional(),
  infants: z.number().int().min(0).optional(),

  // Dates & flight — Arrival
  checkIn: z.string().optional(),
  arrivalFlightNo: z.string().nullish(),
  arrivalTime: z.string().nullish(),
  arrivalOriginApt: z.string().nullish(),
  arrivalDestApt: z.string().nullish(),
  arrivalTerminal: z.string().nullish(),

  // Dates & flight — Departure
  checkOut: z.string().optional(),
  departFlightNo: z.string().nullish(),
  departTime: z.string().nullish(),
  departOriginApt: z.string().nullish(),
  departDestApt: z.string().nullish(),
  departTerminal: z.string().nullish(),

  // Guest names — supports structured format
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  guestNames: z.array(z.any()).optional(),
  childDob1: z.string().nullish(),
  childDob2: z.string().nullish(),

  // Payment
  hotelPaymentMethod: z.enum(["CASH", "VOUCHER"]).nullish(),
  paymentOptionDate: z.string().nullish(),

  // Remarks
  specialRequests: z.string().nullish(),
  internalNotes: z.string().nullish(),
  bookingNotes: z.string().nullish(),
  meetAssistVisa: z.boolean().optional(),

  // Amendment reason
  amendmentReason: z.string().optional(),
});

// ── Booking Lock ──

export const bookingLockSchema = z.object({
  bookingId: z.string().min(1),
  lock: z.boolean(),
});

// ── Booking Status Transition ──

export const bookingStatusTransitionSchema = z.object({
  bookingId: z.string().min(1),
  action: z.enum(["confirm", "cancel", "check_in", "check_out", "no_show"]),
  reason: z.string().optional(),
});

// ── Payment Schemas ──

export const bookingPaymentCreateSchema = z.object({
  bookingId: z.string().min(1, "Booking is required"),
  amount: z.number().positive("Amount must be positive"),
  currencyId: z.string().min(1, "Currency is required"),
  method: z.enum(["CASH", "BANK_TRANSFER", "CREDIT_CARD", "CHEQUE"]),
  reference: z.string().nullish(),
  notes: z.string().nullish(),
  paidAt: z.string().min(1, "Payment date is required"),
  isRefund: z.boolean().default(false),
  createFinanceRecords: z.boolean().default(false),
  journalId: z.string().nullish(),
});

// ── Voucher Schemas ──

export const voucherCreateSchema = z.object({
  bookingId: z.string().min(1, "Booking is required"),
  notes: z.string().nullish(),
});

export const voucherStatusSchema = z.object({
  id: z.string().min(1),
  action: z.enum(["use", "cancel"]),
});

// ── Rate Calculation ──

export const bookingRateCalcSchema = z.object({
  contractId: z.string().min(1),
  hotelId: z.string().min(1),
  tourOperatorId: z.string().nullish(),
  checkIn: z.string().min(1),
  checkOut: z.string().min(1),
  bookingDate: z.string().nullish(),
  rooms: z
    .array(
      z.object({
        roomTypeId: z.string().min(1),
        mealBasisId: z.string().min(1),
        adults: z.number().int().min(1).default(2),
        children: z
          .array(z.object({ category: z.string() }))
          .default([]),
        extraBed: z.boolean().default(false),
      }),
    )
    .min(1),
});

// ── Reports ──

export const reportFilterSchema = z.object({
  hotelId: z.string().nullish(),
  tourOperatorId: z.string().nullish(),
  dateFrom: z.string().nullish(),
  dateTo: z.string().nullish(),
  status: z
    .enum(["NEW_BOOKING", "DRAFT", "CONFIRMED", "CHECKED_IN", "CHECKED_OUT", "CANCELLED", "NO_SHOW"])
    .nullish(),
  source: z.enum(["DIRECT", "TOUR_OPERATOR", "API"]).nullish(),
});

export const arrivalListFilterSchema = z.object({
  dateFrom: z.string().min(1),
  dateTo: z.string().min(1),
  destinationId: z.string().nullish(),
  zoneId: z.string().nullish(),
  cityId: z.string().nullish(),
  status: z
    .enum(["NEW_BOOKING", "DRAFT", "CONFIRMED", "CHECKED_IN", "CHECKED_OUT", "CANCELLED", "NO_SHOW"])
    .nullish(),
});

export const paymentOptionDateFilterSchema = z.object({
  dateFrom: z.string().min(1),
  dateTo: z.string().min(1),
});

export const materializationFilterSchema = z.object({
  hotelId: z.string().min(1),
  dateFrom: z.string().min(1),
  dateTo: z.string().min(1),
});
