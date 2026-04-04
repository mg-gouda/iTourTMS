"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { KeyRound, Check, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";

export default function LicenseActivatePage() {
  const router = useRouter();
  const [licenseKey, setLicenseKey] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const activateLicense = trpc.setup.activateLicense.useMutation({
    onSuccess: () => {
      setSuccess(true);
      setError("");
      toast.success("License activated successfully!");
      // Redirect to dashboard after a brief pause
      setTimeout(() => {
        router.push("/dashboard");
        router.refresh();
      }, 1500);
    },
    onError: (err) => {
      setError(err.message);
    },
  });

  function handleActivate() {
    if (!licenseKey.trim()) {
      setError("Please enter a license key");
      return;
    }
    setError("");
    activateLicense.mutate({ key: licenseKey.trim() });
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
          <KeyRound className="h-7 w-7 text-primary" />
        </div>
        <h1 className="text-2xl font-bold text-foreground">Activate License</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Enter the new license key provided by your system administrator
        </p>
      </div>

      <div className="space-y-4 rounded-lg border bg-card p-6">
        <div className="space-y-1.5">
          <Label htmlFor="licenseKey">License Key</Label>
          <Input
            id="licenseKey"
            value={licenseKey}
            onChange={(e) => {
              setLicenseKey(e.target.value);
              setError("");
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleActivate();
            }}
            placeholder="xxxx-xxxx-xxxx-xxxx"
            className="font-mono text-center text-lg tracking-wider"
            disabled={activateLicense.isPending || success}
          />
          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}
        </div>

        {success ? (
          <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-center dark:border-green-800 dark:bg-green-950">
            <div className="flex items-center justify-center gap-2 text-sm font-medium text-green-700 dark:text-green-300">
              <Check className="h-4 w-4" />
              License activated! Redirecting...
            </div>
          </div>
        ) : (
          <Button
            onClick={handleActivate}
            disabled={activateLicense.isPending || !licenseKey.trim()}
            className="w-full"
          >
            {activateLicense.isPending ? "Validating..." : "Activate License"}
          </Button>
        )}
      </div>

      <div className="text-center">
        <Link
          href="/license-expired"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3 w-3" />
          Back
        </Link>
      </div>
    </div>
  );
}
