import type { Metadata } from "next";

import { B2cHeader } from "@/components/b2c/header";
import { B2cFooter } from "@/components/b2c/footer";
import { ThemeInjector } from "@/components/b2c/theme-injector";
import { GeoMarketGuard } from "@/components/b2c/geo-market-guard";
import { getBranding, getCompanyInfo } from "@/lib/b2c/get-branding";
import { buildGoogleFontsUrl } from "@/lib/b2c/fonts";
import { sanitizeCss } from "@/lib/sanitize";

import "./b2c-theme.css";

export async function generateMetadata(): Promise<Metadata> {
  const branding = await getBranding();
  const company = await getCompanyInfo();

  return {
    title: branding.siteTitle || company?.name || "iTourTMS",
    description:
      branding.siteDescription || "Book your perfect getaway with us",
    keywords: branding.metaKeywords || undefined,
    openGraph: {
      images: branding.ogImageUrl ? [branding.ogImageUrl] : undefined,
    },
    icons: branding.faviconUrl
      ? { icon: branding.faviconUrl }
      : company?.faviconUrl
        ? { icon: company.faviconUrl }
        : undefined,
  };
}

export default async function B2cLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const branding = await getBranding();
  const company = await getCompanyInfo();

  const companyName = company?.name || "iTourTMS";
  const logoUrl = branding.logoUrl || company?.logoUrl;

  const fontsUrl = buildGoogleFontsUrl(branding.headingFont, branding.bodyFont);

  return (
    <div
      className="pub-body flex min-h-screen flex-col"
      data-pub-button={branding.buttonStyle.toLowerCase()}
    >
      {/* Google Fonts */}
      {fontsUrl && (
        <>
          <link rel="preconnect" href="https://fonts.googleapis.com" />
          <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
          <link rel="stylesheet" href={fontsUrl} />
        </>
      )}

      {/* Custom CSS */}
      {branding.customCss && <style dangerouslySetInnerHTML={{ __html: sanitizeCss(branding.customCss) }} />}

      {/* Dynamic theme variables */}
      <ThemeInjector branding={branding} />

      {/* Geo-IP market guard — blocks search/booking for unsupported countries */}
      <GeoMarketGuard />

      <B2cHeader
        branding={branding}
        companyName={companyName}
        logoUrl={logoUrl}
      />

      <main className="flex-1">{children}</main>

      <B2cFooter
        branding={branding}
        companyName={companyName}
        logoUrl={branding.logoWhiteUrl || logoUrl}
      />
    </div>
  );
}
