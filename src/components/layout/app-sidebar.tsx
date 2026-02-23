"use client";

import {
  CalendarCheck,
  FileText,
  Home,
  Landmark,
  LogOut,
  Settings,
  Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

const iconMap: Record<string, React.ElementType> = {
  Landmark,
  FileText,
  Users,
  CalendarCheck,
};

interface InstalledModule {
  name: string;
  displayName: string;
  icon: string;
}

interface AppSidebarProps {
  user: { name: string | null; email: string };
  installedModules: InstalledModule[];
}

const mainNav = [
  { name: "Dashboard", href: "/", icon: Home },
  { name: "Settings", href: "/settings", icon: Settings },
];

const moduleRoutes: Record<string, { label: string; href: string }[]> = {
  finance: [
    { label: "Dashboard", href: "/finance" },
    { label: "Invoices", href: "/finance/customers/invoices" },
    { label: "Credit Notes", href: "/finance/customers/credit-notes" },
    { label: "Bills", href: "/finance/vendors/bills" },
    { label: "Refunds", href: "/finance/vendors/refunds" },
    { label: "Payments", href: "/finance/payments" },
    { label: "Bank Statements", href: "/finance/banking/statements" },
    { label: "Reconciliation", href: "/finance/banking/reconciliation" },
    { label: "Batch Payments", href: "/finance/banking/batch-payments" },
    { label: "Journal Entries", href: "/finance/accounting/journal-entries" },
    { label: "Chart of Accounts", href: "/finance/configuration/chart-of-accounts" },
    { label: "Journals", href: "/finance/configuration/journals" },
    { label: "Taxes", href: "/finance/configuration/taxes" },
    { label: "Tax Groups", href: "/finance/configuration/tax-groups" },
    { label: "Payment Terms", href: "/finance/configuration/payment-terms" },
    { label: "Fiscal Positions", href: "/finance/configuration/fiscal-positions" },
    { label: "Currencies", href: "/finance/configuration/currencies" },
    { label: "Fiscal Years", href: "/finance/configuration/fiscal-years" },
    { label: "Profit & Loss", href: "/finance/reports/profit-and-loss" },
    { label: "Balance Sheet", href: "/finance/reports/balance-sheet" },
    { label: "Trial Balance", href: "/finance/reports/trial-balance" },
    { label: "General Ledger", href: "/finance/reports/general-ledger" },
    { label: "Aged Receivable", href: "/finance/reports/aged-receivable" },
    { label: "Aged Payable", href: "/finance/reports/aged-payable" },
  ],
  contracting: [
    { label: "Dashboard", href: "/contracting" },
    { label: "Hotels", href: "/contracting/hotels" },
    { label: "Contracts", href: "/contracting/contracts" },
    { label: "Rates", href: "/contracting/rates" },
  ],
  crm: [
    { label: "Dashboard", href: "/crm" },
    { label: "Leads", href: "/crm/leads" },
    { label: "Pipeline", href: "/crm/pipeline" },
    { label: "Contacts", href: "/crm/contacts" },
  ],
  reservations: [
    { label: "Dashboard", href: "/reservations" },
    { label: "Bookings", href: "/reservations/bookings" },
    { label: "Guests", href: "/reservations/guests" },
    { label: "Vouchers", href: "/reservations/vouchers" },
  ],
};

export function AppSidebar({ user, installedModules }: AppSidebarProps) {
  const pathname = usePathname();

  const initials = user.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : user.email[0].toUpperCase();

  return (
    <Sidebar>
      <SidebarHeader className="border-b px-4 py-3">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <span className="text-sm font-bold">iT</span>
          </div>
          <span className="text-lg font-bold">iTourTMS</span>
        </Link>
      </SidebarHeader>

      <SidebarContent>
        {/* Main navigation */}
        <SidebarGroup>
          <SidebarGroupLabel>Main</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNav.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname === item.href}
                  >
                    <Link href={item.href}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.name}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Module navigation — only shows installed modules */}
        {installedModules.map((mod) => {
          const Icon = iconMap[mod.icon] || FileText;
          const routes = moduleRoutes[mod.name] || [];

          return (
            <SidebarGroup key={mod.name}>
              <SidebarGroupLabel className="flex items-center gap-1.5">
                <Icon className="h-3.5 w-3.5" />
                {mod.displayName}
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {routes.map((route) => (
                    <SidebarMenuItem key={route.href}>
                      <SidebarMenuButton
                        asChild
                        isActive={pathname === route.href}
                      >
                        <Link href={route.href}>
                          <span>{route.label}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          );
        })}
      </SidebarContent>

      <SidebarFooter className="border-t p-3">
        <div className="flex items-center gap-2">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-primary/10 text-xs">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 truncate">
            <p className="truncate text-sm font-medium">{user.name}</p>
            <p className="truncate text-xs text-muted-foreground">
              {user.email}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0"
            onClick={() => signOut({ callbackUrl: "/login" })}
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
