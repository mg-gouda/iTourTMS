"use client";

import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Card, CardContent } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { MarkupForm } from "../_components/markup-form";
import { PermissionGuard } from "@/components/shared/permission-guard";

export default function EditMarkupRulePage() {
  const { id } = useParams<{ id: string }>();
  const { data, isLoading } = trpc.b2cSite.b2cMarkup.getById.useQuery({ id });
  const t = useTranslations("b2cSite");
  const tc = useTranslations("common");

  if (isLoading || !data) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold tracking-tight">{t("editMarkupRule")}</h1>
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            {tc("loading")}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (

    <PermissionGuard permission="b2c-site:markup:read">
      <MarkupForm
      ruleId={id}
      initialData={{
        name: data.name,
        markupType: data.markupType,
        value: String(Number(data.value)),
        destinationId: data.destinationId ?? "",
        hotelId: data.hotelId ?? "",
        priority: String(data.priority),
        active: data.active,
        tiers: data.tiers.map((t) => ({
          key: t.id,
          dateFrom: new Date(t.dateFrom).toISOString().split("T")[0],
          dateTo: new Date(t.dateTo).toISOString().split("T")[0],
          markupType: t.markupType,
          value: String(Number(t.value)),
        })),
      }}
    />
  

    </PermissionGuard>

  );
}
