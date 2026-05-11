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
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {Object.entries(ACCOUNT_TYPE_CATEGORIES).map(
                      ([category, types]) => (
                        <SelectGroup key={category}>
                          <SelectLabel>{category}</SelectLabel>
                          {types.map((type) => (
                            <SelectItem key={type} value={type}>
                              {ACCOUNT_TYPE_LABELS[type]}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      ),
                    )}
                  </SelectContent>
                </Select>
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
                <Select
                  onValueChange={(v) => field.onChange(v === "__none" ? null : v)}
                  value={field.value ?? "__none"}
                >
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="No parent (root)" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="__none">No parent (root)</SelectItem>
                    {parentCandidates.map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.code} — {a.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
                <Select
                  onValueChange={(v) => field.onChange(v === "__none" ? null : v)}
                  defaultValue={field.value ?? "__none"}
                >
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="No group" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="__none">No group</SelectItem>
                    {groups?.map((g) => (
                      <SelectItem key={g.id} value={g.id}>
                        {g.codePrefixStart}-{g.codePrefixEnd} {g.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
