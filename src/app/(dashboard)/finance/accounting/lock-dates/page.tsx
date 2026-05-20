"use client";

import { Lock, Save } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { PermissionGuard } from "@/components/shared/permission-guard";
import { useTranslations } from "next-intl";

export default function LockDatesPage() {
  const t = useTranslations("finance");
  const tc = useTranslations("common");
  const utils = trpc.useUtils();
  const { data, isLoading } = trpc.finance.lockDate.get.useQuery();
  const upsertMut = trpc.finance.lockDate.upsert.useMutation({
    onSuccess: () => { utils.finance.lockDate.get.invalidate(); toast.success(tc("saved")); },
  });

  const [form, setForm] = useState({
    taxLockDate: "",
    saleLockDate: "",
    purchaseLockDate: "",
    hardLockDate: "",
  });

  useEffect(() => {
    if (data) {
      setForm({
        taxLockDate: data.taxLockDate ? new Date(data.taxLockDate).toISOString().split("T")[0] : "",
        saleLockDate: data.saleLockDate ? new Date(data.saleLockDate).toISOString().split("T")[0] : "",
        purchaseLockDate: data.purchaseLockDate ? new Date(data.purchaseLockDate).toISOString().split("T")[0] : "",
        hardLockDate: data.hardLockDate ? new Date(data.hardLockDate).toISOString().split("T")[0] : "",
      });
    }
  }, [data]);

  if (isLoading) return <div className="text-muted-foreground py-10 text-center">{tc("loading")}</div>;

  const handleSave = () => {
    upsertMut.mutate({
      taxLockDate: form.taxLockDate || null,
      saleLockDate: form.saleLockDate || null,
      purchaseLockDate: form.purchaseLockDate || null,
      hardLockDate: form.hardLockDate || null,
    });
  };

  return (
    <PermissionGuard permission="finance:lockDate:manage">
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("lockDates")}</h1>
          <p className="text-muted-foreground">{t("lockDatesDesc")}</p>
        </div>
        <Button onClick={handleSave} disabled={upsertMut.isPending}>
          <Save className="mr-2 size-4" />{tc("save")}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Lock className="size-4" />{t("periodLockDates")}</CardTitle>
          <CardDescription>{t("periodLockDatesDesc")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-1.5">
            <Label>{t("taxLockDate")}</Label>
            <Input type="date" value={form.taxLockDate} onChange={(e) => setForm({ ...form, taxLockDate: e.target.value })} />
            <p className="text-xs text-muted-foreground">{t("taxLockDateDesc")}</p>
          </div>
          <Separator />
          <div className="grid gap-1.5">
            <Label>{t("salesLockDate")}</Label>
            <Input type="date" value={form.saleLockDate} onChange={(e) => setForm({ ...form, saleLockDate: e.target.value })} />
            <p className="text-xs text-muted-foreground">{t("salesLockDateDesc")}</p>
          </div>
          <Separator />
          <div className="grid gap-1.5">
            <Label>{t("purchaseLockDate")}</Label>
            <Input type="date" value={form.purchaseLockDate} onChange={(e) => setForm({ ...form, purchaseLockDate: e.target.value })} />
            <p className="text-xs text-muted-foreground">{t("purchaseLockDateDesc")}</p>
          </div>
          <Separator />
          <div className="grid gap-1.5">
            <Label className="text-destructive">{t("hardLockDate")}</Label>
            <Input type="date" value={form.hardLockDate} onChange={(e) => setForm({ ...form, hardLockDate: e.target.value })} />
            <p className="text-xs text-muted-foreground">
              <strong className="text-destructive">{t("hardLockDateWarning")}:</strong> {t("hardLockDateDesc")}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
    </PermissionGuard>
  );
}
