"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

export function GeoMarketGuard() {
  const [blocked, setBlocked] = useState(false);
  const [checked, setChecked] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    let cancelled = false;

    async function check() {
      try {
        const res = await fetch("/api/b2c/market-check");
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled && data.hasMarket === false) {
          setBlocked(true);
        }
      } catch {
        // On error, don't block
      } finally {
        if (!cancelled) setChecked(true);
      }
    }

    check();
    return () => { cancelled = true; };
  }, []);

  // Don't block the home page itself — just disable navigation
  if (!blocked || !checked) return null;

  // Block search/booking pages
  const blockedPaths = ["/search", "/hotels", "/hotel", "/booking", "/b2b"];
  const isBlockedPath = blockedPaths.some(
    (p) => pathname === p || pathname.startsWith(p + "/"),
  );

  if (!isBlockedPath && pathname !== "/") return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div
        className="mx-4 max-w-md rounded-2xl bg-white p-8 text-center shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-label="Service unavailable"
      >
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-orange-100">
          <svg
            className="h-8 w-8 text-orange-500"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
            />
          </svg>
        </div>
        <h2 className="mb-2 text-xl font-bold text-gray-900">
          Service Not Available
        </h2>
        <p className="text-gray-600">
          We&apos;re sorry, our services are not currently available in your
          country. Please contact us for more information.
        </p>
      </div>
    </div>
  );
}
