"use client";

import { useTranslations } from "next-intl";
import { toast } from "sonner";
import Link from "next/link";
import { Plus, Pencil, Trash2, Eye, ArrowUpCircle, ArrowDownCircle } from "lucide-react";
import { format } from "date-fns";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { PermissionGuard } from "@/components/shared/permission-guard";

export default function BlogPostsListPage() {
  const { data: posts, isLoading } = trpc.b2cSite.blogPost.list.useQuery();
  const utils = trpc.useUtils();
  const t = useTranslations("b2cSite");
  const tc = useTranslations("common");

  const deleteMutation = trpc.b2cSite.blogPost.delete.useMutation({
    onSuccess: () => { toast.success(tc("deleted")); utils.b2cSite.blogPost.list.invalidate(); },
    onError: (err) => toast.error(err.message),
  });

  const publishMutation = trpc.b2cSite.blogPost.publish.useMutation({
    onSuccess: () => { toast.success(tc("published")); utils.b2cSite.blogPost.list.invalidate(); },
    onError: (err) => toast.error(err.message),
  });

  const unpublishMutation = trpc.b2cSite.blogPost.unpublish.useMutation({
    onSuccess: () => { toast.success(t("blogUnpublished")); utils.b2cSite.blogPost.list.invalidate(); },
    onError: (err) => toast.error(err.message),
  });

  return (

    <PermissionGuard permission="b2c-site:blog:read">
      <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("blog")}</h1>
          <p className="text-muted-foreground">{t("blogDesc")}</p>
        </div>
        <Link href="/b2c-site/blog/new">
          <Button><Plus className="mr-1.5 h-4 w-4" />{t("newBlogPost")}</Button>
        </Link>
      </div>

      {isLoading ? (
        <Card><CardContent className="py-10 text-center text-muted-foreground">{tc("loading")}</CardContent></Card>
      ) : !posts?.length ? (
        <Card><CardContent className="py-10 text-center text-muted-foreground">{t("noBlogPosts")}</CardContent></Card>
      ) : (
        <div className="grid gap-3">
          {posts.map((post) => (
            <Card key={post.id} className="flex items-center justify-between p-4">
              <div className="min-w-0 flex-1">
                <p className="font-medium">{post.title}</p>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span>/blog/{post.slug}</span>
                  {post.publishedAt && (
                    <span>&middot; {format(new Date(post.publishedAt), "MMM d, yyyy")}</span>
                  )}
                  {post.tags.length > 0 && (
                    <span>&middot; {post.tags.join(", ")}</span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={post.status === "PUBLISHED" ? "default" : "secondary"}>
                  {post.status}
                </Badge>
                {post.status === "DRAFT" ? (
                  <Button variant="ghost" size="icon" title="Publish" onClick={() => publishMutation.mutate({ id: post.id })}>
                    <ArrowUpCircle className="h-4 w-4 text-green-600" />
                  </Button>
                ) : (
                  <Button variant="ghost" size="icon" title="Unpublish" onClick={() => unpublishMutation.mutate({ id: post.id })}>
                    <ArrowDownCircle className="h-4 w-4 text-orange-500" />
                  </Button>
                )}
                <Link href={`/b2c-site/blog/${post.id}`}>
                  <Button variant="ghost" size="icon"><Pencil className="h-4 w-4" /></Button>
                </Link>
                <Button variant="ghost" size="icon" onClick={() => { if (confirm("Delete?")) deleteMutation.mutate({ id: post.id }); }}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  

    </PermissionGuard>

  );
}
