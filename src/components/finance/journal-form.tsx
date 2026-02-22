"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import type { z } from "zod";

import { Button } from "@/components/ui/button";
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
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { JOURNAL_TYPE_LABELS } from "@/lib/constants/finance";
import { trpc } from "@/lib/trpc";
import { journalSchema } from "@/lib/validations/finance";

type JournalFormValues = z.input<typeof journalSchema>;

interface JournalFormProps {
  defaultValues?: Partial<JournalFormValues> & { id?: string };
}

export function JournalForm({ defaultValues }: JournalFormProps) {
  const router = useRouter();
  const utils = trpc.useUtils();
  const isEdit = !!defaultValues?.id;

  const form = useForm<JournalFormValues>({
    resolver: zodResolver(journalSchema),
    defaultValues: {
      name: "",
      code: "",
      type: "GENERAL",
      defaultAccountId: null,
      suspenseAccountId: null,
      profitAccountId: null,
      lossAccountId: null,
      currencyId: null,
      sequencePrefix: null,
      ...defaultValues,
    },
  });

  const { data: accounts } = trpc.finance.account.list.useQuery({});

  const createMutation = trpc.finance.journal.create.useMutation({
    onSuccess: () => {
      utils.finance.journal.list.invalidate();
      router.push("/finance/configuration/journals");
    },
  });

  const updateMutation = trpc.finance.journal.update.useMutation({
    onSuccess: () => {
      utils.finance.journal.list.invalidate();
      router.push("/finance/configuration/journals");
    },
  });

  function onSubmit(values: JournalFormValues) {
    if (isEdit && defaultValues?.id) {
      updateMutation.mutate({ id: defaultValues.id, ...values });
    } else {
      createMutation.mutate(values);
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending;
  const accountItems = accounts?.items ?? [];

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
                  <Input placeholder="SAJ" {...field} />
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
                  <Input placeholder="Sales Journal" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="type"
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
                    {Object.entries(JOURNAL_TYPE_LABELS).map(([key, label]) => (
                      <SelectItem key={key} value={key}>
                        {label}
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
            name="sequencePrefix"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Sequence Prefix</FormLabel>
                <FormControl>
                  <Input
                    placeholder="INV"
                    value={field.value ?? ""}
                    onChange={(e) =>
                      field.onChange(e.target.value || null)
                    }
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="defaultAccountId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Default Account</FormLabel>
                <Select
                  onValueChange={(v) =>
                    field.onChange(v === "__none" ? null : v)
                  }
                  defaultValue={field.value ?? "__none"}
                >
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="None" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="__none">None</SelectItem>
                    {accountItems.map((a) => (
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
            name="suspenseAccountId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Suspense Account</FormLabel>
                <Select
                  onValueChange={(v) =>
                    field.onChange(v === "__none" ? null : v)
                  }
                  defaultValue={field.value ?? "__none"}
                >
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="None" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="__none">None</SelectItem>
                    {accountItems.map((a) => (
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
        </div>

        <div className="flex gap-2">
          <Button type="submit" disabled={isPending}>
            {isPending ? "Saving..." : isEdit ? "Update" : "Create"}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push("/finance/configuration/journals")}
          >
            Cancel
          </Button>
        </div>
      </form>
    </Form>
  );
}
