"use client";

import * as Collapsible from "@radix-ui/react-collapsible";
import {
  CalendarCheck,
  ChevronRight,
  FileText,
  Home,
  Landmark,
  Settings,
  Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
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
  installedModules: InstalledModule[];
  sidebarLogoUrl?: string | null;
}

const mainNav = [
  { name: "Dashboard", href: "/", icon: Home },
];

// ---------------------------------------------------------------------------
// Module routes — grouped into collapsible sub-sections
// ---------------------------------------------------------------------------

interface SubGroup {
  label: string;
  routes: { label: string; href: string }[];
}

interface ModuleRouteConfig {
  topLevel: { label: string; href: string }[];
  groups: SubGroup[];
}

const moduleRoutes: Record<string, ModuleRouteConfig> = {
  finance: {
    topLevel: [{ label: "Dashboard", href: "/finance" }],
    groups: [
      {
        label: "Customers",
        routes: [
          { label: "Invoices", href: "/finance/customers/invoices" },
          { label: "Credit Notes", href: "/finance/customers/credit-notes" },
        ],
      },
      {
        label: "Vendors",
        routes: [
          { label: "Bills", href: "/finance/vendors/bills" },
          { label: "Refunds", href: "/finance/vendors/refunds" },
        ],
      },
      {
        label: "Banking",
        routes: [
          { label: "Payments", href: "/finance/payments" },
          { label: "Statements", href: "/finance/banking/statements" },
          { label: "Reconciliation", href: "/finance/banking/reconciliation" },
          { label: "Batch Payments", href: "/finance/banking/batch-payments" },
        ],
      },
      {
        label: "Accounting",
        routes: [
          { label: "Journal Entries", href: "/finance/accounting/journal-entries" },
          { label: "Recurring Entries", href: "/finance/accounting/recurring-entries" },
          { label: "Budgets", href: "/finance/accounting/budgets" },
        ],
      },
      {
        label: "Configuration",
        routes: [
          { label: "Chart of Accounts", href: "/finance/configuration/chart-of-accounts" },
          { label: "Journals", href: "/finance/configuration/journals" },
          { label: "Taxes", href: "/finance/configuration/taxes" },
          { label: "Tax Groups", href: "/finance/configuration/tax-groups" },
          { label: "Payment Terms", href: "/finance/configuration/payment-terms" },
          { label: "Fiscal Positions", href: "/finance/configuration/fiscal-positions" },
          { label: "Currencies", href: "/finance/configuration/currencies" },
          { label: "Fiscal Years", href: "/finance/configuration/fiscal-years" },
        ],
      },
      {
        label: "Reports",
        routes: [
          { label: "Profit & Loss", href: "/finance/reports/profit-and-loss" },
          { label: "Balance Sheet", href: "/finance/reports/balance-sheet" },
          { label: "Trial Balance", href: "/finance/reports/trial-balance" },
          { label: "General Ledger", href: "/finance/reports/general-ledger" },
          { label: "Aged Receivable", href: "/finance/reports/aged-receivable" },
          { label: "Aged Payable", href: "/finance/reports/aged-payable" },
          { label: "Budget vs Actuals", href: "/finance/reports/budget-vs-actuals" },
        ],
      },
    ],
  },
  contracting: {
    topLevel: [{ label: "Dashboard", href: "/contracting" }],
    groups: [
      {
        label: "Master Data",
        routes: [
          { label: "Destinations", href: "/contracting/destinations" },
          { label: "Hotels", href: "/contracting/hotels" },
          { label: "Markets", href: "/contracting/markets" },
          { label: "Tour Operators", href: "/contracting/tour-operators" },
        ],
      },
      {
        label: "Contracts",
        routes: [
          { label: "Contracts", href: "/contracting/contracts" },
          { label: "Templates", href: "/contracting/templates" },
          { label: "Rates", href: "/contracting/rates" },
          { label: "Allotments", href: "/contracting/allotments" },
          { label: "Stop Sales", href: "/contracting/stop-sales" },
          { label: "Expiring", href: "/contracting/expiring" },
          { label: "Import", href: "/contracting/import" },
        ],
      },
      {
        label: "Commercial",
        routes: [
          { label: "Markup Rules", href: "/contracting/markups" },
          { label: "Tariffs", href: "/contracting/tariffs" },
        ],
      },
      {
        label: "Reports",
        routes: [
          { label: "Contract Summary", href: "/contracting/reports/contract-summary" },
          { label: "Rate Comparison", href: "/contracting/reports/rate-comparison" },
          { label: "Season Coverage", href: "/contracting/reports/season-coverage" },
          { label: "Seasonal Offers", href: "/contracting/reports/seasonal-offers" },
          { label: "EBD Conditions", href: "/contracting/reports/ebd-conditions" },
          { label: "Allotment Utilization", href: "/contracting/reports/allotment-utilization" },
        ],
      },
    ],
  },
  crm: {
    topLevel: [{ label: "Dashboard", href: "/crm" }],
    groups: [
      {
        label: "Management",
        routes: [
          { label: "Leads", href: "/crm/leads" },
          { label: "Pipeline", href: "/crm/pipeline" },
          { label: "Contacts", href: "/crm/contacts" },
        ],
      },
    ],
  },
  reservations: {
    topLevel: [{ label: "Dashboard", href: "/reservations" }],
    groups: [
      {
        label: "Management",
        routes: [
          { label: "Bookings", href: "/reservations/bookings" },
          { label: "Guests", href: "/reservations/guests" },
          { label: "Vouchers", href: "/reservations/vouchers" },
        ],
      },
    ],
  },
};

