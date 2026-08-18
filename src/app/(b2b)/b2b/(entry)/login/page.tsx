"use client";

import { Eye, EyeOff } from "lucide-react";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/** Every failure the realm can return, in words a partner can act on. */
const MESSAGES: Record<string, string> = {
  credentials: "Invalid email or password",
  locked_out:
    "Too many failed attempts. This account is locked for 30 minutes — contact your account manager if you need it sooner.",
  portal_access_denied:
    "This account cannot use the portal. Contact your account manager.",
  "2fa_invalid": "Invalid or expired code",
  "2fa_enrolment_required":
    "Two-factor authentication must be set up before you can sign in.",
};

function LoginForm() {
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [needsOtp, setNeedsOtp] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string>(MESSAGES[params.get("error") ?? ""] ?? "");
  const [needsEnrolment, setNeedsEnrolment] = useState(
    params.get("error") === "2fa_enrolment_required",
  );
  const [loading, setLoading] = useState(false);

  async function attempt(token: string) {
    setError("");
    setLoading(true);
    try {
      const result = await signIn("partner-credentials", {
        email,
        password,
        token,
        redirect: false,
      });

      if (result?.error) {
        if (result.code === "2fa_required") {
          setNeedsOtp(true);
          setOtp("");
        } else {
          if (result.code === "2fa_invalid") setOtp("");
          setNeedsEnrolment(result.code === "2fa_enrolment_required");
          setError(MESSAGES[result.code ?? "credentials"] ?? MESSAGES.credentials);
        }
      } else {
        // Full navigation so the partner cookie is present at the edge gate.
        window.location.href = params.get("callbackUrl") ?? "/b2b";
      }
    } catch {
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  // A complete code submits itself: 6 digits from the app, 8 letters for a backup code.
  function handleOtpChange(value: string) {
    const clean = value.replace(/[^0-9a-zA-Z]/g, "").slice(0, 8);
    setOtp(clean);
    if (loading) return;
    if (/^\d{6}$/.test(clean) || /^[a-zA-Z]{8}$/.test(clean)) void attempt(clean);
  }

  return (
    <>
      <Card className="animate-fade-in-up border-white/[0.08] bg-white/[0.07] shadow-2xl shadow-black/20 ring-1 ring-white/[0.05] backdrop-blur-xl">
        <CardHeader className="pb-4 text-center">
          <p className="text-xs font-medium tracking-wide text-gray-400 uppercase">
            {needsOtp ? "Two-factor authentication" : "Partner sign in"}
          </p>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void attempt(needsOtp ? otp : "");
            }}
            className="space-y-3"
          >
            {error && (
              <div className="rounded-md bg-red-500/10 px-3 py-2 text-xs text-red-400">{error}</div>
            )}

            {needsOtp ? (
              <div className="space-y-1.5">
                <Label htmlFor="otp" className="text-xs text-gray-300">
                  Authentication code
                </Label>
                <Input
                  id="otp"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  autoFocus
                  maxLength={8}
                  placeholder="000000"
                  value={otp}
                  disabled={loading}
                  onChange={(e) => handleOtpChange(e.target.value)}
                  className="h-10 border-white/[0.08] bg-white/[0.04] text-center text-lg tracking-[0.5em] text-white transition-colors duration-200 placeholder:tracking-[0.5em] placeholder:text-gray-600 focus:border-[#6587B5] focus:bg-white/[0.07]"
                />
                <p className="text-center text-xs text-gray-500">
                  {loading
                    ? "Verifying..."
                    : "Enter the 6-digit code from your authenticator app, or an 8-letter backup code"}
                </p>
              </div>
            ) : (
              <>
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
                    className="h-9 border-white/[0.08] bg-white/[0.04] text-sm text-white transition-colors duration-200 placeholder:text-gray-500 focus:border-[#6587B5] focus:bg-white/[0.07]"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="password" className="text-xs text-gray-300">
                    Password
                  </Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="h-9 border-white/[0.08] bg-white/[0.04] pr-9 text-sm text-white transition-colors duration-200 placeholder:text-gray-500 focus:border-[#6587B5] focus:bg-white/[0.07]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute top-1/2 right-2 -translate-y-1/2 text-gray-400 hover:text-gray-200"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <Button
                  type="submit"
                  className="h-9 w-full text-sm font-medium transition-all duration-200 hover:shadow-lg hover:shadow-primary/25"
                  disabled={loading}
                >
                  {loading ? "Signing in..." : "Sign In"}
                </Button>
              </>
            )}
          </form>
        </CardContent>
      </Card>

      <p className="mt-4 text-center text-xs text-gray-500">
        {needsEnrolment ? (
          <a href="/b2b/enrol" className="text-[#88BCEC] hover:underline">
            Set up two-factor authentication
          </a>
        ) : (
          "Trouble signing in? Contact your account manager."
        )}
      </p>
    </>
  );
}

export default function B2bLoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
