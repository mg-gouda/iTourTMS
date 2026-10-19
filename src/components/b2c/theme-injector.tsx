"use client";

import { useEffect } from "react";

import type { PublicBranding } from "@/lib/b2c/get-branding";
import { brandingVars } from "@/lib/b2c/branding-vars";

/**
 * Mirrors the site's theme variables onto <html> so content portalled outside
 * the site wrapper (date pickers, dialogs) is themed too. The wrapper already
 * carries the same variables from the server, so the first paint is right.
 */
export function ThemeInjector({ branding }: { branding: PublicBranding }) {
  useEffect(() => {
    const root = document.documentElement;
    for (const [k, v] of Object.entries(brandingVars(branding))) root.style.setProperty(k, v);
  }, [branding]);

  return null;
}
