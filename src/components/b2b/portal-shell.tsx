"use client";

import {
  BookOpen,
  CreditCard,
  FileSpreadsheet,
  HelpCircle,
  LayoutDashboard,
  LogOut,
  Search,
  Settings,
  Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { HELP_LINKS } from "@/lib/help/b2b-manual";
import { PartnerSessionProvider } from "@/components/b2b/partner-session-provider";

type NavItem = { href: string; label: string; icon: typeof LayoutDashboard; adminOnly?: boolean };

/** Grouped the way the staff sidebar is, so the two feel like one product. */
const NAV: { title: string; items: NavItem[] }[] = [
  {
    title: "Book",
    items: [
      { href: "/b2b", label: "Dashboard", icon: LayoutDashboard },
      { href: "/b2b/search", label: "Search & Book", icon: Search },
      { href: "/b2b/bookings", label: "My Bookings", icon: BookOpen },
    ],
  },
  {
    title: "Account",
    items: [
      { href: "/b2b/credit", label: "Credit & Statements", icon: CreditCard },
      { href: "/b2b/rate-sheets", label: "Rate Sheets", icon: FileSpreadsheet },
      { href: "/b2b/reports", label: "Reports", icon: FileSpreadsheet },
    ],
  },
  {
    title: "Settings",
    items: [
      { href: "/b2b/users", label: "Users", icon: Users, adminOnly: true },
      { href: "/b2b/account", label: "My Account", icon: Settings },
      { href: "/b2b/help", label: "Help & Support", icon: HelpCircle },
    ],
  },
];

export function PortalShell({
  children,
  partnerName,
  userName,
  role,
}: {
  children: React.ReactNode;
  partnerName: string;
  userName: string;
  role: string;
}) {
  const pathname = usePathname();
  const isAdmin = role === "PARTNER_ADMIN";
  const helpSection = HELP_LINKS[pathname];

  return (
    <PartnerSessionProvider>
      <div className="bg-background flex min-h-screen">
        <aside className="bg-sidebar text-sidebar-foreground hidden w-64 shrink-0 flex-col border-r md:flex">
          <div className="border-b px-4 py-4">
            <p className="text-sm font-semibold tracking-tight">{partnerName}</p>
            <p className="text-muted-foreground text-xs tracking-[0.14em] uppercase">B2B Portal</p>
          </div>

          <nav className="flex-1 space-y-4 overflow-y-auto px-2 py-4">
            {NAV.map((group) => {
              const items = group.items.filter((i) => !i.adminOnly || isAdmin);
              if (items.length === 0) return null;
              return (
                <div key={group.title}>
                  <p className="text-muted-foreground px-2 pb-1 text-[11px] font-semibold tracking-[0.1em] uppercase">
                    {group.title}
                  </p>
                  <div className="space-y-0.5">
                    {items.map((item) => {
                      const active =
                        pathname === item.href ||
                        (item.href !== "/b2b" && pathname.startsWith(item.href + "/"));
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          className={cn(
                            "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors",
                            active
                              ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                              : "hover:bg-sidebar-accent/60",
                          )}
                        >
                          <item.icon className="size-4 shrink-0" />
                          {item.label}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </nav>

          <div className="border-t px-3 py-3">
            <p className="truncate text-xs font-medium">{userName}</p>
            <p className="text-muted-foreground text-[11px]">{roleLabel(role)}</p>
            <Button
              variant="ghost"
              size="sm"
              className="mt-2 w-full justify-start px-2"
              onClick={() => void signOut({ callbackUrl: "/b2b/login" })}
            >
              <LogOut className="mr-2 size-4" /> Sign out
            </Button>
          </div>
        </aside>

        <main className="min-w-0 flex-1">
          <div className="mx-auto max-w-7xl p-6">
            {helpSection && (
              <div className="mb-4 flex justify-end">
                {/* Straight into the part of the guide that explains this page,
                  rather than the top of a manual they then have to search. */}
                <Link
                  href={`/b2b/help#${helpSection}`}
                  className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-xs"
                >
                  <HelpCircle className="size-3.5" />
                  How this page works
                </Link>
              </div>
            )}
            {children}
          </div>
        </main>
      </div>
    </PartnerSessionProvider>
  );
}

function roleLabel(role: string): string {
  switch (role) {
    case "PARTNER_ADMIN":
      return "Administrator";
    case "PARTNER_ACCOUNTANT":
      return "Accountant";
    default:
      return "Agent";
  }
}
