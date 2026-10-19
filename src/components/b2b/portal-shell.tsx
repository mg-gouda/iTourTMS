"use client";

import {
  BookOpen,
  CreditCard,
  FileSpreadsheet,
  HelpCircle,
  Bus,
  ClipboardList,
  LayoutDashboard,
  Package,
  Percent,
  Ticket,
  LogOut,
  Search,
  Settings,
  Users,
  Menu,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLocale } from "next-intl";
import { useState } from "react";
import { signOut } from "next-auth/react";

import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { isRTL } from "@/lib/i18n/config";
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
      { href: "/b2b/excursions", label: "Excursions", icon: Ticket },
      { href: "/b2b/transfers", label: "Transfers", icon: Bus },
      { href: "/b2b/packages", label: "Tour Packages", icon: Package },
      { href: "/b2b/requests", label: "Requests", icon: ClipboardList },
    ],
  },
  {
    title: "Account",
    items: [
      { href: "/b2b/credit", label: "Credit & Statements", icon: CreditCard },
      { href: "/b2b/rate-sheets", label: "Rate Sheets", icon: FileSpreadsheet },
      { href: "/b2b/markup", label: "Your Markup", icon: Percent, adminOnly: true },
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
  const locale = useLocale();
  const [menuOpen, setMenuOpen] = useState(false);
  const helpSection = HELP_LINKS[pathname];

  const nav = (onNavigate?: () => void) => (
    <nav className="flex-1 space-y-5 overflow-y-auto px-2 py-4" aria-label="Portal">
      {NAV.map((group) => {
        const items = group.items.filter((i) => !i.adminOnly || isAdmin);
        if (items.length === 0) return null;
        return (
          <div key={group.title}>
            <p className="text-sidebar-foreground/50 px-2 pb-1 text-[11px] font-semibold">{group.title}</p>
            <div className="space-y-0.5">
              {items.map((item) => {
                const active =
                  pathname === item.href || (item.href !== "/b2b" && pathname.startsWith(item.href + "/"));
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onNavigate}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex items-center gap-2 rounded-md px-2 py-1.5 text-[13px] transition-colors",
                      active
                        ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                        : "hover:bg-black/5 dark:hover:bg-white/5",
                    )}
                  >
                    <item.icon className="text-primary size-4 shrink-0 dark:text-sidebar-primary" aria-hidden />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        );
      })}
    </nav>
  );
  const account = (
    <div className="border-t px-3 py-3">
      <p className="truncate text-[13px] font-medium">{userName}</p>
      <p className="text-muted-foreground text-xs">{roleLabel(role)}</p>
      <Button
        variant="ghost"
        size="sm"
        className="mt-2 w-full justify-start px-2"
        onClick={() => void signOut({ callbackUrl: "/b2b/login" })}
      >
        <LogOut className="me-2 size-4" aria-hidden /> Sign out
      </Button>
    </div>
  );

  return (
    <PartnerSessionProvider>
      <div className="bg-background flex min-h-screen flex-col md:flex-row">
        {/* Phones and small tablets: a compact bar; the menu opens the same navigation in a sheet. */}
        <header className="bg-background/75 sticky top-0 z-30 flex h-12 items-center gap-2 border-b px-3 backdrop-blur-xl md:hidden">
          <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Open menu">
                <Menu className="size-5" aria-hidden />
              </Button>
            </SheetTrigger>
            <SheetContent side={isRTL(locale) ? "right" : "left"} className="bg-sidebar text-sidebar-foreground flex w-72 flex-col gap-0 p-0">
              <SheetHeader className="border-b px-4 py-4 text-start">
                <SheetTitle className="text-sm">{partnerName}</SheetTitle>
                <SheetDescription className="text-xs">B2B Portal</SheetDescription>
              </SheetHeader>
              {nav(() => setMenuOpen(false))}
              {account}
            </SheetContent>
          </Sheet>
          <p className="truncate text-sm font-semibold">{partnerName}</p>
        </header>

        <aside className="bg-sidebar text-sidebar-foreground sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-e md:flex">
          <div className="border-b px-4 py-4">
            <p className="text-sm font-semibold tracking-tight">{partnerName}</p>
            <p className="text-muted-foreground text-xs">B2B Portal</p>
          </div>
          {nav()}
          {account}
        </aside>

        <main className="min-w-0 flex-1">
          <div className="mx-auto max-w-7xl p-4 md:p-6">
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
