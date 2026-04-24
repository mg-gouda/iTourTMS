import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";

import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { TRPCProvider } from "@/components/providers/trpc-provider";
import { isRTL } from "@/lib/i18n/config";
import { db } from "@/server/db";

import "./globals.css";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  try {
    const company = await db.company.findFirst({
      select: { faviconUrl: true, name: true },
    });
    return {
      title: company?.name
        ? `${company.name} — iTourTMS`
        : "iTourTMS — Travel Management System",
      description: "Enterprise Travel Management System",
      icons: company?.faviconUrl ? { icon: company.faviconUrl } : undefined,
    };
  } catch {
    return {
      title: "iTourTMS — Travel Management System",
      description: "Enterprise Travel Management System",
    };
  }
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await getLocale();
  const messages = await getMessages();
  const dir = isRTL(locale) ? "rtl" : "ltr";

  return (
    <html lang={locale} dir={dir} suppressHydrationWarning>
      <body className="min-h-screen font-sans antialiased">
        <NextIntlClientProvider messages={messages}>
          <TRPCProvider>
            <TooltipProvider>
              {children}
              <Toaster position="top-right" richColors />
            </TooltipProvider>
          </TRPCProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
