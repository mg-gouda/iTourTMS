"use client";

import { useState } from "react";
import { toast } from "sonner";
import Link from "next/link";
import { Plus, Pencil, Trash2, Eye } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";

export default function B2cPagesListPage() {
  const { data: pages, isLoading } = trpc.b2cSite.page.list.useQuery();
  const utils = trpc.useUtils();

  const deleteMutation = trpc.b2cSite.page.delete.useMutation({
    onSuccess: () => { toast.success("Page deleted"); utils.b2cSite.page.list.invalidate(); },
    onError: (err) => toast.error(err.message),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Pages</h1>
          <p className="text-muted-foreground">Manage static pages (about, terms, privacy, etc.)</p>
        </div>
        <Link href="/b2c-site/pages/new">
          <Button><Plus className="mr-1.5 h-4 w-4" />New Page</Button>
        </Link>
      </div>

      {isLoading ? (
        <Card><CardContent className="py-10 text-center text-muted-foreground">Loading...</CardContent></Card>
      ) : !pages?.length ? (
        <Card><CardContent className="py-10 text-center text-muted-foreground">No pages yet.</CardContent></Card>
      ) : (
        <div className="grid gap-3">
          {pages.map((page) => (
            <Card key={page.id} className="flex items-center justify-between p-4">
              <div>
                <p className="font-medium">{page.title}</p>
                <p className="text-sm text-muted-foreground">/page/{page.slug}</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={page.status === "PUBLISHED" ? "default" : "secondary"}>
                  {page.status}
                </Badge>
                <Link href={`/page/${page.slug}`} target="_blank">
                  <Button variant="ghost" size="icon"><Eye className="h-4 w-4" /></Button>
                </Link>
                <Link href={`/b2c-site/pages/${page.id}`}>
                  <Button variant="ghost" size="icon"><Pencil className="h-4 w-4" /></Button>
                </Link>
                <Button variant="ghost" size="icon" onClick={() => { if (confirm("Delete this page?")) deleteMutation.mutate({ id: page.id }); }}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
