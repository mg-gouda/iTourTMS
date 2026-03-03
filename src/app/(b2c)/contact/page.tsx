import { Phone, Mail, MapPin } from "lucide-react";

import { getBranding, getCompanyInfo } from "@/lib/b2c/get-branding";
import { ContactForm } from "./contact-form";

export const metadata = { title: "Contact Us" };

export default async function ContactPage() {
  const branding = await getBranding();
  const company = await getCompanyInfo();

  return (
    <div className="pub-section">
      <div className="pub-container">
        <h1
          className="mb-2 text-3xl font-bold md:text-4xl"
          style={{ fontFamily: "var(--pub-heading-font)" }}
        >
          Contact Us
        </h1>
        <p className="mb-8 text-[var(--pub-muted-foreground)]">
          Get in touch with us. We&apos;d love to hear from you.
        </p>

        <div className="grid gap-8 lg:grid-cols-3">
          {/* Contact Info */}
          <div className="space-y-6">
            {branding.contactPhone && (
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--pub-primary)] text-white">
                  <Phone className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-medium">Phone</h3>
                  <a href={`tel:${branding.contactPhone}`} className="text-sm text-[var(--pub-muted-foreground)] hover:text-[var(--pub-primary)]">
                    {branding.contactPhone}
                  </a>
                </div>
              </div>
            )}
            {branding.contactEmail && (
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--pub-primary)] text-white">
                  <Mail className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-medium">Email</h3>
                  <a href={`mailto:${branding.contactEmail}`} className="text-sm text-[var(--pub-muted-foreground)] hover:text-[var(--pub-primary)]">
                    {branding.contactEmail}
                  </a>
                </div>
              </div>
            )}
            {branding.contactAddress && (
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--pub-primary)] text-white">
                  <MapPin className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-medium">Address</h3>
                  <p className="text-sm text-[var(--pub-muted-foreground)]">{branding.contactAddress}</p>
                </div>
              </div>
            )}
          </div>

          {/* Contact Form */}
          <div className="lg:col-span-2">
            <ContactForm />
          </div>
        </div>
      </div>
    </div>
  );
}
