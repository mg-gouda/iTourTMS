import type {
  ThemePreset,
  HeaderStyle,
  ButtonStyle,
  HeroStyle,
  PublicPageStatus,
  BlogPostStatus,
  InquiryStatus,
  MarkupType,
} from "@prisma/client";

// ── Theme Presets ─────────────────────────────────────────────────────────────

export const THEME_PRESET_LABELS: Record<ThemePreset, string> = {
  MODERN_BOLD: "Modern & Bold",
  CLEAN_TRUSTWORTHY: "Clean & Trustworthy",
  WARM_INVITING: "Warm & Inviting",
  LUXURY_ELEGANT: "Luxury & Elegant",
};

// ── Header Style ──────────────────────────────────────────────────────────────

export const HEADER_STYLE_LABELS: Record<HeaderStyle, string> = {
  TRANSPARENT: "Transparent",
  SOLID: "Solid",
  MEGA_MENU: "Mega Menu",
};

// ── Button Style ──────────────────────────────────────────────────────────────

export const BUTTON_STYLE_LABELS: Record<ButtonStyle, string> = {
  PILL: "Pill",
  ROUNDED: "Rounded",
  SQUARE: "Square",
};

// ── Hero Style ────────────────────────────────────────────────────────────────

export const HERO_STYLE_LABELS: Record<HeroStyle, string> = {
  SLIDER: "Image Slider",
  VIDEO: "Video Background",
  STATIC: "Static Image",
};

// ── Content Status ────────────────────────────────────────────────────────────

export const PAGE_STATUS_LABELS: Record<PublicPageStatus, string> = {
  DRAFT: "Draft",
  PUBLISHED: "Published",
};

export const PAGE_STATUS_VARIANTS: Record<
  PublicPageStatus,
  "default" | "secondary" | "destructive" | "outline"
> = {
  DRAFT: "outline",
  PUBLISHED: "default",
};

export const BLOG_STATUS_LABELS: Record<BlogPostStatus, string> = {
  DRAFT: "Draft",
  PUBLISHED: "Published",
};

export const BLOG_STATUS_VARIANTS: Record<
  BlogPostStatus,
  "default" | "secondary" | "destructive" | "outline"
> = {
  DRAFT: "outline",
  PUBLISHED: "default",
};

// ── Inquiry Status ────────────────────────────────────────────────────────────

export const INQUIRY_STATUS_LABELS: Record<InquiryStatus, string> = {
  NEW: "New",
  READ: "Read",
  REPLIED: "Replied",
  ARCHIVED: "Archived",
};

export const INQUIRY_STATUS_VARIANTS: Record<
  InquiryStatus,
  "default" | "secondary" | "destructive" | "outline"
> = {
  NEW: "default",
  READ: "secondary",
  REPLIED: "outline",
  ARCHIVED: "secondary",
};

// ── B2C Markup Type ───────────────────────────────────────────────────────────

export const B2C_MARKUP_TYPE_LABELS: Record<MarkupType, string> = {
  PERCENTAGE: "Percentage (%)",
  FIXED_PER_NIGHT: "Fixed per Night",
  FIXED_PER_BOOKING: "Fixed per Booking",
};
