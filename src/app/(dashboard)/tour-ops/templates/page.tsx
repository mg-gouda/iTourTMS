"use client";

import { useState } from "react";
import { Copy, FolderOpen, Plus } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { OPS_COMPONENT_TYPE_LABELS } from "@/lib/constants/tour-ops";
import { trpc } from "@/lib/trpc";

export default function TemplatesPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const { data: templates, isLoading } = trpc.tourOps.package.listTemplates.useQuery({ search: search || undefined });

  const cloneTemplate = trpc.tourOps.package.cloneFromTemplate.useMutation({
    onSuccess: (pkg) => {
      toast.success("Template cloned as new package");
      router.push(`/tour-ops/templates/${pkg.id}`);
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <div className="space-y-4 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Package Templates</h1>
          <p className="text-sm text-muted-foreground">Reusable tour package blueprints</p>
        </div>
        <Button asChild>
          <Link href="/tour-ops/templates/new">
            <Plus className="mr-2 h-4 w-4" /> New Template
          </Link>
        </Button>
      </div>

      <Input
        placeholder="Search templates..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-64"
      />

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-40 w-full" />)}
        </div>
      ) : !templates?.length ? (
        <div className="flex flex-col items-center gap-3 py-16 text-muted-foreground">
          <FolderOpen className="h-10 w-10" />
          <p>No templates yet</p>
          <Button asChild size="sm"><Link href="/tour-ops/templates/new">Create template</Link></Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {templates.map((tmpl) => (
            <Card key={tmpl.id} className="flex flex-col">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{tmpl.name}</CardTitle>
                {tmpl.description && <p className="text-xs text-muted-foreground line-clamp-2">{tmpl.description}</p>}
              </CardHeader>
              <CardContent className="flex-1">
                <div className="flex flex-wrap gap-1">
                  {tmpl.components.slice(0, 5).map((c) => (
                    <Badge key={c.id} variant="secondary" className="text-[10px]">
                      {OPS_COMPONENT_TYPE_LABELS[c.type as keyof typeof OPS_COMPONENT_TYPE_LABELS]}
                    </Badge>
                  ))}
                  {tmpl.components.length > 5 && (
                    <Badge variant="secondary" className="text-[10px]">+{tmpl.components.length - 5} more</Badge>
                  )}
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  {tmpl._count.components} components · {tmpl.baseCurrency} {Number(tmpl.totalCost).toLocaleString()} cost
                </p>
              </CardContent>
              <CardFooter className="gap-2 pt-2">
                <Button variant="outline" size="sm" className="flex-1" asChild>
                  <Link href={`/tour-ops/templates/${tmpl.id}`}>Edit</Link>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => cloneTemplate.mutate({ templateId: tmpl.id, fileId: "", name: `${tmpl.name} (copy)` })}
                  disabled={cloneTemplate.isPending}
                >
                  <Copy className="h-3.5 w-3.5" />
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
