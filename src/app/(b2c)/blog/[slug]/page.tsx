import { notFound } from "next/navigation";
import { format } from "date-fns";
import Link from "next/link";
import { ArrowLeft, Calendar } from "lucide-react";
import type { Metadata } from "next";

import { db } from "@/server/db";
import { sanitizeHtml } from "@/lib/sanitize";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const company = await db.company.findFirst({ select: { id: true } });
  if (!company) return {};

  const post = await db.blogPost.findUnique({
    where: { companyId_slug: { companyId: company.id, slug } },
    select: { title: true, excerpt: true, coverImage: true },
  });

  return {
    title: post?.title,
    description: post?.excerpt || undefined,
    openGraph: post?.coverImage ? { images: [post.coverImage] } : undefined,
  };
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  const company = await db.company.findFirst({ select: { id: true } });
  if (!company) notFound();

  const post = await db.blogPost.findUnique({
    where: { companyId_slug: { companyId: company.id, slug }, status: "PUBLISHED" },
  });

  if (!post) notFound();

  return (
    <div className="pub-section">
      <div className="pub-container max-w-3xl">
        <Link
          href="/blog"
          className="mb-6 inline-flex items-center gap-1 text-sm text-[var(--pub-primary)] hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Blog
        </Link>

        {post.coverImage && (
          <div className="mb-6 overflow-hidden rounded-[var(--pub-radius-lg)]">
            <img src={post.coverImage} alt={post.title} className="w-full object-cover" />
          </div>
        )}

        {post.tags.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-1">
            {post.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-[var(--pub-muted)] px-2.5 py-1 text-xs text-[var(--pub-muted-foreground)]"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        <h1
          className="mb-3 text-3xl font-bold md:text-4xl"
          style={{ fontFamily: "var(--pub-heading-font)" }}
        >
          {post.title}
        </h1>

        {post.publishedAt && (
          <div className="mb-6 flex items-center gap-1 text-sm text-[var(--pub-muted-foreground)]">
            <Calendar className="h-4 w-4" />
            {format(new Date(post.publishedAt), "MMMM d, yyyy")}
          </div>
        )}

        <div
          className="prose max-w-none text-[var(--pub-foreground)]"
          dangerouslySetInnerHTML={{ __html: sanitizeHtml(post.content) }}
        />
      </div>
    </div>
  );
}
