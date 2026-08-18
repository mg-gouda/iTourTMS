"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";

/**
 * Blocks the portal until the current terms are accepted. Staff publish a new
 * version by adding a row; every partner sees this again on their next page
 * load, and the acceptance is written to the audit trail.
 */
export function TermsAcceptance({
  version,
  body,
  publishedAt,
}: {
  version: string;
  body: string;
  publishedAt: string;
}) {
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState("");

  const accept = trpc.b2bPortal.onboarding.acceptTerms.useMutation({
    onSuccess: () => {
      window.location.href = "/b2b";
    },
    onError: (e) => setError(e.message),
  });

  return (
    <div className="bg-muted/30 flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-3xl">
        <CardHeader>
          <CardTitle className="text-lg">Terms of use</CardTitle>
          <p className="text-muted-foreground text-xs">
            Version {version} · published{" "}
            {new Date(publishedAt).toLocaleDateString(undefined, {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </p>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="mb-3 rounded-md bg-red-500/10 px-3 py-2 text-xs text-red-500">
              {error}
            </div>
          )}
          <div className="max-h-[50vh] overflow-y-auto rounded-md border p-4 text-sm leading-relaxed whitespace-pre-wrap">
            {body}
          </div>
        </CardContent>
        <CardFooter className="flex flex-col items-stretch gap-3">
          <label className="text-muted-foreground flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="mt-0.5 h-4 w-4"
            />
            I have read and accept these terms on behalf of my company.
          </label>
          <Button
            disabled={!agreed || accept.isPending}
            onClick={() => accept.mutate({ version })}
          >
            {accept.isPending ? "Saving..." : "Accept and continue"}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
