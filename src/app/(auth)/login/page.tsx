"use client";

import { Eye, EyeOff } from "lucide-react";
import { signIn } from "next-auth/react";
import { useState } from "react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function LoginPage() {
  const t = useTranslations("auth");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [otp, setOtp] = useState("");
  const [needsOtp, setNeedsOtp] = useState(false);

  async function attempt(token: string) {
    setError("");
    setLoading(true);

    try {
      const result = await signIn("credentials", {
        email,
        password,
        token,
        redirect: false,
      });

      if (result?.error) {
        if (result.code === "2fa_required") {
          setNeedsOtp(true);
          setOtp("");
        } else if (result.code === "2fa_invalid") {
          setOtp("");
          setError(t("invalidCode"));
        } else {
          setError(t("invalidCredentials"));
        }
      } else {
        // Full page navigation ensures the session cookie is present in the
        // middleware (client-side router push can race with cookie availability).
        const params = new URLSearchParams(window.location.search);
        const callbackUrl = params.get("callbackUrl") ?? "/dashboard";
        window.location.href = callbackUrl;
      }
    } catch {
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  // A complete code in the box is the submit action — no verify button.
  // 6 digits = authenticator code, 8 letters = single-use backup code.
  function handleOtpChange(value: string) {
    const clean = value.replace(/[^0-9a-zA-Z]/g, "").slice(0, 8);
    setOtp(clean);
    if (loading) return;
    if (/^\d{6}$/.test(clean) || /^[a-zA-Z]{8}$/.test(clean)) void attempt(clean);
  }

  return (
    <>
      <Card className="animate-fade-in-up border-white/[0.08] bg-white/[0.07] shadow-2xl ring-1 shadow-black/20 ring-white/[0.05] backdrop-blur-xl">
        <CardHeader className="pb-4 text-center">
          <p className="text-xs font-medium tracking-wide text-gray-400 uppercase">
            {t("loginSubtitle")}
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
                  {t("twoFactorCode")}
                </Label>
                <Input
                  id="otp"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  autoFocus
                  maxLength={8}
                  placeholder="000000"
                  value={otp}
                  onChange={(e) => handleOtpChange(e.target.value)}
                  disabled={loading}
                  className="h-10 border-white/[0.08] bg-white/[0.04] text-center text-lg tracking-[0.5em] text-white transition-colors duration-200 placeholder:tracking-[0.5em] placeholder:text-gray-600 focus:border-[#6587B5] focus:bg-white/[0.07]"
                />
                <p className="text-center text-xs text-gray-500">
                  {loading ? t("verifying") : t("twoFactorPrompt")}
                </p>
              </div>
            ) : (
              <>
                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-xs text-gray-300">
                    {t("email")}
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="admin@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="h-9 border-white/[0.08] bg-white/[0.04] text-sm text-white transition-colors duration-200 placeholder:text-gray-500 focus:border-[#6587B5] focus:bg-white/[0.07]"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="password" className="text-xs text-gray-300">
                    {t("password")}
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
                  className="hover:shadow-primary/25 h-9 w-full text-sm font-medium transition-all duration-200 hover:shadow-lg"
                  disabled={loading}
                >
                  {loading ? t("loggingIn") : t("login")}
                </Button>
              </>
            )}
          </form>
        </CardContent>
      </Card>

      <div className="mt-4 text-center">
        <p className="text-xs text-gray-500">iTourTMS v1.0.0</p>
        <a
          href="https://wa.me/+201002805139"
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-gray-500 transition-colors hover:text-gray-300"
        >
          Contact System Developer: Mohamed Gouda
        </a>
      </div>
    </>
  );
}
