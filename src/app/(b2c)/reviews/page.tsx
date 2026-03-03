import { Star } from "lucide-react";

import { db } from "@/server/db";
import { getCompanyInfo } from "@/lib/b2c/get-branding";

export const metadata = { title: "Reviews" };

export default async function ReviewsPage() {
  const company = await getCompanyInfo();
  const testimonials = company
    ? await db.testimonial.findMany({
        where: { companyId: company.id, active: true },
        orderBy: [{ featured: "desc" }, { createdAt: "desc" }],
      })
    : [];

  const avgRating = testimonials.length
    ? (testimonials.reduce((sum, t) => sum + t.rating, 0) / testimonials.length).toFixed(1)
    : "0";

  return (
    <div className="pub-section">
      <div className="pub-container">
        <div className="mb-8 text-center">
          <h1
            className="mb-2 text-3xl font-bold md:text-4xl"
            style={{ fontFamily: "var(--pub-heading-font)" }}
          >
            Guest Reviews
          </h1>
          {testimonials.length > 0 && (
            <div className="flex items-center justify-center gap-2">
              <div className="pub-stars">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className={`h-5 w-5 ${i < Math.round(Number(avgRating)) ? "fill-current" : "text-gray-300"}`}
                  />
                ))}
              </div>
              <span className="text-lg font-semibold">{avgRating}</span>
              <span className="text-[var(--pub-muted-foreground)]">
                based on {testimonials.length} review{testimonials.length !== 1 ? "s" : ""}
              </span>
            </div>
          )}
        </div>

        {testimonials.length === 0 ? (
          <p className="text-center text-[var(--pub-muted-foreground)]">No reviews yet.</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {testimonials.map((t) => (
              <div key={t.id} className="pub-card p-6">
                <div className="pub-stars mb-3">
                  {Array.from({ length: t.rating }).map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-current" />
                  ))}
                </div>
                <p className="mb-4 text-sm leading-relaxed text-[var(--pub-muted-foreground)]">
                  &ldquo;{t.quote}&rdquo;
                </p>
                <div className="flex items-center gap-3">
                  {t.avatar ? (
                    <img src={t.avatar} alt={t.guestName} className="h-10 w-10 rounded-full object-cover" />
                  ) : (
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--pub-primary)] text-sm font-bold text-white">
                      {t.guestName.charAt(0)}
                    </div>
                  )}
                  <div>
                    <span className="text-sm font-medium">{t.guestName}</span>
                    {t.featured && (
                      <span className="ml-2 rounded-full bg-[var(--pub-primary)] px-2 py-0.5 text-[10px] text-white">
                        Featured
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
