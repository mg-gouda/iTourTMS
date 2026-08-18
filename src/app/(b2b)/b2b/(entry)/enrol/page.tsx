"use client";

import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";

import { TwoFactorEnrolment } from "@/components/b2b/two-factor-enrolment";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/**
 * Two-factor set-up for an account that already has a password: a partner
 * whose authenticator was reset by staff, or one created without an invite.
 * The password is the credential here — there is no session until 2FA exists.
 */
export default function B2bEnrolPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [ready, setReady] = useState(false);

  return (
    <Card className="animate-fade-in-up border-white/[0.08] bg-white/[0.07] shadow-2xl shadow-black/20 ring-1 ring-white/[0.05] backdrop-blur-xl">
      <CardHeader className="pb-4 text-center">
        <p className="text-xs font-medium tracking-wide text-gray-400 uppercase">
          Set up two-factor authentication
        </p>
      </CardHeader>
      <CardContent>
        {ready ? (
          <TwoFactorEnrolment
            email={email}
            password={password}
            onDone={() => {
              window.location.href = "/b2b/login";
            }}
          />
        ) : (
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              setReady(true);
            }}
          >
            <p className="text-xs text-gray-500">
              Confirm who you are first, then we will show you the QR code to scan.
            </p>

            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs text-gray-300">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
                className="h-9 border-white/[0.08] bg-white/[0.04] text-sm text-white placeholder:text-gray-500 focus:border-[#6587B5] focus:bg-white/[0.07]"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-xs text-gray-300">
                Password
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={show ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="h-9 border-white/[0.08] bg-white/[0.04] pr-9 text-sm text-white focus:border-[#6587B5] focus:bg-white/[0.07]"
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
            </div>

            <Button type="submit" className="h-9 w-full text-sm">
              Continue
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
