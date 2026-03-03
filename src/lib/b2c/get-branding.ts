import { cache } from "react";

import type { ThemePreset, HeaderStyle, ButtonStyle, HeroStyle } from "@prisma/client";

import { db } from "@/server/db";

export interface PublicBranding {
  themePreset: ThemePreset;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  backgroundColor: string;
  foregroundColor: string;
  cardColor: string;
  mutedColor: string;
  headingFont: string;
  bodyFont: string;
  headerStyle: HeaderStyle;
  buttonStyle: ButtonStyle;
  heroStyle: HeroStyle;
  footerColumns: number;
  logoUrl: string | null;
  logoWhiteUrl: string | null;
  faviconUrl: string | null;
  ogImageUrl: string | null;
  siteTitle: string | null;
  siteDescription: string | null;
  metaKeywords: string | null;
  facebook: string | null;
  instagram: string | null;
  twitter: string | null;
  youtube: string | null;
  linkedin: string | null;
  tiktok: string | null;
  whatsapp: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  contactAddress: string | null;
  enableBlog: boolean;
  enableFaq: boolean;
  enableReviews: boolean;
  enableNewsletter: boolean;
  enableB2bPortal: boolean;
  enableOnlinePayment: boolean;
  enableInquiryMode: boolean;
  showPrices: boolean;
  yearsInBusiness: number | null;
  happyGuests: number | null;
  customCss: string | null;
}

/** Default branding values when no DB record exists */
const DEFAULT_BRANDING: PublicBranding = {
  themePreset: "MODERN_BOLD",
  primaryColor: "#2563eb",
  secondaryColor: "#f97316",
  accentColor: "#06b6d4",
  backgroundColor: "#ffffff",
  foregroundColor: "#0f172a",
  cardColor: "#ffffff",
  mutedColor: "#f1f5f9",
  headingFont: "Poppins",
  bodyFont: "Inter",
  headerStyle: "MEGA_MENU",
  buttonStyle: "ROUNDED",
  heroStyle: "SLIDER",
  footerColumns: 4,
  logoUrl: null,
  logoWhiteUrl: null,
  faviconUrl: null,
  ogImageUrl: null,
  siteTitle: null,
  siteDescription: null,
  metaKeywords: null,
  facebook: null,
  instagram: null,
  twitter: null,
  youtube: null,
  linkedin: null,
  tiktok: null,
  whatsapp: null,
  contactEmail: null,
  contactPhone: null,
  contactAddress: null,
  enableBlog: false,
  enableFaq: true,
  enableReviews: true,
  enableNewsletter: true,
  enableB2bPortal: false,
  enableOnlinePayment: false,
  enableInquiryMode: true,
  showPrices: true,
  yearsInBusiness: null,
  happyGuests: null,
  customCss: null,
};

/**
 * Fetch public site branding config.
 * Uses React `cache()` for per-request deduplication in Server Components.
 */
export const getBranding = cache(async (): Promise<PublicBranding> => {
  const company = await db.company.findFirst({
    select: { id: true },
  });

  if (!company) return DEFAULT_BRANDING;

  const branding = await db.publicSiteBranding.findUnique({
    where: { companyId: company.id },
  });

  if (!branding) return DEFAULT_BRANDING;

  return {
    themePreset: branding.themePreset,
    primaryColor: branding.primaryColor,
    secondaryColor: branding.secondaryColor,
    accentColor: branding.accentColor,
    backgroundColor: branding.backgroundColor,
    foregroundColor: branding.foregroundColor,
    cardColor: branding.cardColor,
    mutedColor: branding.mutedColor,
    headingFont: branding.headingFont,
    bodyFont: branding.bodyFont,
    headerStyle: branding.headerStyle,
    buttonStyle: branding.buttonStyle,
    heroStyle: branding.heroStyle,
    footerColumns: branding.footerColumns,
    logoUrl: branding.logoUrl,
    logoWhiteUrl: branding.logoWhiteUrl,
    faviconUrl: branding.faviconUrl,
    ogImageUrl: branding.ogImageUrl,
    siteTitle: branding.siteTitle,
    siteDescription: branding.siteDescription,
    metaKeywords: branding.metaKeywords,
    facebook: branding.facebook,
    instagram: branding.instagram,
    twitter: branding.twitter,
    youtube: branding.youtube,
    linkedin: branding.linkedin,
    tiktok: branding.tiktok,
    whatsapp: branding.whatsapp,
    contactEmail: branding.contactEmail,
    contactPhone: branding.contactPhone,
    contactAddress: branding.contactAddress,
    enableBlog: branding.enableBlog,
    enableFaq: branding.enableFaq,
    enableReviews: branding.enableReviews,
    enableNewsletter: branding.enableNewsletter,
    enableB2bPortal: branding.enableB2bPortal,
    enableOnlinePayment: branding.enableOnlinePayment,
    enableInquiryMode: branding.enableInquiryMode,
    showPrices: branding.showPrices,
    yearsInBusiness: branding.yearsInBusiness,
    happyGuests: branding.happyGuests,
    customCss: branding.customCss,
  };
});

/** Get company info for the public site */
export const getCompanyInfo = cache(async () => {
  return db.company.findFirst({
    select: {
      id: true,
      name: true,
      logoUrl: true,
      faviconUrl: true,
      email: true,
      phone: true,
      website: true,
    },
  });
});
