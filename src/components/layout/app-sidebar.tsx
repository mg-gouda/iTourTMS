"use client";

import {
  Briefcase,
  Bus,
  CalendarCheck,
  ChevronRight,
  FileText,
  FolderOpen,
  Globe,
  Home,
  Landmark,
  Settings,
  Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useState } from "react";
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
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

const iconMap: Record<string, React.ElementType> = {
  Landmark,
  FileText,
  Users,
  CalendarCheck,
  Bus,
  Globe,
  Briefcase,
  FolderOpen,
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
          { label: "Customers", href: "/finance/customers" },
          { label: "Invoices", href: "/finance/customers/invoices" },
          { label: "Credit Notes", href: "/finance/customers/credit-notes" },
        ],
      },
      {
        label: "Vendors",
        routes: [
          { label: "Vendors", href: "/finance/vendors" },
          { label: "Bills", href: "/finance/vendors/bills" },
          { label: "Refunds", href: "/finance/vendors/refunds" },
        ],
      },
      {
        label: "Banking",
        routes: [
          { label: "Payments", href: "/finance/payments" },
          { label: "Booking Reconciliation", href: "/finance/booking-reconciliation" },
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
        label: "Statement Reports",
        routes: [
          { label: "Balance Sheet", href: "/finance/reports/balance-sheet" },
          { label: "Profit & Loss", href: "/finance/reports/profit-and-loss" },
          { label: "Cash Flow Statement", href: "/finance/reports/cash-flow" },
        ],
      },
      {
        label: "Ledgers",
        routes: [
          { label: "Trial Balance", href: "/finance/reports/trial-balance" },
          { label: "General Ledger", href: "/finance/reports/general-ledger" },
        ],
      },
      {
        label: "Partner Reports",
        routes: [
          { label: "Partner Ledger", href: "/finance/reports/partner-ledger" },
          { label: "Aged Receivable", href: "/finance/reports/aged-receivable" },
          { label: "Aged Payable", href: "/finance/reports/aged-payable" },
        ],
      },
      {
        label: "Taxes & Fiscal",
        routes: [
          { label: "Tax Report", href: "/finance/reports/tax-report" },
          { label: "Fiscal Report", href: "/finance/reports/fiscal-report" },
          { label: "1099 Report", href: "/finance/reports/1099" },
        ],
      },
      {
        label: "Management",
        routes: [
          { label: "Invoice Analysis", href: "/finance/reports/invoice-analysis" },
          { label: "Analytic Report", href: "/finance/reports/analytic-report" },
          { label: "Executive Summary", href: "/finance/reports/executive-summary" },
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
          { label: "Import Sejour", href: "/contracting/import-sejour" },
        ],
      },
      {
        label: "Commercial",
        routes: [
          { label: "Markup Rules", href: "/contracting/markups" },
          { label: "Tariffs", href: "/contracting/tariffs" },
          { label: "Rate Simulator", href: "/contracting/rate-simulator" },
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
          { label: "Bookings", href: "/crm/bookings" },
        ],
      },
      {
        label: "Catalog",
        routes: [
          { label: "Excursions", href: "/crm/excursions" },
          { label: "Exc. Programs", href: "/crm/exc-programs" },
          { label: "TO Assign", href: "/crm/to-assign" },
          { label: "Pick Up Time Sheet", href: "/crm/pickup-time-sheet" },
          { label: "Excursion Bookings", href: "/crm/excursion-bookings" },
          { label: "Breakdown", href: "/crm/excursion-breakdown" },
          { label: "Exc. Dispatch", href: "/crm/excursion-dispatch" },
          { label: "Suppliers", href: "/crm/suppliers" },
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
          { label: "Group Bookings", href: "/reservations/bookings/new-group" },
          { label: "Guests", href: "/reservations/guests" },
          { label: "Vouchers", href: "/reservations/vouchers" },
          { label: "Hotel Credits", href: "/reservations/hotel-credits" },
          { label: "Daily Operations", href: "/reservations/operations" },
          { label: "Deadlines", href: "/reservations/deadlines" },
        ],
      },
      {
        label: "Analysis",
        routes: [
          { label: "Reports", href: "/reservations/reports" },
        ],
      },
    ],
  },
  traffic: {
    topLevel: [{ label: "Dashboard", href: "/traffic" }],
    groups: [
      {
        label: "Operations",
        routes: [
          { label: "Traffic Jobs", href: "/traffic/jobs" },
          { label: "Dispatch Console", href: "/traffic/dispatch" },
          { label: "Flights", href: "/traffic/flights" },
        ],
      },
      {
        label: "Fleet",
        routes: [
          { label: "Vehicles", href: "/traffic/vehicles" },
          { label: "Vehicle Types", href: "/traffic/vehicle-types" },
          { label: "Drivers", href: "/traffic/drivers" },
        ],
      },
      {
        label: "Service",
        routes: [
          { label: "Reps", href: "/traffic/reps" },
          { label: "Guest Bookings", href: "/traffic/guest-bookings" },
        ],
      },
      {
        label: "Configuration",
        routes: [
          { label: "Zones", href: "/traffic/zones" },
          { label: "Airports", href: "/traffic/airports" },
          { label: "Price Items", href: "/traffic/pricing" },
          { label: "Supplier Prices", href: "/traffic/supplier-prices" },
          { label: "Partner Overrides", href: "/traffic/partner-overrides" },
          { label: "Settings", href: "/traffic/settings" },
        ],
      },
      {
        label: "Reports",
        routes: [
          { label: "Daily Dispatch", href: "/traffic/reports/daily-dispatch" },
          { label: "Job Statistics", href: "/traffic/reports/job-stats" },
          { label: "Driver Performance", href: "/traffic/reports/driver-performance" },
          { label: "Revenue by Service", href: "/traffic/reports/revenue-by-service" },
        ],
      },
    ],
  },
  "b2c-site": {
    topLevel: [{ label: "Dashboard", href: "/b2c-site" }],
    groups: [
      {
        label: "Content",
        routes: [
          { label: "Branding", href: "/b2c-site/branding" },
          { label: "Hero Slides", href: "/b2c-site/hero-slides" },
          { label: "Pages", href: "/b2c-site/pages" },
          { label: "Blog", href: "/b2c-site/blog" },
        ],
      },
      {
        label: "Engagement",
        routes: [
          { label: "FAQ", href: "/b2c-site/faq" },
          { label: "Testimonials", href: "/b2c-site/testimonials" },
          { label: "Inquiries", href: "/b2c-site/inquiries" },
          { label: "Newsletter", href: "/b2c-site/newsletter" },
        ],
      },
      {
        label: "Pricing",
        routes: [
          { label: "Markup Rules", href: "/b2c-site/markup" },
        ],
      },
    ],
  },
  "b2b-portal": {
    topLevel: [{ label: "Dashboard", href: "/b2b-portal" }],
    groups: [
      {
        label: "Partners",
        routes: [
          { label: "Tour Operators", href: "/b2b-portal/tour-operators" },
          { label: "Travel Agents", href: "/b2b-portal/travel-agents" },
          { label: "Partner Users", href: "/b2b-portal/partner-users" },
        ],
      },
      {
        label: "Bookings",
        routes: [
          { label: "Search & Book", href: "/b2b-portal/search" },
          { label: "Reservations", href: "/b2b-portal/reservations" },
          { label: "Vouchers", href: "/b2b-portal/vouchers" },
        ],
      },
      {
        label: "Commercial",
        routes: [
          { label: "Rate Sheets", href: "/b2b-portal/rate-sheets" },
          { label: "Markup Rules", href: "/b2b-portal/markups" },
          { label: "Credit Management", href: "/b2b-portal/credit" },
        ],
      },
      {
        label: "Reports",
        routes: [
          { label: "Booking Reports", href: "/b2b-portal/reports/bookings" },
          { label: "Revenue", href: "/b2b-portal/reports/revenue" },
          { label: "Statements", href: "/b2b-portal/reports/statements" },
        ],
      },
    ],
  },
  "tour-ops": {
    topLevel: [{ label: "Dashboard", href: "/tour-ops" }],
    groups: [
      {
        label: "Files",
        routes: [
          { label: "Open Files", href: "/tour-ops/files" },
          { label: "New File", href: "/tour-ops/files/new" },
        ],
      },
      {
        label: "Templates",
        routes: [
          { label: "Package Templates", href: "/tour-ops/templates" },
          { label: "New Template", href: "/tour-ops/templates/new" },
        ],
      },
      {
        label: "Commercial",
        routes: [
          { label: "Quotations", href: "/tour-ops/quotations" },
        ],
      },
      {
        label: "Master Data",
        routes: [
          { label: "Transportation", href: "/tour-ops/master-data/transport" },
          { label: "Sightseeing", href: "/tour-ops/master-data/sightseeing" },
          { label: "Guidance", href: "/tour-ops/master-data/guidance" },
          { label: "Meals", href: "/tour-ops/master-data/meals" },
        ],
      },
      {
        label: "Reports",
        routes: [
          { label: "P&L Reports", href: "/tour-ops/reports/pnl" },
          { label: "Revenue Analytics", href: "/tour-ops/reports/revenue" },
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

  const contentId = useId();
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

  useEffect(() => {
    if (hasActiveRoute && !open) setOpen(true);
  }, [hasActiveRoute]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div>
      <button
        aria-expanded={open}
        aria-controls={contentId}
        onClick={() => setOpen((v) => !v)}
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
      <div
        id={contentId}
        className={cn(
          "overflow-hidden transition-all duration-200",
          open ? "max-h-96" : "max-h-0",
        )}
      >
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
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Collapsible module wrapper — entire module collapses when name is clicked.
// In icon-rail mode (sidebar collapsed) renders as a single icon + tooltip.
// ---------------------------------------------------------------------------

function CollapsibleModule({
  mod,
  config,
  pathname,
}: {
  mod: InstalledModule;
  config: ModuleRouteConfig;
  pathname: string;
}) {
  const Icon = iconMap[mod.icon] ?? FileText;
  const storageKey = `sidebar-mod-${mod.name}`;
  const { state: sidebarState } = useSidebar();
  const isRail = sidebarState === "collapsed";

  const allHrefs = [
    ...config.topLevel.map((r) => r.href),
    ...config.groups.flatMap((g) => g.routes.map((r) => r.href)),
  ];
  const hasActiveRoute = allHrefs.some(
    (href) => pathname === href || pathname.startsWith(href + "/"),
  );

  const contentId = useId();
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

  useEffect(() => {
    if (hasActiveRoute && !open) setOpen(true);
  }, [hasActiveRoute]); // eslint-disable-line react-hooks/exhaustive-deps

  // Icon-rail mode: single icon button with tooltip
  if (isRail) {
    return (
      <SidebarGroup className="py-0.5">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              isActive={hasActiveRoute}
              tooltip={mod.displayName}
            >
              <Link href={config.topLevel[0]?.href ?? "/"}>
                <Icon className="h-5 w-5" />
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarGroup>
    );
  }

  // Expanded mode: full collapsible tree
  return (
    <SidebarGroup>
      <button
        aria-expanded={open}
        aria-controls={contentId}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-semibold uppercase tracking-wider text-sidebar-foreground/60 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
          hasActiveRoute && "text-sidebar-foreground",
        )}
      >
        <Icon className="h-3.5 w-3.5 shrink-0" />
        <span className="flex-1 text-left">{mod.displayName}</span>
        <ChevronRight
          className={cn(
            "h-3 w-3 shrink-0 transition-transform duration-200",
            open && "rotate-90",
          )}
        />
      </button>
      <div
        id={contentId}
        className={cn(
          "overflow-hidden transition-all duration-200",
          open ? "max-h-[2000px]" : "max-h-0",
        )}
      >
        <SidebarGroupContent className="space-y-1">
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

          {config.groups.map((group) => (
            <CollapsibleSubGroup
              key={group.label}
              group={group}
              moduleKey={mod.name}
              pathname={pathname}
            />
          ))}
        </SidebarGroupContent>
      </div>
    </SidebarGroup>
  );
}

// ---------------------------------------------------------------------------
// Main sidebar
// ---------------------------------------------------------------------------

export function AppSidebar({ installedModules, sidebarLogoUrl }: AppSidebarProps) {
  const pathname = usePathname();

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b px-4 py-3">
        <Link href="/dashboard" className="flex min-w-0 items-center gap-2">
          {sidebarLogoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={sidebarLogoUrl}
              alt="Logo"
              className="h-8 w-auto shrink-0 object-contain"
            />
          ) : (
            <>
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <span className="text-sm font-bold">iT</span>
              </div>
              <span className="truncate text-lg font-bold group-data-[state=collapsed]:hidden">
                iTourTMS
              </span>
            </>
          )}
        </Link>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="group-data-[state=collapsed]:hidden">
            Main
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNav.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname === item.href}
                    tooltip={item.name}
                  >
                    <Link href={item.href}>
                      <item.icon className="h-4 w-4 shrink-0" />
                      <span>{item.name}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {installedModules.map((mod) => {
          const config = moduleRoutes[mod.name];
          if (!config) return null;

          return (
            <CollapsibleModule
              key={mod.name}
              mod={mod}
              config={config}
              pathname={pathname}
            />
          );
        })}
      </SidebarContent>

      <SidebarFooter className="border-t p-3">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              isActive={pathname === "/settings"}
              tooltip="Settings"
            >
              <Link href="/settings">
                <Settings className="h-4 w-4 shrink-0" />
                <span>Settings</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
