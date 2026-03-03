"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { trpc } from "@/lib/trpc";

export default function BlogPostEditorPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const isNew = id === "new";

  const { data, isLoading } = trpc.b2cSite.blogPost.getById.useQuery(
    { id },
    { enabled: !isNew },
  );
  const utils = trpc.useUtils();

  const [form, setForm] = useState({
    title: "",
    slug: "",
    content: "",
    excerpt: "",
    coverImage: "",
    tags: "",
    status: "DRAFT" as "DRAFT" | "PUBLISHED",
  });

  useEffect(() => {
    if (data) {
      setForm({
        title: data.title,
        slug: data.slug,
        content: data.content,
        excerpt: data.excerpt ?? "",
        coverImage: data.coverImage ?? "",
        tags: data.tags.join(", "),
        status: data.status,
      });
    }
  }, [data]);

  const createMutation = trpc.b2cSite.blogPost.create.useMutation({
    onSuccess: () => {
      toast.success("Post created");
      utils.b2cSite.blogPost.list.invalidate();
      router.push("/b2c-site/blog");
    },
    onError: (err) => toast.error(err.message),
  });

  const updateMutation = trpc.b2cSite.blogPost.update.useMutation({
    onSuccess: () => {
      toast.success("Post updated");
      utils.b2cSite.blogPost.list.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const handleSave = () => {
    if (!form.title || !form.slug || !form.content) {
      toast.error("Title, slug, and content are required");
      return;
    }
    const payload = {
      title: form.title,
      slug: form.slug,
      content: form.content,
      excerpt: form.excerpt || null,
      coverImage: form.coverImage || null,
      tags: form.tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
      status: form.status,
    };
    if (isNew) {
      createMutation.mutate(payload);
    } else {
      updateMutation.mutate({ id, ...payload });
    }
  };

  const autoSlug = (title: string) =>
    title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

  if (!isNew && isLoading) {
    return <div className="py-10 text-center text-muted-foreground">Loading...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">
          {isNew ? "New Blog Post" : "Edit Blog Post"}
        </h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => router.push("/b2c-site/blog")}>Cancel</Button>
          <Button onClick={handleSave} disabled={createMutation.isPending || updateMutation.isPending}>
            {createMutation.isPending || updateMutation.isPending ? "Saving..." : "Save"}
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="grid gap-4 p-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Title *</Label>
              <Input
                value={form.title}
                onChange={(e) => {
                  setForm({
                    ...form,
                    title: e.target.value,
                    ...(isNew ? { slug: autoSlug(e.target.value) } : {}),
                  });
                }}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Slug *</Label>
              <Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Cover Image URL</Label>
              <Input value={form.coverImage} onChange={(e) => setForm({ ...form, coverImage: e.target.value })} placeholder="https://..." />
            </div>
            <div className="space-y-1.5">
              <Label>Tags (comma separated)</Label>
              <Input value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} placeholder="egypt, travel, tips" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Excerpt</Label>
            <Textarea value={form.excerpt} onChange={(e) => setForm({ ...form, excerpt: e.target.value })} rows={2} />
          </div>
          <div className="space-y-1.5">
            <Label>Content * (HTML)</Label>
            <Textarea value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} rows={15} className="font-mono text-sm" />
          </div>
          <div className="max-w-xs space-y-1.5">
            <Label>Status</Label>
            <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as "DRAFT" | "PUBLISHED" })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="DRAFT">Draft</SelectItem>
                <SelectItem value="PUBLISHED">Published</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
