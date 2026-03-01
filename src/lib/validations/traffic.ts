import { z } from "zod";

// ── Airport Schemas ──

export const airportCreateSchema = z.object({
  code: z.string().min(2, "Code is required").max(4),
  name: z.string().min(1, "Name is required"),
  countryId: z.string().min(1, "Country is required"),
  latitude: z.number().nullish(),
  longitude: z.number().nullish(),
  timezone: z.string().nullish(),
  isActive: z.boolean().default(true),
});

export const airportUpdateSchema = airportCreateSchema.partial();

// ── Zone Schemas ──

export const ttZoneCreateSchema = z.object({
  cityId: z.string().min(1, "City is required"),
  name: z.string().min(1, "Zone name is required"),
  code: z.string().min(1, "Code is required").max(10),
  description: z.string().nullish(),
  sortOrder: z.number().int().default(0),
  isActive: z.boolean().default(true),
});

export const ttZoneUpdateSchema = ttZoneCreateSchema.partial();

// ── Vehicle Type Schemas ──

export const vehicleTypeCreateSchema = z.object({
  name: z.string().min(1, "Name is required"),
  code: z.string().min(1, "Code is required").max(10),
  capacity: z.number().int().min(1).default(4),
  luggageCapacity: z.number().int().nullish(),
  description: z.string().nullish(),
  isActive: z.boolean().default(true),
  sortOrder: z.number().int().default(0),
});

export const vehicleTypeUpdateSchema = vehicleTypeCreateSchema.partial();

// ── Vehicle Schemas ──

export const vehicleCreateSchema = z.object({
  vehicleTypeId: z.string().min(1, "Vehicle type is required"),
  supplierId: z.string().nullish(),
  plateNumber: z.string().min(1, "Plate number is required"),
  make: z.string().nullish(),
  model: z.string().nullish(),
  year: z.number().int().nullish(),
  color: z.string().nullish(),
  vinNumber: z.string().nullish(),
  ownership: z.enum(["OWNED", "RENTED", "CONTRACTED"]).default("OWNED"),
  status: z.enum(["ACTIVE", "IN_MAINTENANCE", "OUT_OF_SERVICE", "RETIRED"]).default("ACTIVE"),
  notes: z.string().nullish(),
  isActive: z.boolean().default(true),
});

export const vehicleUpdateSchema = vehicleCreateSchema.partial();

// ── Vehicle Compliance Schemas ──

export const vehicleComplianceCreateSchema = z.object({
  vehicleId: z.string().min(1, "Vehicle is required"),
  type: z.enum(["INSURANCE", "REGISTRATION", "INSPECTION", "PERMIT", "OTHER"]),
  documentRef: z.string().nullish(),
  issueDate: z.date().nullish(),
  expiryDate: z.date(),
  notes: z.string().nullish(),
  fileUrl: z.string().nullish(),
});

export const vehicleComplianceUpdateSchema = vehicleComplianceCreateSchema.partial();

// ── Driver Schemas ──

export const driverCreateSchema = z.object({
  userId: z.string().min(1, "User is required"),
  licenseNumber: z.string().nullish(),
  licenseExpiry: z.date().nullish(),
  phone: z.string().nullish(),
  status: z.enum(["ACTIVE", "ON_LEAVE", "SUSPENDED", "TERMINATED"]).default("ACTIVE"),
  notes: z.string().nullish(),
  isActive: z.boolean().default(true),
});

export const driverUpdateSchema = driverCreateSchema.omit({ userId: true }).partial();

// ── Rep Schemas ──

export const repCreateSchema = z.object({
  userId: z.string().min(1, "User is required"),
  phone: z.string().nullish(),
  notes: z.string().nullish(),
  isActive: z.boolean().default(true),
});

export const repUpdateSchema = repCreateSchema.omit({ userId: true }).partial();

// ── Price Item Schemas ──

export const priceItemCreateSchema = z.object({
  vehicleTypeId: z.string().min(1, "Vehicle type is required"),
  fromZoneId: z.string().nullish(),
  toZoneId: z.string().nullish(),
  priceType: z.enum(["PER_VEHICLE", "PER_PERSON", "PER_ZONE", "FLAT_RATE"]).default("PER_VEHICLE"),
  price: z.number().min(0),
  currencyId: z.string().min(1, "Currency is required"),
  serviceType: z.enum([
    "ARR", "DEP", "ARR_DEP", "EXCURSION", "INTER_HOTEL", "CITY_TOUR",
    "PRIVATE_HIRE", "AIRPORT_MEET", "VIP", "SHUTTLE", "CHARTER", "OTHER",
  ]).nullish(),
  description: z.string().nullish(),
  isActive: z.boolean().default(true),
});

export const priceItemUpdateSchema = priceItemCreateSchema.partial();

// ── Partner Price Override Schemas ──

export const partnerPriceOverrideCreateSchema = z.object({
  partnerId: z.string().min(1, "Partner is required"),
  priceItemId: z.string().min(1, "Price item is required"),
  price: z.number().min(0),
  isActive: z.boolean().default(true),
});

