"use client";

import { LockKeyhole } from "lucide-react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";

export function AccessDenied({ permission }: { permission?: string }) {
  const router = useRouter();

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center">
      <div className="p-4 rounded-full bg-muted">
        <LockKeyhole className="h-10 w-10 text-muted-foreground" />
      </div>
      <div className="space-y-1">
        <h2 className="text-xl font-semibold">Access Denied</h2>
        <p className="text-sm text-muted-foreground max-w-sm">
          You don&apos;t have permission to access this page.
          {permission && (
            <span className="block mt-1 font-mono text-xs text-muted-foreground/70">
              Required: {permission}
            </span>
          )}
        </p>
      </div>
      <Button variant="outline" onClick={() => router.back()}>
        Go Back
      </Button>
    </div>
  );
}
