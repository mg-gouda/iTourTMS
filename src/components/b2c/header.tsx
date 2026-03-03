import Link from "next/link";
import {
  Globe,
  Menu,
  Phone,
  Search,
  User,
  X,
  ChevronDown,
  MapPin,
  Building2,
  Palmtree,
  Compass,
  Bus,
} from "lucide-react";

import type { PublicBranding } from "@/lib/b2c/get-branding";

interface B2cHeaderProps {
  branding: PublicBranding;
  companyName: string;
  logoUrl?: string | null;
}

export function B2cHeader({ branding, companyName, logoUrl }: B2cHeaderProps) {
  const isTransparent = branding.headerStyle === "TRANSPARENT";
  const isMegaMenu = branding.headerStyle === "MEGA_MENU";

  return (
    <header
      className={`sticky top-0 z-50 w-full transition-all duration-300 ${
        isTransparent
          ? "bg-transparent text-white"
          : "bg-[var(--pub-card)] text-[var(--pub-foreground)] shadow-sm"
      }`}
    >
      {/* Top bar */}
      <div className="border-b border-[var(--pub-border)] bg-[var(--pub-foreground)] text-white/80">
        <div className="pub-container flex items-center justify-between py-1.5 text-xs">
          <div className="flex items-center gap-4">
            {branding.contactPhone && (
              <a href={`tel:${branding.contactPhone}`} className="flex items-center gap-1 hover:text-white">
                <Phone className="h-3 w-3" />
                {branding.contactPhone}
              </a>
            )}
            {branding.contactEmail && (
              <a href={`mailto:${branding.contactEmail}`} className="hidden items-center gap-1 hover:text-white sm:flex">
                {branding.contactEmail}
              </a>
            )}
          </div>
          <div className="flex items-center gap-3">
            {branding.enableB2bPortal && (
              <Link href="/b2b/login" className="hover:text-white">
                B2B Portal
              </Link>
            )}
            <button className="flex items-center gap-1 hover:text-white">
              <Globe className="h-3 w-3" />
              EN
            </button>
          </div>
        </div>
      </div>

      {/* Main nav */}
      <nav className="pub-container">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            {logoUrl ? (
              <img src={logoUrl} alt={companyName} className="h-10 w-auto object-contain" />
            ) : (
              <span
                className="text-xl font-bold"
                style={{
                  fontFamily: "var(--pub-heading-font)",
                  color: "var(--pub-primary)",
                }}
              >
                {companyName}
              </span>
            )}
          </Link>

          {/* Desktop nav links */}
          <div className="hidden items-center gap-1 lg:flex">
            <NavLink href="/destinations" icon={<MapPin className="h-4 w-4" />}>
              Destinations
            </NavLink>
            <NavLink href="/hotels" icon={<Building2 className="h-4 w-4" />}>
              Hotels
            </NavLink>
            <NavLink href="/packages" icon={<Palmtree className="h-4 w-4" />}>
              Packages
            </NavLink>
            <NavLink href="/activities" icon={<Compass className="h-4 w-4" />}>
              Activities
            </NavLink>
            <NavLink href="/transfers" icon={<Bus className="h-4 w-4" />}>
              Transfers
            </NavLink>
            {branding.enableBlog && (
              <NavLink href="/blog">Blog</NavLink>
            )}
            <NavLink href="/contact">Contact</NavLink>
          </div>

          {/* Right side actions */}
          <div className="flex items-center gap-2">
            <Link
              href="/search"
              className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-[var(--pub-muted)]"
            >
              <Search className="h-4 w-4" />
            </Link>
            <Link
              href="/my-bookings/login"
              className="pub-btn pub-btn-primary hidden text-sm sm:flex"
            >
              <User className="h-4 w-4" />
              My Bookings
            </Link>

            {/* Mobile menu toggle */}
            <MobileMenuToggle branding={branding} companyName={companyName} />
          </div>
        </div>
      </nav>
    </header>
  );
}

function NavLink({
  href,
  children,
  icon,
}: {
  href: string;
  children: React.ReactNode;
  icon?: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-[var(--pub-muted)] hover:text-[var(--pub-primary)]"
    >
      {icon}
      {children}
    </Link>
  );
}

function MobileMenuToggle({
  branding,
  companyName,
}: {
  branding: PublicBranding;
  companyName: string;
}) {
  return (
    <div className="lg:hidden">
      {/* Using a details/summary pattern for zero-JS mobile menu */}
      <details className="group">
        <summary className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full hover:bg-[var(--pub-muted)] list-none [&::-webkit-details-marker]:hidden">
          <Menu className="h-5 w-5 group-open:hidden" />
          <X className="hidden h-5 w-5 group-open:block" />
        </summary>
        <div className="absolute left-0 right-0 top-full border-b border-[var(--pub-border)] bg-[var(--pub-card)] p-4 shadow-lg">
          <div className="flex flex-col gap-1">
            <MobileNavLink href="/destinations">Destinations</MobileNavLink>
            <MobileNavLink href="/hotels">Hotels</MobileNavLink>
            <MobileNavLink href="/packages">Packages</MobileNavLink>
            <MobileNavLink href="/activities">Activities</MobileNavLink>
            <MobileNavLink href="/transfers">Transfers</MobileNavLink>
            {branding.enableBlog && <MobileNavLink href="/blog">Blog</MobileNavLink>}
            {branding.enableFaq && <MobileNavLink href="/faq">FAQ</MobileNavLink>}
            <MobileNavLink href="/contact">Contact</MobileNavLink>
            <hr className="my-2 border-[var(--pub-border)]" />
            <MobileNavLink href="/my-bookings/login">My Bookings</MobileNavLink>
            {branding.enableB2bPortal && (
              <MobileNavLink href="/b2b/login">B2B Portal</MobileNavLink>
            )}
          </div>
        </div>
      </details>
    </div>
  );
}

function MobileNavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="rounded-md px-3 py-2.5 text-sm font-medium transition-colors hover:bg-[var(--pub-muted)] hover:text-[var(--pub-primary)]"
    >
      {children}
    </Link>
  );
}
