"use client";

import { useEffect } from "react";

export default function B2cError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[b2c] Unhandled error:", error);
  }, [error]);

  return (
    <div className="pub-section flex min-h-[40vh] flex-col items-center justify-center gap-4 text-center">
      <h2
        className="text-2xl font-bold"
        style={{ fontFamily: "var(--pub-heading-font)" }}
      >
        Oops! Something went wrong
      </h2>
      <p className="text-[var(--pub-muted-foreground)]">
        We encountered an unexpected error. Please try again.
      </p>
      <button
        onClick={reset}
        className="rounded-[var(--pub-radius)] bg-[var(--pub-primary)] px-6 py-2 text-white hover:opacity-90"
      >
        Try Again
      </button>
    </div>
  );
}
