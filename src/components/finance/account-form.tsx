"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import type { z } from "zod";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Combobox } from "@/components/ui/combobox";
import {
  ACCOUNT_TYPE_CATEGORIES,
  ACCOUNT_TYPE_LABELS,
} from "@/lib/constants/finance";
import { trpc } from "@/lib/trpc";
import { accountSchema } from "@/lib/validations/finance";

type AccountFormValues = z.input<typeof accountSchema>;

interface AccountFormProps {
  defaultValues?: Partial<AccountFormValues> & { id?: string };
  onSuccess?: () => void;
}

export function AccountForm({ defaultValues, onSuccess }: AccountFormProps) {
  const router = useRouter();
  const utils = trpc.useUtils();
  const isEdit = !!defaultValues?.id;

  const form = useForm<AccountFormValues>({
    resolver: zodResolver(accountSchema),
    defaultValues: {
      code: "",
      name: "",
      accountType: "ASSET_CURRENT",
      isGroup: false,
      parentId: null,
      reconcile: false,
      deprecated: false,
      groupId: null,
      currencyId: null,
      tagIds: [],
      ...defaultValues,
    },
  });

  const { data: groups } = trpc.finance.account.listGroups.useQuery();
  const { data: allAccounts } = trpc.finance.account.listTree.useQuery();

  // For parent selector: only show group accounts (or all if no groups exist yet)
  const parentCandidates = (allAccounts ?? []).filter(
    (a) => a.isGroup && a.id !== defaultValues?.id,
  );

  const handleSuccess = () => {
    utils.finance.account.listTree.invalidate();
    utils.finance.account.list.invalidate();
    if (onSuccess) {
      onSuccess();
    } else {
      router.push("/finance/configuration/chart-of-accounts");
    }
  };

  const createMutation = trpc.finance.account.create.useMutation({
    onSuccess: handleSuccess,
  });

  const updateMutation = trpc.finance.account.update.useMutation({
    onSuccess: handleSuccess,
  });

  function onSubmit(values: AccountFormValues) {
    if (isEdit && defaultValues?.id) {
      updateMutation.mutate({ id: defaultValues.id, ...values });
    } else {
      createMutation.mutate(values);
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <FormField
            control={form.control}
            name="code"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Code</FormLabel>
                <FormControl>
                  <Input placeholder="1100" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Name</FormLabel>
                <FormControl>
                  <Input placeholder="Accounts Receivable" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="accountType"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Type</FormLabel>
                <FormControl>
                  <Combobox
                    options={Object.entries(ACCOUNT_TYPE_CATEGORIES).flatMap(([category, types]) =>
                      types.map((type) => ({ value: type, label: ACCOUNT_TYPE_LABELS[type] as string, group: category }))
                    )}
                    value={field.value}
                    onValueChange={field.onChange}
                    placeholder="Select type"
                    searchPlaceholder="Search account types..."
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="parentId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Parent Account</FormLabel>
                <FormControl>
                  <Combobox
                    options={[
                      { value: "__none", label: "No parent (root)" },
                      ...parentCandidates.map((a) => ({ value: a.id, label: `${a.code} — ${a.name}` })),
                    ]}
                    value={field.value ?? "__none"}
                    onValueChange={(v) => field.onChange(v === "__none" ? null : v)}
                    placeholder="No parent (root)"
                    searchPlaceholder="Search accounts..."
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="groupId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Account Group</FormLabel>
                <FormControl>
                  <Combobox
                    options={[
                      { value: "__none", label: "No group" },
                      ...(groups ?? []).map((g) => ({ value: g.id, label: `${g.codePrefixStart}-${g.codePrefixEnd} ${g.name}` })),
                    ]}
                    value={field.value ?? "__none"}
                    onValueChange={(v) => field.onChange(v === "__none" ? null : v)}
                    placeholder="No group"
                    searchPlaceholder="Search groups..."
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="flex flex-wrap items-center gap-6">
          <FormField
            control={form.control}
            name="isGroup"
            render={({ field }) => (
              <FormItem className="flex items-center gap-2">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
                <FormLabel className="!mt-0">Is a Group Account</FormLabel>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="reconcile"
            render={({ field }) => (
              <FormItem className="flex items-center gap-2">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
                <FormLabel className="!mt-0">Allow Reconciliation</FormLabel>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="deprecated"
            render={({ field }) => (
              <FormItem className="flex items-center gap-2">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
                <FormLabel className="!mt-0">Deprecated</FormLabel>
              </FormItem>
            )}
          />
        </div>

        <div className="flex gap-2">
          <Button type="submit" disabled={isPending}>
            {isPending ? "Saving..." : isEdit ? "Update" : "Create"}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              if (onSuccess) {
                onSuccess();
              } else {
                router.push("/finance/configuration/chart-of-accounts");
              }
            }}
          >
            Cancel
          </Button>
        </div>
      </form>
    </Form>
  );
}
