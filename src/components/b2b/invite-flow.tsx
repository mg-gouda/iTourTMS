"use client";

import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";

import { TwoFactorEnrolment } from "@/components/b2b/two-factor-enrolment";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";

/**
 * Two steps, one screen: choose a password, then enrol the authenticator.
 * The password is held in memory between them because the enrolment endpoints
 * are public and re-prove identity on every call.
 */
export function InviteFlow({
  token,
  email,
  name,
  partnerName,
}: {
  token: string;
  email: string;
  name: string | null;
  partnerName: string;
}) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [step, setStep] = useState<"password" | "twoFactor">("password");

  const accept = trpc.b2bPortal.onboarding.acceptInvite.useMutation({
    onSuccess: () => setStep("twoFactor"),
    onError: (e) => setError(e.message),
  });

  return (
    <Card className="animate-fade-in-up border-white/[0.08] bg-white/[0.07] shadow-2xl shadow-black/20 ring-1 ring-white/[0.05] backdrop-blur-xl">
      <CardHeader className="pb-4 text-center">
        <p className="text-xs font-medium tracking-wide text-gray-400 uppercase">
          {step === "password" ? "Set your password" : "Secure your account"}
        </p>
        <p className="text-xs text-gray-500">
          {name ? `${name} — ` : ""}
          {partnerName}
        </p>
      </CardHeader>
      <CardContent>
        {step === "password" ? (
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              setError("");
              if (password !== confirmPassword) {
                setError("The two passwords do not match");
                return;
              }
              accept.mutate({ token, password });
            }}
          >
            {error && (
              <div className="rounded-md bg-red-500/10 px-3 py-2 text-xs text-red-400">{error}</div>
            )}

            <div className="space-y-1.5">
              <Label className="text-xs text-gray-300">Email</Label>
              <Input
                value={email}
                readOnly
                className="h-9 border-white/[0.08] bg-white/[0.02] text-sm text-gray-400"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="pw" className="text-xs text-gray-300">
                Choose a password
              </Label>
              <div className="relative">
                <Input
                  id="pw"
                  type={show ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoFocus
                  className="h-9 border-white/[0.08] bg-white/[0.04] pr-9 text-sm text-white placeholder:text-gray-500 focus:border-[#6587B5] focus:bg-white/[0.07]"
                />
                <button
                  type="button"
                  onClick={() => setShow(!show)}
                  className="absolute top-1/2 right-2 -translate-y-1/2 text-gray-400 hover:text-gray-200"
                  tabIndex={-1}
                >
                  {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <p className="text-xs text-gray-500">
                At least 12 characters, with an upper-case letter, a lower-case letter and a number.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="pw2" className="text-xs text-gray-300">
                Type it again
              </Label>
              <Input
                id="pw2"
                type={show ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className="h-9 border-white/[0.08] bg-white/[0.04] text-sm text-white focus:border-[#6587B5] focus:bg-white/[0.07]"
              />
            </div>

            <Button type="submit" className="h-9 w-full text-sm" disabled={accept.isPending}>
              {accept.isPending ? "Saving..." : "Continue"}
            </Button>
          </form>
        ) : (
          <TwoFactorEnrolment
            email={email}
            password={password}
            onDone={() => {
              window.location.href = "/b2b/login";
            }}
          />
        )}
      </CardContent>
    </Card>
  );
}
