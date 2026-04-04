import Link from "next/link";
import {
  Palette,
  Image,
  FileText,
  BookOpen,
  HelpCircle,
  Star,
  Mail,
  MessageSquare,
  DollarSign,
} from "lucide-react";

const sections = [
  { href: "/b2c-site/branding", label: "Branding & Theme", desc: "Colors, fonts, logos, feature toggles", icon: Palette },
  { href: "/b2c-site/hero-slides", label: "Hero Slides", desc: "Homepage slider images and CTAs", icon: Image },
  { href: "/b2c-site/pages", label: "Pages", desc: "About us, terms, privacy, etc.", icon: FileText },
  { href: "/b2c-site/blog", label: "Blog Posts", desc: "Travel guides and articles", icon: BookOpen },
  { href: "/b2c-site/faq", label: "FAQ", desc: "Frequently asked questions", icon: HelpCircle },
  { href: "/b2c-site/testimonials", label: "Testimonials", desc: "Guest reviews and ratings", icon: Star },
  { href: "/b2c-site/inquiries", label: "Contact Inquiries", desc: "Messages from the contact form", icon: MessageSquare },
  { href: "/b2c-site/newsletter", label: "Newsletter", desc: "Email subscribers", icon: Mail },
  { href: "/b2c-site/markup", label: "Markup Rules", desc: "B2C pricing markup configuration", icon: DollarSign },
];

export default function B2cSiteDashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">B2C Website</h1>
        <p className="text-muted-foreground">
          Manage your public website content, branding, and engagement features
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {sections.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="group relative overflow-hidden rounded-xl border bg-card p-5 shadow-sm transition-all duration-200 hover:shadow-md hover:-translate-y-0.5"
          >
            <div className="mb-3 inline-flex rounded-lg bg-gradient-to-br from-cyan-500/15 to-cyan-500/5 p-2.5 text-cyan-600 dark:text-cyan-400">
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