// ---------------------------------------------------------------------------
// Collapsible sub-group component
// ---------------------------------------------------------------------------

function CollapsibleSubGroup({
  group,
  moduleKey,
  pathname,
}: {
  group: SubGroup;
  moduleKey: string;
  pathname: string;
}) {
  const storageKey = `sidebar-${moduleKey}-${group.label}`;
  const hasActiveRoute = group.routes.some((r) => pathname === r.href);

  // Always start with hasActiveRoute for SSR to avoid hydration mismatch,
  // then sync with localStorage after mount.
  const [open, setOpen] = useState(hasActiveRoute);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (!hydrated) {
      const stored = localStorage.getItem(storageKey);
      if (stored !== null) {
        setOpen(stored === "true");
      }
      setHydrated(true);
      return;
    }
    localStorage.setItem(storageKey, String(open));
  }, [open, storageKey, hydrated]);

  // Auto-expand when a route in this group becomes active
  useEffect(() => {
    if (hasActiveRoute && !open) setOpen(true);
  }, [hasActiveRoute]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Collapsible.Root open={open} onOpenChange={setOpen}>
      <Collapsible.Trigger asChild>
        <button
          className={cn(
            "flex w-full items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-sidebar-foreground/60 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
            hasActiveRoute && "text-sidebar-foreground",
          )}
        >
          <ChevronRight
            className={cn(
              "h-3 w-3 shrink-0 transition-transform duration-200",
              open && "rotate-90",
            )}
          />
          {group.label}
        </button>
      </Collapsible.Trigger>
      <Collapsible.Content className="overflow-hidden data-[state=closed]:animate-slideUp data-[state=open]:animate-slideDown">
        <SidebarMenu className="ml-3 border-l border-sidebar-border pl-2">
          {group.routes.map((route) => (
            <SidebarMenuItem key={route.href}>
              <SidebarMenuButton
                asChild
                isActive={pathname === route.href}
                className="h-7 text-xs"
              >
                <Link href={route.href}>
                  <span>{route.label}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </Collapsible.Content>
    </Collapsible.Root>
  );
}

// ---------------------------------------------------------------------------
// Main sidebar
// ---------------------------------------------------------------------------

export function AppSidebar({ installedModules, sidebarLogoUrl }: AppSidebarProps) {
  const pathname = usePathname();

  return (
    <Sidebar>
      <SidebarHeader className="border-b px-4 py-3">
        <Link href="/" className="flex items-center gap-2">
          {sidebarLogoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={sidebarLogoUrl}
              alt="Logo"
              className="h-8 w-auto object-contain"
            />
          ) : (
            <>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <span className="text-sm font-bold">iT</span>
              </div>
              <span className="text-lg font-bold">iTourTMS</span>
            </>
          )}
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

        {/* Module navigation — collapsible sub-groups */}
        {installedModules.map((mod) => {
          const Icon = iconMap[mod.icon] || FileText;
          const config = moduleRoutes[mod.name];
          if (!config) return null;

          return (
            <SidebarGroup key={mod.name}>
              <SidebarGroupLabel className="flex items-center gap-1.5">
                <Icon className="h-3.5 w-3.5" />
                {mod.displayName}
              </SidebarGroupLabel>
              <SidebarGroupContent className="space-y-1">
                {/* Top-level routes (e.g. Dashboard) */}
                <SidebarMenu>
                  {config.topLevel.map((route) => (
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

                {/* Collapsible sub-groups */}
                {config.groups.map((group) => (
                  <CollapsibleSubGroup
                    key={group.label}
                    group={group}
                    moduleKey={mod.name}
                    pathname={pathname}
                  />
                ))}
              </SidebarGroupContent>
            </SidebarGroup>
          );
        })}
      </SidebarContent>

      <SidebarFooter className="border-t p-3">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild isActive={pathname === "/settings"}>
              <Link href="/settings">
                <Settings className="h-4 w-4" />
                <span>Settings</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
