"use client";

import { useRouter } from "next/navigation";
import { PartnerForm } from "@/components/finance/partner-form";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

export default function NewVendorPage() {
  const router = useRouter();
  const utils = trpc.useUtils();

  const create = trpc.finance.partner.create.useMutation({
    onSuccess: (vendor) => {
      toast.success("Vendor created");
      utils.finance.partner.list.invalidate();
      router.push(`/finance/vendors/${vendor.id}`);
    },
    onError: (err) => toast.error(err.message),
  });

  return (
    <div className="p-6 max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">New Vendor</h1>
        <p className="text-sm text-muted-foreground">Add a new vendor to your contacts</p>
      </div>
      <PartnerForm
        type="supplier"
        onSave={(values) => create.mutate({ ...values, type: "supplier" })}
        isSaving={create.isPending}
      />
    </div>
  );
}