export const partnerPriceOverrideUpdateSchema = z.object({
  price: z.number().min(0).optional(),
  isActive: z.boolean().optional(),
});

// ── Supplier Trip Price Schemas ──

export const supplierTripPriceCreateSchema = z.object({
  supplierId: z.string().min(1, "Supplier is required"),
  vehicleTypeId: z.string().min(1, "Vehicle type is required"),
  routeDesc: z.string().nullish(),
  price: z.number().min(0),
  currencyId: z.string().min(1, "Currency is required"),
  isActive: z.boolean().default(true),
});

export const supplierTripPriceUpdateSchema = supplierTripPriceCreateSchema.partial();

// ── Traffic Job Schemas ──

export const trafficJobCreateSchema = z.object({
  serviceType: z.enum([
    "ARR", "DEP", "ARR_DEP", "EXCURSION", "INTER_HOTEL", "CITY_TOUR",
    "PRIVATE_HIRE", "AIRPORT_MEET", "VIP", "SHUTTLE", "CHARTER", "OTHER",
  ]),
  vehicleTypeId: z.string().nullish(),
  serviceDate: z.date(),
  pickupTime: z.string().nullish(),
  dropoffTime: z.string().nullish(),
  pickupAirportId: z.string().nullish(),
  pickupHotelId: z.string().nullish(),
  pickupAddress: z.string().nullish(),
  dropoffAirportId: z.string().nullish(),
  dropoffHotelId: z.string().nullish(),
  dropoffAddress: z.string().nullish(),
  zoneId: z.string().nullish(),
  partnerId: z.string().nullish(),
  bookingId: z.string().nullish(),
  flightId: z.string().nullish(),
  paxCount: z.number().int().min(1).default(1),
  leadPassenger: z.string().nullish(),
  passengerPhone: z.string().nullish(),
  passengerNotes: z.string().nullish(),
  currencyId: z.string().nullish(),
  price: z.number().default(0),
  cost: z.number().default(0),
});

export const trafficJobUpdateSchema = trafficJobCreateSchema.partial();

// ── Traffic Flight Schemas ──

export const trafficFlightCreateSchema = z.object({
  flightNumber: z.string().min(1, "Flight number is required"),
  airlineCode: z.string().nullish(),
  arrAirportId: z.string().nullish(),
  depAirportId: z.string().nullish(),
  arrTime: z.string().nullish(),
  depTime: z.string().nullish(),
  flightDate: z.date(),
  terminal: z.string().nullish(),
  notes: z.string().nullish(),
});

export const trafficFlightUpdateSchema = trafficFlightCreateSchema.partial();

// ── Traffic Assignment Schemas ──

export const trafficAssignmentCreateSchema = z.object({
  jobId: z.string().min(1, "Job is required"),
  vehicleId: z.string().nullish(),
  driverId: z.string().nullish(),
  repId: z.string().nullish(),
  notes: z.string().nullish(),
});

export const trafficAssignmentUpdateSchema = trafficAssignmentCreateSchema.omit({ jobId: true }).partial();

// ── Guest Booking Schemas ──

export const guestBookingCreateSchema = z.object({
  vehicleTypeId: z.string().min(1, "Vehicle type is required"),
  serviceType: z.enum([
    "ARR", "DEP", "ARR_DEP", "EXCURSION", "INTER_HOTEL", "CITY_TOUR",
    "PRIVATE_HIRE", "AIRPORT_MEET", "VIP", "SHUTTLE", "CHARTER", "OTHER",
  ]).default("ARR"),
  serviceDate: z.date(),
  pickupTime: z.string().nullish(),
  pickupAddress: z.string().nullish(),
  dropoffAddress: z.string().nullish(),
  paxCount: z.number().int().min(1).default(1),
  guestName: z.string().min(1, "Guest name is required"),
  guestEmail: z.string().email().nullish().or(z.literal("")),
  guestPhone: z.string().nullish(),
  currencyId: z.string().min(1, "Currency is required"),
  quotedPrice: z.number().default(0),
  notes: z.string().nullish(),
});

export const guestBookingUpdateSchema = guestBookingCreateSchema.partial();

// ── Settings Schema ──

export const ttSettingsUpdateSchema = z.object({
  defaultCurrencyId: z.string().nullish(),
  dispatchLockHours: z.number().int().min(0).default(48),
  enableDriverPortal: z.boolean().default(false),
  enableRepPortal: z.boolean().default(false),
  enableSupplierPortal: z.boolean().default(false),
  enableGuestBookings: z.boolean().default(false),
  whatsappEnabled: z.boolean().default(false),
  pushEnabled: z.boolean().default(false),
});

// ── Operational Cost Schemas ──

export const operationalCostCreateSchema = z.object({
  jobId: z.string().min(1, "Job is required"),
  costType: z.string().min(1, "Cost type is required"),
  amount: z.number().min(0),
  currencyId: z.string().min(1, "Currency is required"),
  notes: z.string().nullish(),
});

export const operationalCostUpdateSchema = operationalCostCreateSchema.omit({ jobId: true }).partial();
