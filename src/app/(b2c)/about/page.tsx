import { notFound } from "next/navigation";

import { db } from "@/server/db";
import { getCompanyInfo } from "@/lib/b2c/get-branding";

export const metadata = { title: "About Us" };

export default async function AboutPage() {
  const company = await getCompanyInfo();
  if (!company) notFound();

  const page = await db.publicPage.findUnique({
    where: { companyId_slug: { companyId: company.id, slug: "about-us" } },
  });

  return (
    <div className="pub-section">
      <div className="pub-container">
        <h1
          className="mb-6 text-3xl font-bold md:text-4xl"
          style={{ fontFamily: "var(--pub-heading-font)" }}
        >
          About Us
        </h1>
        {page ? (
          <div
            className="prose max-w-none text-[var(--pub-foreground)]"
            dangerouslySetInnerHTML={{ __html: page.content }}
          />
        ) : (
          <div className="text-[var(--pub-muted-foreground)]">
            <p className="mb-4 text-lg">
              Welcome to {company.name}. We are dedicated to providing exceptional
              travel experiences and making your journey unforgettable.
            </p>
            <p>
              With years of experience in the travel industry, we offer handpicked
              hotels, curated tours, and personalized service to meet your every need.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
