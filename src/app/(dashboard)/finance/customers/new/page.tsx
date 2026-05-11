"use client";

import { useRouter } from "next/navigation";
import { PartnerForm } from "@/components/finance/partner-form";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

export default function NewCustomerPage() {
  const router = useRouter();
  const utils = trpc.useUtils();

  const create = trpc.finance.partner.create.useMutation({
    onSuccess: (partner) => {
      toast.success("Customer created");
      utils.finance.partner.list.invalidate();
      router.push(`/finance/customers/${partner.id}`);
    },
    onError: (err) => toast.error(err.message),
  });

  return (
    <div className="p-6 max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">New Customer</h1>
        <p className="text-sm text-muted-foreground">Add a new customer to your contacts</p>
      </div>
      <PartnerForm
        type="customer"
        onSave={(values) => create.mutate({ ...values, type: "customer" })}
        isSaving={create.isPending}
      />
    </div>
  );
}
