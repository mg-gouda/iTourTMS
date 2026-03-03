import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { db } from "@/server/db";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const company = await db.company.findFirst({ select: { id: true } });
  if (!company) return {};

  const page = await db.publicPage.findUnique({
    where: { companyId_slug: { companyId: company.id, slug } },
    select: { title: true, excerpt: true },
  });

  return {
    title: page?.title,
    description: page?.excerpt || undefined,
  };
}

export default async function GenericPublicPage({ params }: Props) {
  const { slug } = await params;
  const company = await db.company.findFirst({ select: { id: true } });
  if (!company) notFound();

  const page = await db.publicPage.findUnique({
    where: { companyId_slug: { companyId: company.id, slug }, status: "PUBLISHED" },
  });

  if (!page) notFound();

  return (
    <div className="pub-section">
      <div className="pub-container">
        <h1
          className="mb-6 text-3xl font-bold md:text-4xl"
          style={{ fontFamily: "var(--pub-heading-font)" }}
        >
          {page.title}
        </h1>
        <div
          className="prose max-w-none text-[var(--pub-foreground)]"
          dangerouslySetInnerHTML={{ __html: page.content }}
        />
      </div>
    </div>
  );
}
