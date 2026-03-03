import { ChevronDown } from "lucide-react";

import { db } from "@/server/db";
import { getCompanyInfo } from "@/lib/b2c/get-branding";

export const metadata = { title: "FAQ" };

export default async function FaqPage() {
  const company = await getCompanyInfo();
  const faqs = company
    ? await db.faq.findMany({
        where: { companyId: company.id, active: true },
        orderBy: { sortOrder: "asc" },
      })
    : [];

  // Group by category
  const grouped = faqs.reduce<Record<string, typeof faqs>>((acc, faq) => {
    const cat = faq.category || "General";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(faq);
    return acc;
  }, {});

  return (
    <div className="pub-section">
      <div className="pub-container max-w-3xl">
        <h1
          className="mb-2 text-center text-3xl font-bold md:text-4xl"
          style={{ fontFamily: "var(--pub-heading-font)" }}
        >
          Frequently Asked Questions
        </h1>
        <p className="mb-8 text-center text-[var(--pub-muted-foreground)]">
          Find answers to common questions about our services
        </p>

        {Object.keys(grouped).length === 0 ? (
          <p className="text-center text-[var(--pub-muted-foreground)]">No FAQs available yet.</p>
        ) : (
          <div className="space-y-8">
            {Object.entries(grouped).map(([category, items]) => (
              <div key={category}>
                {Object.keys(grouped).length > 1 && (
                  <h2
                    className="mb-4 text-xl font-semibold"
                    style={{ fontFamily: "var(--pub-heading-font)" }}
                  >
                    {category}
                  </h2>
                )}
                <div className="space-y-2">
                  {items.map((faq) => (
                    <details key={faq.id} className="pub-card group">
                      <summary className="flex cursor-pointer items-center justify-between p-4 font-medium list-none [&::-webkit-details-marker]:hidden">
                        {faq.question}
                        <ChevronDown className="h-4 w-4 shrink-0 text-[var(--pub-muted-foreground)] transition-transform group-open:rotate-180" />
                      </summary>
                      <div className="border-t border-[var(--pub-border)] px-4 pb-4 pt-3 text-sm leading-relaxed text-[var(--pub-muted-foreground)]">
                        {faq.answer}
                      </div>
                    </details>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
