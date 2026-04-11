import Link from "next/link";
import {
  Facebook,
  Instagram,
  Twitter,
  Youtube,
  Linkedin,
  Phone,
  Mail,
  MapPin,
} from "lucide-react";

import type { PublicBranding } from "@/lib/b2c/get-branding";

interface B2cFooterProps {
  branding: PublicBranding;
  companyName: string;
  logoUrl?: string | null;
}

export function B2cFooter({ branding, companyName, logoUrl }: B2cFooterProps) {
  const socialLinks = [
    { url: branding.facebook, icon: Facebook, label: "Facebook" },
    { url: branding.instagram, icon: Instagram, label: "Instagram" },
    { url: branding.twitter, icon: Twitter, label: "Twitter" },
    { url: branding.youtube, icon: Youtube, label: "YouTube" },
    { url: branding.linkedin, icon: Linkedin, label: "LinkedIn" },
  ].filter((s) => s.url);

  return (
    <footer className="border-t border-[var(--pub-border)] bg-[var(--pub-foreground)] py-[30px] text-white/80">
      {/* Main footer */}
      <div className="pub-container">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {/* Column 1: Brand & description */}
          <div className="space-y-4">
            {logoUrl ? (
              <img src={logoUrl} alt={companyName} className="h-10 w-auto brightness-0 invert" />
            ) : (
              <h3
                className="text-xl font-bold text-white"
                style={{ fontFamily: "var(--pub-heading-font)" }}
              >
                {companyName}
              </h3>
            )}
            <p className="text-sm leading-relaxed">
              {branding.siteDescription ||
                `${companyName} — your trusted partner for unforgettable travel experiences.`}
            </p>
            {/* Social icons */}
            {socialLinks.length > 0 && (
              <div className="flex items-center gap-3 pt-2">
                {socialLinks.map((s) => (
                  <a
                    key={s.label}
                    href={s.url!}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 transition-colors hover:bg-[var(--pub-primary)]"
                    aria-label={s.label}
                  >
                    <s.icon className="h-4 w-4" />
                  </a>
                ))}
              </div>
            )}
          </div>

          {/* Column 2: Quick Links */}
          <div>
            <h4 className="mb-4 text-sm font-semibold uppercase tracking-wider text-white">
              Explore
            </h4>
            <ul className="space-y-2 text-sm">
              <FooterLink href="/destinations">Destinations</FooterLink>
              <FooterLink href="/hotels">Hotels</FooterLink>
              <FooterLink href="/packages">Packages</FooterLink>
              <FooterLink href="/activities">Activities</FooterLink>
              <FooterLink href="/transfers">Transfers</FooterLink>
            </ul>
          </div>

          {/* Column 3: Company */}
          <div>
            <h4 className="mb-4 text-sm font-semibold uppercase tracking-wider text-white">
              Company
            </h4>
            <ul className="space-y-2 text-sm">
              <FooterLink href="/about">About Us</FooterLink>
              <FooterLink href="/contact">Contact</FooterLink>
              {branding.enableBlog && <FooterLink href="/blog">Blog</FooterLink>}
              {branding.enableFaq && <FooterLink href="/faq">FAQ</FooterLink>}
              {branding.enableReviews && <FooterLink href="/reviews">Reviews</FooterLink>}
              <FooterLink href="/page/terms">Terms & Conditions</FooterLink>
              <FooterLink href="/page/privacy">Privacy Policy</FooterLink>
            </ul>
          </div>

          {/* Column 4: Contact */}
          <div>
            <h4 className="mb-4 text-sm font-semibold uppercase tracking-wider text-white">
              Contact Us
            </h4>
            <ul className="space-y-3 text-sm">
              {branding.contactAddress && (
                <li className="flex items-start gap-2">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[var(--pub-primary)]" />
                  <span>{branding.contactAddress}</span>
                </li>
              )}
              {branding.contactPhone && (
                <li className="flex items-center gap-2">
                  <Phone className="h-4 w-4 shrink-0 text-[var(--pub-primary)]" />
                  <a href={`tel:${branding.contactPhone}`} className="hover:text-white">
                    {branding.contactPhone}
                  </a>
                </li>
              )}
              {branding.contactEmail && (
                <li className="flex items-center gap-2">
                  <Mail className="h-4 w-4 shrink-0 text-[var(--pub-primary)]" />
                  <a href={`mailto:${branding.contactEmail}`} className="hover:text-white">
                    {branding.contactEmail}
                  </a>
                </li>
              )}
              {branding.whatsapp && (
                <li className="pt-2">
                  <a
                    href={`https://wa.me/${branding.whatsapp.replace(/\D/g, "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="pub-btn pub-btn-primary inline-flex text-xs"
                  >
                    Chat on WhatsApp
                  </a>
                </li>
              )}
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-white/10">
        <div className="pub-container flex flex-col items-center justify-between gap-2 py-[30px] text-xs sm:flex-row">
          <p>&copy; {new Date().getFullYear()} {companyName}. All rights reserved.</p>
          <p className="text-white/50">
            Powered by{" "}
            <span className="font-medium text-white/70">iTourTMS</span>
          </p>
        </div>
      </div>
    </footer>
  );
}

function FooterLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <li>
      <Link
        href={href}
        className="transition-colors hover:text-white"
      >
        {children}
      </Link>
    </li>
  );
}
