"use client";

import { useEffect } from "react";

import type { PublicBranding } from "@/lib/b2c/get-branding";

/**
 * Compute contrasting foreground color (black or white) for a given bg hex.
 */
function contrastForeground(hex: string): string {
  const c = hex.replace("#", "");
  const r = parseInt(c.substring(0, 2), 16);
  const g = parseInt(c.substring(2, 4), 16);
  const b = parseInt(c.substring(4, 6), 16);
  // Relative luminance
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5 ? "#0f172a" : "#ffffff";
}

interface ThemeInjectorProps {
  branding: PublicBranding;
}

export function ThemeInjector({ branding }: ThemeInjectorProps) {
  useEffect(() => {
    const root = document.documentElement;

    root.style.setProperty("--pub-primary", branding.primaryColor);
    root.style.setProperty(
      "--pub-primary-foreground",
      contrastForeground(branding.primaryColor),
    );
    root.style.setProperty("--pub-secondary", branding.secondaryColor);
    root.style.setProperty(
      "--pub-secondary-foreground",
      contrastForeground(branding.secondaryColor),
    );
    root.style.setProperty("--pub-accent", branding.accentColor);
    root.style.setProperty(
      "--pub-accent-foreground",
      contrastForeground(branding.accentColor),
    );
    root.style.setProperty("--pub-background", branding.backgroundColor);
    root.style.setProperty("--pub-foreground", branding.foregroundColor);
    root.style.setProperty("--pub-card", branding.cardColor);
    root.style.setProperty(
      "--pub-card-foreground",
      contrastForeground(branding.cardColor),
    );
    root.style.setProperty("--pub-muted", branding.mutedColor);
    root.style.setProperty("--pub-heading-font", `"${branding.headingFont}", sans-serif`);
    root.style.setProperty("--pub-body-font", `"${branding.bodyFont}", sans-serif`);
  }, [branding]);

  return null;
}
