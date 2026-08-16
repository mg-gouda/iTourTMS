"use client";

import { useEffect } from "react";

import { trpc } from "@/lib/trpc";

const STORAGE_KEY = "ui-density";

export type Density = "comfortable" | "compact";

/** Applies the density immediately and remembers it for the next page load. */
export function applyDensity(density: Density) {
  document.documentElement.dataset.density = density;
  try {
    localStorage.setItem(STORAGE_KEY, density);
  } catch {
    // Private mode — the preference still applies for this session
  }
}

/**
 * Density is a per-user preference stored beside the locale. The cached value
 * is applied first so the page does not reflow once the profile arrives.
 */
export function DensityProvider() {
  const { data } = trpc.user.getProfile.useQuery(undefined, { staleTime: 60_000 });

  useEffect(() => {
    try {
      const cached = localStorage.getItem(STORAGE_KEY) as Density | null;
      if (cached) document.documentElement.dataset.density = cached;
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (data?.density) applyDensity(data.density as Density);
  }, [data?.density]);

  return null;
}
