import Link from "next/link";
import {
  Users,
  UserCheck,
  Search,
  CalendarCheck,
  FileText,
  DollarSign,
  TrendingUp,
  CreditCard,
  BarChart3,
  Receipt,
  ClipboardList,
} from "lucide-react";

const sections = [
  { href: "/b2b-portal/tour-operators", label: "Tour Operators", desc: "Manage tour operator partners and accounts", icon: Users },
  { href: "/b2b-portal/travel-agents", label: "Travel Agents", desc: "Manage travel agent partners and credentials", icon: UserCheck },
  { href: "/b2b-portal/search", label: "Search & Book", desc: "Search availability and create bookings", icon: Search },
  { href: "/b2b-portal/reservations", label: "Reservations", desc: "View and manage partner reservations", icon: CalendarCheck },
  { href: "/b2b-portal/vouchers", label: "Vouchers", desc: "Generate and manage booking vouchers", icon: FileText },
  { href: "/b2b-portal/rate-sheets", label: "Rate Sheets", desc: "Publish and distribute rate sheets to partners", icon: DollarSign },
  { href: "/b2b-portal/markups", label: "Markup Rules", desc: "Configure partner-specific markup and pricing", icon: TrendingUp },
  { href: "/b2b-portal/credit", label: "Credit Management", desc: "Partner credit limits, balances, and payments", icon: CreditCard },
  { href: "/b2b-portal/reports/bookings", label: "Booking Reports", desc: "Booking volume and status analytics", icon: BarChart3 },
  { href: "/b2b-portal/reports/revenue", label: "Revenue", desc: "Revenue breakdown by partner and period", icon: Receipt },
  { href: "/b2b-portal/reports/statements", label: "Statements", desc: "Generate partner account statements", icon: ClipboardList },
];

export default function B2bPortalDashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">B2B Portal</h1>
        <p className="text-muted-foreground">
          Manage partner relationships, bookings, rate distribution, and commercial terms
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {sections.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="group relative overflow-hidden rounded-xl border bg-card p-5 shadow-sm transition-all duration-200 hover:shadow-md hover:-translate-y-0.5"
          >
            <div className="mb-3 inline-flex rounded-lg bg-gradient-to-br from-indigo-500/15 to-indigo-500/5 p-2.5 text-indigo-600 dark:text-indigo-400">
              <item.icon className="h-5 w-5" />
            </div>
            <h3 className="font-semibold tracking-tight">{item.label}</h3>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              {item.desc}
            </p>
            <div className="absolute inset-x-0 bottom-0 h-0.5 bg-gradient-to-r from-transparent via-primary/20 to-transparent opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
          </Link>
        ))}
      </div>
    </div>
  );
}
