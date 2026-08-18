"use client";

import { Check, Copy, Download, ShieldCheck } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";

/**
 * Mandatory two-factor set-up, shared by the invitation screen and the
 * stand-alone /b2b/enrol page. Both reach it holding the partner's password,
 * which is what authorises the calls — there is no session yet.
 *
 * The backup codes are shown once, here, and the partner cannot leave the
 * screen until they confirm they have kept them: a lost phone with no codes
 * means a support call and a staff-side reset.
 */
export function TwoFactorEnrolment({
  email,
  password,
  onDone,
}: {
  email: string;
  password: string;
  onDone: () => void;
}) {
  const [code, setCode] = useState("");
  const [backupCodes, setBackupCodes] = useState<string[] | null>(null);
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const started = useRef(false);

  const start = trpc.b2bPortal.onboarding.startEnrolment.useMutation({
    onError: (e) => setError(e.message),
  });
  const confirm = trpc.b2bPortal.onboarding.confirmEnrolment.useMutation({
    onSuccess: (r) => setBackupCodes(r.backupCodes),
    onError: (e) => {
      setError(e.message);
      setCode("");
    },
  });

  // React 18 mounts twice in development; without the guard the partner gets
  // two secrets and the QR they scanned is no longer the one on file.
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    start.mutate({ email, password });
  }, [email, password, start]);

  function submitCode(value: string) {
    const clean = value.replace(/\D/g, "").slice(0, 6);
    setCode(clean);
    setError("");
    if (clean.length === 6 && !confirm.isPending) {
      confirm.mutate({ email, password, code: clean });
    }
  }

  if (backupCodes) {
    const text = backupCodes.join("\n");
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 rounded-md bg-emerald-500/10 px-3 py-2 text-xs text-emerald-400">
          <ShieldCheck className="h-4 w-4 shrink-0" />
          Two-factor authentication is on.
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs text-gray-300">Your backup codes</Label>
          <p className="text-xs text-gray-500">
            Keep these somewhere safe. If you lose your phone, each code signs you in once.
            You will not see them again.
          </p>
          <div className="grid grid-cols-2 gap-1.5 rounded-md border border-white/[0.08] bg-white/[0.04] p-3 font-mono text-sm tracking-wider text-white">
            {backupCodes.map((c) => (
              <span key={c}>{c}</span>
            ))}
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            className="h-9 flex-1 border-white/[0.08] bg-white/[0.04] text-xs text-gray-200 hover:bg-white/[0.08] hover:text-white"
            onClick={() => {
              void navigator.clipboard.writeText(text);
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            }}
          >
            {copied ? <Check className="mr-1.5 h-3.5 w-3.5" /> : <Copy className="mr-1.5 h-3.5 w-3.5" />}
            {copied ? "Copied" : "Copy"}
          </Button>
          <Button
            type="button"
            variant="outline"
            className="h-9 flex-1 border-white/[0.08] bg-white/[0.04] text-xs text-gray-200 hover:bg-white/[0.08] hover:text-white"
            onClick={() => {
              const url = URL.createObjectURL(new Blob([text], { type: "text/plain" }));
              const a = document.createElement("a");
              a.href = url;
              a.download = "b2b-portal-backup-codes.txt";
              a.click();
              URL.revokeObjectURL(url);
            }}
          >
            <Download className="mr-1.5 h-3.5 w-3.5" />
            Download
          </Button>
        </div>

        <label className="flex items-start gap-2 text-xs text-gray-400">
          <input
            type="checkbox"
            checked={saved}
            onChange={(e) => setSaved(e.target.checked)}
            className="mt-0.5 h-3.5 w-3.5 rounded border-white/20 bg-white/[0.04]"
          />
          I have saved my backup codes somewhere safe.
        </label>

        <Button className="h-9 w-full text-sm" disabled={!saved} onClick={onDone}>
          Continue to sign in
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {error && (
        <div className="rounded-md bg-red-500/10 px-3 py-2 text-xs text-red-400">{error}</div>
      )}

      <div className="space-y-1.5 text-center">
        <Label className="text-xs text-gray-300">Scan this with your authenticator app</Label>
        <p className="text-xs text-gray-500">
          Use Google Authenticator, Microsoft Authenticator or a similar app on your phone.
        </p>
        <div className="flex justify-center py-1">
          {start.data ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={start.data.qrDataUrl}
              alt="Two-factor QR code"
              className="h-40 w-40 rounded-md bg-white p-2"
            />
          ) : (
            <div className="h-40 w-40 animate-pulse rounded-md bg-white/[0.06]" />
          )}
        </div>
        {start.data && (
          <p className="font-mono text-[11px] break-all text-gray-500">
            Can&apos;t scan? Enter this key: {start.data.secret}
          </p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="enrol-code" className="text-xs text-gray-300">
          Then type the 6-digit code it shows
        </Label>
        <Input
          id="enrol-code"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          placeholder="000000"
          value={code}
          disabled={!start.data || confirm.isPending}
          onChange={(e) => submitCode(e.target.value)}
          className="h-10 border-white/[0.08] bg-white/[0.04] text-center text-lg tracking-[0.5em] text-white placeholder:tracking-[0.5em] placeholder:text-gray-600 focus:border-[#6587B5] focus:bg-white/[0.07]"
        />
        <p className="text-center text-xs text-gray-500">
          {confirm.isPending ? "Checking..." : "The code changes every 30 seconds."}
        </p>
      </div>
    </div>
  );
}
