"use client";

import { Eye, EyeOff } from "lucide-react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError("Invalid email or password");
      } else {
        router.push("/");
        router.refresh();
      }
    } catch {
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Card className="animate-fade-in-up border-white/[0.08] bg-white/[0.07] shadow-2xl shadow-black/20 backdrop-blur-xl ring-1 ring-white/[0.05]">
        <CardHeader className="pb-4 text-center">
          <p className="text-xs font-medium tracking-wide text-gray-400 uppercase">Sign in to your account</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-3">
            {error && (
              <div className="rounded-md bg-red-500/10 px-3 py-2 text-xs text-red-400">
                {error}
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs text-gray-300">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-9 border-white/[0.08] bg-white/[0.04] text-sm text-white placeholder:text-gray-500 transition-colors duration-200 focus:border-[#6587B5] focus:bg-white/[0.07]"
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
                  className="h-9 border-white/[0.08] bg-white/[0.04] pr-9 text-sm text-white placeholder:text-gray-500 transition-colors duration-200 focus:border-[#6587B5] focus:bg-white/[0.07]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200"
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
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
          </form>
        </CardContent>
      </Card>

      <div className="mt-4 text-center">
        <p className="text-xs text-gray-500">
          iTourTMS v1.0.0
        </p>
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
