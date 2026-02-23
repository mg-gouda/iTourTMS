import { z } from "zod";

// ── Destination Schemas ──

export const destinationCreateSchema = z.object({
  name: z.string().min(1, "Name is required"),
  code: z.string().min(1, "Code is required").max(10),
  countryId: z.string().min(1, "Country is required"),
  active: z.boolean().default(true),
});

export const destinationUpdateSchema = destinationCreateSchema.partial();

// ── Hotel Schemas ──

export const hotelCreateSchema = z.object({
  name: z.string().min(1, "Name is required"),
  code: z.string().min(1, "Code is required").max(20),
  starRating: z.enum(["ONE", "TWO", "THREE", "FOUR", "FIVE", "FIVE_DELUXE"]).default("THREE"),
  chainName: z.string().nullish(),
  description: z.string().nullish(),
  shortDescription: z.string().nullish(),
  address: z.string().nullish(),
  city: z.string().min(1, "City is required"),
  stateId: z.string().nullish(),
  countryId: z.string().min(1, "Country is required"),
  zipCode: z.string().nullish(),
  latitude: z.number().nullish(),
  longitude: z.number().nullish(),
  destinationId: z.string().nullish(),
  phone: z.string().nullish(),
  fax: z.string().nullish(),
  email: z.string().email().nullish().or(z.literal("")),
  website: z.string().nullish(),
  reservationEmail: z.string().email().nullish().or(z.literal("")),
  contactPerson: z.string().nullish(),
  contactPhone: z.string().nullish(),
  checkInTime: z.string().default("14:00"),
  checkOutTime: z.string().default("12:00"),
  totalRooms: z.number().int().positive().nullish(),
  yearBuilt: z.number().int().nullish(),
  yearRenovated: z.number().int().nullish(),
  active: z.boolean().default(true),
  amenityIds: z.array(z.string()).default([]),
});

export const hotelUpdateSchema = hotelCreateSchema.partial();

// ── Room Type Schemas ──

export const roomTypeCreateSchema = z.object({
  hotelId: z.string().min(1, "Hotel is required"),
  name: z.string().min(1, "Name is required"),
  code: z.string().min(1, "Code is required").max(20),
  description: z.string().nullish(),
  sortOrder: z.number().int().default(0),
  maxAdults: z.number().int().min(1).default(2),
  maxChildren: z.number().int().min(0).default(1),
  maxInfants: z.number().int().min(0).default(1),
  maxOccupancy: z.number().int().min(1).default(3),
  extraBedAvailable: z.boolean().default(false),
  maxExtraBeds: z.number().int().min(0).default(0),
  roomSize: z.number().positive().nullish(),
  bedConfiguration: z.string().nullish(),
  active: z.boolean().default(true),
});

export const roomTypeUpdateSchema = roomTypeCreateSchema.partial().omit({ hotelId: true });

// ── Occupancy Schemas ──

export const occupancyCreateSchema = z.object({
  roomTypeId: z.string().min(1, "Room type is required"),
  adults: z.number().int().min(1, "At least 1 adult required"),
  children: z.number().int().min(0).default(0),
  infants: z.number().int().min(0).default(0),
  extraBeds: z.number().int().min(0).default(0),
  isDefault: z.boolean().default(false),
  description: z.string().nullish(),
  sortOrder: z.number().int().default(0),
});

// ── Child Policy Schemas ──

export const childPolicyCreateSchema = z.object({
  hotelId: z.string().min(1, "Hotel is required"),
  category: z.enum(["INFANT", "CHILD", "TEEN"]),
  ageFrom: z.number().int().min(0),
  ageTo: z.number().int().min(0),
  label: z.string().min(1, "Label is required"),
  freeInSharing: z.boolean().default(false),
  maxFreePerRoom: z.number().int().min(0).default(0),
  extraBedAllowed: z.boolean().default(true),
  mealsIncluded: z.boolean().default(false),
  notes: z.string().nullish(),
}).refine((d) => d.ageTo >= d.ageFrom, {
  message: "Age To must be greater than or equal to Age From",
  path: ["ageTo"],
});

// ── Meal Basis Schemas ──

export const mealBasisCreateSchema = z.object({
  hotelId: z.string().min(1, "Hotel is required"),
  mealCode: z.enum(["RO", "BB", "HB", "FB", "AI", "UAI", "SC"]),
  name: z.string().min(1, "Name is required"),
  description: z.string().nullish(),
  isDefault: z.boolean().default(false),
  active: z.boolean().default(true),
  sortOrder: z.number().int().default(0),
});

export const mealBasisUpdateSchema = mealBasisCreateSchema.partial().omit({ hotelId: true, mealCode: true });

// ── Hotel Image Schemas ──

export const hotelImageCreateSchema = z.object({
  hotelId: z.string().min(1, "Hotel is required"),
  url: z.string().url("Valid URL is required"),
  caption: z.string().nullish(),
  sortOrder: z.number().int().default(0),
  isPrimary: z.boolean().default(false),
});
