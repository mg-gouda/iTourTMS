"use client";

import { signIn } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

export default function B2BLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
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
        setError("Invalid email or password. Please try again.");
      } else {
        router.push("/b2b/dashboard");
      }
    } catch {
      setError("Something went wrong. Please try again later.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="pub-section">
      <div className="pub-container max-w-md">
        <div className="pub-card p-8">
          <h1
            className="mb-2 text-center text-2xl font-bold"
            style={{ fontFamily: "var(--pub-heading-font)" }}
          >
            Tour Operator Portal
          </h1>
          <p className="mb-6 text-center text-sm text-[var(--pub-muted-foreground)]">
            Sign in to access your contracts, rates, and bookings.
          </p>

          {error && (
            <div className="mb-4 rounded-[var(--pub-radius)] border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                className="w-full rounded-[var(--pub-radius)] border border-[var(--pub-border)] bg-[var(--pub-background)] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--pub-primary)] disabled:opacity-50"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                className="w-full rounded-[var(--pub-radius)] border border-[var(--pub-border)] bg-[var(--pub-background)] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--pub-primary)] disabled:opacity-50"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="pub-btn pub-btn-primary w-full justify-center disabled:opacity-50"
            >
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>

          <div className="mt-4 text-center">
            <Link
              href="/"
              className="text-sm text-[var(--pub-muted-foreground)] hover:text-[var(--pub-primary)]"
            >
              &larr; Back to Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
