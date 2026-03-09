import { z } from "zod";

// ── Branding ────────────────────────────────────────────

export const brandingSchema = z.object({
  themePreset: z.enum(["MODERN_BOLD", "CLEAN_TRUSTWORTHY", "WARM_INVITING", "LUXURY_ELEGANT"]),
  primaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  secondaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  accentColor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  backgroundColor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  foregroundColor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  cardColor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  mutedColor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  headingFont: z.string().min(1).max(100),
  bodyFont: z.string().min(1).max(100),
  headerStyle: z.enum(["TRANSPARENT", "SOLID", "MEGA_MENU"]),
  buttonStyle: z.enum(["PILL", "ROUNDED", "SQUARE"]),
  heroStyle: z.enum(["SLIDER", "VIDEO", "STATIC"]),
  footerColumns: z.number().int().min(3).max(5),
  logoUrl: z.string().nullable().optional(),
  logoWhiteUrl: z.string().nullable().optional(),
  faviconUrl: z.string().nullable().optional(),
  ogImageUrl: z.string().nullable().optional(),
  siteTitle: z.string().max(200).nullable().optional(),
  siteDescription: z.string().max(1000).nullable().optional(),
  metaKeywords: z.string().max(500).nullable().optional(),
  facebook: z.string().max(500).nullable().optional(),
  instagram: z.string().max(500).nullable().optional(),
  twitter: z.string().max(500).nullable().optional(),
  youtube: z.string().max(500).nullable().optional(),
  linkedin: z.string().max(500).nullable().optional(),
  tiktok: z.string().max(500).nullable().optional(),
  whatsapp: z.string().max(50).nullable().optional(),
  contactEmail: z.string().email().max(200).nullable().optional(),
  contactPhone: z.string().max(50).nullable().optional(),
  contactAddress: z.string().max(500).nullable().optional(),
  enableBlog: z.boolean(),
  enableFaq: z.boolean(),
  enableReviews: z.boolean(),
  enableNewsletter: z.boolean(),
  enableB2bPortal: z.boolean(),
  enableOnlinePayment: z.boolean(),
  enableInquiryMode: z.boolean(),
  showPrices: z.boolean(),
  yearsInBusiness: z.number().int().min(0).nullable().optional(),
  happyGuests: z.number().int().min(0).nullable().optional(),
  customCss: z.string().max(10000).nullable().optional(),
});

// ── Hero Slides ─────────────────────────────────────────

export const heroSlideCreateSchema = z.object({
  imageUrl: z.string().min(1),
  title: z.string().max(200).nullable().optional(),
  subtitle: z.string().max(500).nullable().optional(),
  ctaText: z.string().max(100).nullable().optional(),
  ctaLink: z.string().max(500).nullable().optional(),
  sortOrder: z.number().int().default(0),
  active: z.boolean().default(true),
});

export const heroSlideUpdateSchema = heroSlideCreateSchema.partial().extend({
  id: z.string(),
});

export const reorderSchema = z.object({
  items: z.array(z.object({ id: z.string(), sortOrder: z.number().int() })),
});

// ── Public Pages ────────────────────────────────────────

export const publicPageCreateSchema = z.object({
  title: z.string().min(1).max(200),
  slug: z
    .string()
    .min(1)
    .max(200)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  content: z.string().min(1),
  excerpt: z.string().max(500).nullable().optional(),
  coverImage: z.string().nullable().optional(),
  status: z.enum(["DRAFT", "PUBLISHED"]).default("DRAFT"),
  sortOrder: z.number().int().default(0),
});

export const publicPageUpdateSchema = publicPageCreateSchema.partial().extend({
  id: z.string(),
});

// ── Blog Posts ──────────────────────────────────────────

export const blogPostCreateSchema = z.object({
  title: z.string().min(1).max(200),
  slug: z
    .string()
    .min(1)
    .max(200)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  content: z.string().min(1),
  excerpt: z.string().max(500).nullable().optional(),
  coverImage: z.string().nullable().optional(),
  tags: z.array(z.string().max(50)).default([]),
  status: z.enum(["DRAFT", "PUBLISHED"]).default("DRAFT"),
});

export const blogPostUpdateSchema = blogPostCreateSchema.partial().extend({
  id: z.string(),
});

// ── FAQ ─────────────────────────────────────────────────

export const faqCreateSchema = z.object({
  question: z.string().min(1).max(500),
  answer: z.string().min(1),
  category: z.string().max(100).nullable().optional(),
  sortOrder: z.number().int().default(0),
  active: z.boolean().default(true),
});

export const faqUpdateSchema = faqCreateSchema.partial().extend({
  id: z.string(),
});

// ── Testimonials ────────────────────────────────────────

export const testimonialCreateSchema = z.object({
  guestName: z.string().min(1).max(200),
  avatar: z.string().nullable().optional(),
  rating: z.number().int().min(1).max(5).default(5),
  quote: z.string().min(1).max(2000),
  hotelId: z.string().nullable().optional(),
  featured: z.boolean().default(false),
  active: z.boolean().default(true),
});

export const testimonialUpdateSchema = testimonialCreateSchema.partial().extend({
  id: z.string(),
});

// ── Newsletter ──────────────────────────────────────────

export const newsletterSubscribeSchema = z.object({
  email: z.string().email().max(200),
});

// ── Contact Inquiry ─────────────────────────────────────

export const contactInquiryCreateSchema = z.object({
  name: z.string().min(1).max(200),
  email: z.string().email().max(200),
  phone: z.string().max(50).nullable().optional(),
  subject: z.string().max(200).nullable().optional(),
  message: z.string().min(1).max(5000),
});

export const contactInquiryReplySchema = z.object({
  id: z.string(),
  reply: z.string().min(1).max(5000),
});

// ── B2C Markup Rules ───────────────────────────────────

export const b2cMarkupTierSchema = z.object({
  id: z.string().optional(), // present on existing tiers for update
  dateFrom: z.string().min(1, "Start date is required"),
  dateTo: z.string().min(1, "End date is required"),
  markupType: z.enum(["PERCENTAGE", "FIXED_PER_NIGHT", "FIXED_PER_BOOKING"]),
  value: z.number().min(0, "Value must be >= 0"),
  sortOrder: z.number().int().default(0),
});

export const b2cMarkupRuleCreateSchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  markupType: z.enum(["PERCENTAGE", "FIXED_PER_NIGHT", "FIXED_PER_BOOKING"]),
  value: z.number().min(0, "Default value must be >= 0"),
  destinationId: z.string().nullable().optional(),
  hotelId: z.string().nullable().optional(),
  priority: z.number().int().default(0),
  active: z.boolean().default(true),
  tiers: z.array(b2cMarkupTierSchema).default([]),
});

export const b2cMarkupRuleUpdateSchema = b2cMarkupRuleCreateSchema.partial().extend({
  id: z.string(),
  tiers: z.array(b2cMarkupTierSchema).optional(),
});
