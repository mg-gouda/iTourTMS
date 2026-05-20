"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { PartnerForm } from "@/components/finance/partner-form";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { PermissionGuard } from "@/components/shared/permission-guard";

export default function NewVendorPage() {
  const t = useTranslations("finance");
  const router = useRouter();
  const utils = trpc.useUtils();

  const create = trpc.finance.partner.create.useMutation({
    onSuccess: (vendor) => {
      toast.success(t("vendorCreated"));
      utils.finance.partner.list.invalidate();
      router.push(`/finance/vendors/${vendor.id}`);
    },
    onError: (err) => toast.error(err.message),
  });

  return (
    <PermissionGuard permission="finance:partner:read">
    <div className="p-6 max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">{t("newVendor")}</h1>
        <p className="text-sm text-muted-foreground">{t("editVendor")}</p>
      </div>
      <PartnerForm
        type="supplier"
        onSave={(values) => create.mutate({ ...values, type: "supplier" })}
        isSaving={create.isPending}
      />
    </div>
    </PermissionGuard>
  );
}
