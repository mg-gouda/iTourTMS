"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { PartnerForm } from "@/components/finance/partner-form";
import { PermissionGuard } from "@/components/shared/permission-guard";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

export default function NewCustomerPage() {
  const t = useTranslations("finance");
  const router = useRouter();
  const utils = trpc.useUtils();

  const create = trpc.finance.partner.create.useMutation({
    onSuccess: (partner) => {
      toast.success(t("newCustomer"));
      utils.finance.partner.list.invalidate();
      router.push(`/finance/customers/${partner.id}`);
    },
    onError: (err) => toast.error(err.message),
  });

  return (
    <PermissionGuard permission="finance:partner:read">
    <div className="p-6 max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">{t("newCustomer")}</h1>
        <p className="text-sm text-muted-foreground">{t("editCustomer")}</p>
      </div>
      <PartnerForm
        type="customer"
        onSave={(values) => create.mutate({ ...values, type: "customer" })}
        isSaving={create.isPending}
      />
    </div>
    </PermissionGuard>
  );
}
