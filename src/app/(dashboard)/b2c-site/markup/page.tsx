"use client";

import Link from "next/link";
import { Plus, Pencil, Trash2, Tag } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";

const MARKUP_TYPE_LABEL: Record<string, string> = {
  PERCENTAGE: "%",
  FIXED_PER_NIGHT: "/night",
  FIXED_PER_BOOKING: "/booking",
};

function scopeLabel(rule: { destination?: { name: string } | null; hotel?: { name: string; code: string } | null }) {
  if (rule.hotel) return `Hotel: ${rule.hotel.name}`;
  if (rule.destination) return `Destination: ${rule.destination.name}`;
  return "Global (all hotels)";
}

export default function B2cMarkupListPage() {
  const { data: rules, isLoading } = trpc.b2cSite.b2cMarkup.list.useQuery();
  const utils = trpc.useUtils();

  const deleteMutation = trpc.b2cSite.b2cMarkup.delete.useMutation({
    onSuccess: () => {
      toast.success("Markup rule deleted");
      utils.b2cSite.b2cMarkup.list.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">B2C Markup Rules</h1>
          <p className="text-muted-foreground">
            Manage markup applied to B2C customer-facing prices
          </p>
        </div>
        <Button asChild>
          <Link href="/b2c-site/markup/new">
            <Plus className="mr-1.5 h-4 w-4" />
            Add Rule
          </Link>
        </Button>
      </div>

      {isLoading ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            Loading...
          </CardContent>
        </Card>
      ) : !rules?.length ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            No markup rules yet. Create one to add markup to B2C prices.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {rules.map((rule) => (
            <Card key={rule.id} className="flex items-center gap-4 p-4">
              <Tag className="h-5 w-5 shrink-0 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-medium">{rule.name}</p>
                  <Badge variant="outline" className="text-xs">
                    {Number(rule.value)}
                    {MARKUP_TYPE_LABEL[rule.markupType] ?? ""}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {scopeLabel(rule)}
                  {rule.tiers.length > 0 && ` · ${rule.tiers.length} period tier(s)`}
                </p>
              </div>
              <Badge variant={rule.active ? "default" : "secondary"}>
                {rule.active ? "Active" : "Inactive"}
              </Badge>
              <span className="text-xs text-muted-foreground">
                Priority: {rule.priority}
              </span>
              <Button variant="ghost" size="icon" asChild>
                <Link href={`/b2c-site/markup/${rule.id}`}>
                  <Pencil className="h-4 w-4" />
                </Link>
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  if (confirm("Delete this markup rule?"))
                    deleteMutation.mutate({ id: rule.id });
                }}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
