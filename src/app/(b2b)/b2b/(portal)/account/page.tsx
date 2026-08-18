"use client";

import { Check, Copy, Eye, EyeOff, KeyRound, ShieldCheck, Smartphone } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { PARTNER_ROLE_DESCRIPTIONS, PARTNER_ROLE_LABELS } from "@/lib/constants/b2b-portal";
import { trpc } from "@/lib/trpc";

/** Below this many codes left, we say so rather than waiting for zero. */
const LOW_BACKUP_CODES = 3;

/** The signed-in person's own account: their name, their password, their phone. */
export default function PartnerAccountPage() {
  const utils = trpc.useUtils();
  const { data: me, isLoading } = trpc.partner.team.me.useQuery();

  const [name, setName] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPw, setShowPw] = useState(false);

  const [codesOpen, setCodesOpen] = useState(false);
  const [otp, setOtp] = useState("");
  const [newCodes, setNewCodes] = useState<string[] | null>(null);
  const [copied, setCopied] = useState(false);

  const [qrOpen, setQrOpen] = useState(false);
  const [qrPassword, setQrPassword] = useState("");

  useEffect(() => {
    if (me?.name) setName(me.name);
  }, [me?.name]);

  const saveProfile = trpc.partner.team.updateProfile.useMutation({
    onSuccess: () => {
      void utils.partner.team.me.invalidate();
      toast.success("Saved.");
    },
    onError: (e) => toast.error(e.message),
  });

  const changePassword = trpc.partner.team.changePassword.useMutation({
    onSuccess: () => {
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      toast.success("Password changed.");
    },
    onError: (e) => toast.error(e.message),
  });

  const regenerate = trpc.partner.team.regenerateBackupCodes.useMutation({
    onSuccess: (r) => {
      setNewCodes(r.backupCodes);
      void utils.partner.team.me.invalidate();
    },
    onError: (e) => {
      toast.error(e.message);
      setOtp("");
    },
  });

  const showQr = trpc.partner.team.twoFactorQr.useMutation({
    onError: (e) => toast.error(e.message),
  });

  if (isLoading || !me) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-9 w-48" />
        <Skeleton className="h-48" />
        <Skeleton className="h-48" />
      </div>
    );
  }

  const lowOnCodes = me.backupCodesLeft <= LOW_BACKUP_CODES;

  return (
    <div className="animate-fade-in space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">My account</h1>
        <p className="text-muted-foreground">
          {me.partnerName}
          {me.partnerRole ? ` · ${PARTNER_ROLE_LABELS[me.partnerRole]}` : ""}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Your details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Email</Label>
              <Input value={me.email} readOnly className="bg-muted/40" />
              <p className="text-muted-foreground text-xs">
                Your email is your username. Your account manager changes it.
              </p>
            </div>
          </div>
          {me.partnerRole && (
            <p className="text-muted-foreground text-xs">
              {PARTNER_ROLE_DESCRIPTIONS[me.partnerRole]}
            </p>
          )}
          <div className="flex justify-end">
            <Button
              disabled={!name.trim() || name === me.name || saveProfile.isPending}
              onClick={() => saveProfile.mutate({ name: name.trim() })}
            >
              {saveProfile.isPending ? "Saving..." : "Save"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Password</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Current password</Label>
              <div className="relative">
                <Input
                  type={showPw ? "text" : "password"}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="text-muted-foreground absolute top-1/2 right-2 -translate-y-1/2"
                  tabIndex={-1}
                >
                  {showPw ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">New password</Label>
              <Input
                type={showPw ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Type it again</Label>
              <Input
                type={showPw ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
          </div>
          <p className="text-muted-foreground text-xs">
            At least 12 characters, with an upper-case letter, a lower-case letter and a number.
          </p>
          <div className="flex justify-end">
            <Button
              disabled={
                !currentPassword ||
                newPassword.length < 12 ||
                newPassword !== confirmPassword ||
                changePassword.isPending
              }
              onClick={() => changePassword.mutate({ currentPassword, newPassword })}
            >
              <KeyRound className="mr-2 size-4" />
              {changePassword.isPending ? "Changing..." : "Change password"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Two-factor authentication</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <ShieldCheck className="size-4 text-emerald-600" />
            <span>On, and required on this portal.</span>
            <Badge variant={lowOnCodes ? "warning" : "secondary"}>
              {me.backupCodesLeft} backup code{me.backupCodesLeft === 1 ? "" : "s"} left
            </Badge>
          </div>

          {lowOnCodes && (
            <p className="text-xs text-amber-600">
              You are running low. Generate a new set now — if you lose your phone with no
              codes left, only your account manager can get you back in.
            </p>
          )}

          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setNewCodes(null);
                setOtp("");
                setCodesOpen(true);
              }}
            >
              New backup codes
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                showQr.reset();
                setQrPassword("");
                setQrOpen(true);
              }}
            >
              <Smartphone className="mr-2 size-4" /> Add to a new phone
            </Button>
          </div>
        </CardContent>
      </Card>

      <Dialog open={codesOpen} onOpenChange={setCodesOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>New backup codes</DialogTitle>
            <DialogDescription>
              {newCodes
                ? "Keep these safe. Your old codes stopped working just now."
                : "Enter the code from your authenticator app to prove it is you."}
            </DialogDescription>
          </DialogHeader>

          {newCodes ? (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-1.5 rounded-md border p-3 font-mono text-sm tracking-wider">
                {newCodes.map((c) => (
                  <span key={c}>{c}</span>
                ))}
              </div>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  void navigator.clipboard.writeText(newCodes.join("\n"));
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
              >
                {copied ? <Check className="mr-2 size-4" /> : <Copy className="mr-2 size-4" />}
                {copied ? "Copied" : "Copy"}
              </Button>
            </div>
          ) : (
            <Input
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              placeholder="000000"
              value={otp}
              disabled={regenerate.isPending}
              className="text-center text-lg tracking-[0.5em]"
              onChange={(e) => {
                const clean = e.target.value.replace(/\D/g, "").slice(0, 6);
                setOtp(clean);
                if (clean.length === 6 && !regenerate.isPending) {
                  regenerate.mutate({ token: clean });
                }
              }}
            />
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setCodesOpen(false)}>
              {newCodes ? "I have saved them" : "Cancel"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={qrOpen} onOpenChange={setQrOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add to a new phone</DialogTitle>
            <DialogDescription>
              Confirm your password, then scan the code with your authenticator app.
            </DialogDescription>
          </DialogHeader>

          {showQr.data ? (
            <div className="space-y-2 text-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={showQr.data.qrDataUrl}
                alt="Two-factor QR code"
                className="mx-auto size-44 rounded-md bg-white p-2"
              />
              <p className="text-muted-foreground font-mono text-[11px] break-all">
                {showQr.data.secret}
              </p>
            </div>
          ) : (
            <div className="space-y-1.5">
              <Label className="text-xs">Password</Label>
              <Input
                type="password"
                value={qrPassword}
                onChange={(e) => setQrPassword(e.target.value)}
              />
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setQrOpen(false)}>
              Close
            </Button>
            {!showQr.data && (
              <Button
                disabled={!qrPassword || showQr.isPending}
                onClick={() => showQr.mutate({ password: qrPassword })}
              >
                {showQr.isPending ? "Checking..." : "Show the code"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
