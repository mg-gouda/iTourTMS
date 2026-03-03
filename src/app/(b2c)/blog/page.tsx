import Link from "next/link";
import { format } from "date-fns";
import { Calendar, ArrowRight } from "lucide-react";

import { db } from "@/server/db";
import { getCompanyInfo } from "@/lib/b2c/get-branding";

export const metadata = { title: "Blog" };

export default async function BlogListPage() {
  const company = await getCompanyInfo();
  const posts = company
    ? await db.blogPost.findMany({
        where: { companyId: company.id, status: "PUBLISHED" },
        orderBy: { publishedAt: "desc" },
      })
    : [];

  return (
    <div className="pub-section">
      <div className="pub-container">
        <h1
          className="mb-2 text-3xl font-bold md:text-4xl"
          style={{ fontFamily: "var(--pub-heading-font)" }}
        >
          Blog
        </h1>
        <p className="mb-8 text-[var(--pub-muted-foreground)]">
          Travel guides, tips, and inspiration
        </p>

        {posts.length === 0 ? (
          <p className="text-center text-[var(--pub-muted-foreground)]">No blog posts yet.</p>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {posts.map((post) => (
              <Link key={post.id} href={`/blog/${post.slug}`} className="pub-card group">
                {post.coverImage && (
                  <div className="h-48 overflow-hidden">
                    <img
                      src={post.coverImage}
                      alt={post.title}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                  </div>
                )}
                <div className="p-5">
                  {post.tags.length > 0 && (
                    <div className="mb-2 flex flex-wrap gap-1">
                      {post.tags.map((tag) => (
                        <span
                          key={tag}
                          className="rounded-full bg-[var(--pub-muted)] px-2 py-0.5 text-xs text-[var(--pub-muted-foreground)]"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                  <h2
                    className="mb-2 text-lg font-semibold leading-snug"
                    style={{ fontFamily: "var(--pub-heading-font)" }}
                  >
                    {post.title}
                  </h2>
                  {post.excerpt && (
                    <p className="mb-3 line-clamp-2 text-sm text-[var(--pub-muted-foreground)]">
                      {post.excerpt}
                    </p>
                  )}
                  <div className="flex items-center justify-between text-xs text-[var(--pub-muted-foreground)]">
                    {post.publishedAt && (
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {format(new Date(post.publishedAt), "MMM d, yyyy")}
                      </span>
                    )}
                    <span className="flex items-center gap-1 font-medium text-[var(--pub-primary)]">
                      Read More <ArrowRight className="h-3 w-3" />
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
