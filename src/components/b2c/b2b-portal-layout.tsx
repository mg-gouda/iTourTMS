"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { redirect } from "next/navigation";

const navItems = [
  { href: "/b2b/dashboard", label: "Dashboard" },
  { href: "/b2b/search", label: "Search & Book" },
  { href: "/b2b/reservations", label: "Reservations" },
  { href: "/b2b/account", label: "Account" },
];

export default function B2bPortalLayoutClient({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { data: session, status } = useSession();

  // Redirect to login if not authenticated or not a partner user
  if (status === "unauthenticated") {
    redirect("/b2b/login");
  }

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-[var(--pub-muted-foreground)]">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--pub-background)]">
      {/* Top Navigation */}
      <nav className="border-b border-[var(--pub-border)] bg-white/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-6">
            <Link
              href="/b2b/dashboard"
              className="text-lg font-bold"
              style={{ fontFamily: "var(--pub-heading-font)" }}
            >
              Partner Portal
            </Link>
            <div className="hidden gap-1 md:flex">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`rounded-[var(--pub-radius)] px-3 py-1.5 text-sm font-medium transition-colors ${
                    pathname === item.href || pathname.startsWith(item.href + "/")
                      ? "bg-[var(--pub-primary)] text-white"
                      : "text-[var(--pub-foreground)] hover:bg-[var(--pub-muted)]"
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-[var(--pub-muted-foreground)]">
              {session?.user?.name}
            </span>
            <button
              onClick={() => signOut({ callbackUrl: "/b2b/login" })}
              className="rounded-[var(--pub-radius)] border border-[var(--pub-border)] px-3 py-1.5 text-sm text-[var(--pub-muted-foreground)] hover:bg-[var(--pub-muted)]"
            >
              Sign Out
            </button>
          </div>
        </div>
        {/* Mobile nav */}
        <div className="flex gap-1 overflow-x-auto px-4 pb-2 md:hidden">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`shrink-0 rounded-[var(--pub-radius)] px-3 py-1.5 text-sm font-medium ${
                pathname === item.href || pathname.startsWith(item.href + "/")
                  ? "bg-[var(--pub-primary)] text-white"
                  : "text-[var(--pub-foreground)] hover:bg-[var(--pub-muted)]"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </div>
      </nav>

      <main className="mx-auto max-w-7xl px-4 py-6">{children}</main>
    </div>
  );
}
