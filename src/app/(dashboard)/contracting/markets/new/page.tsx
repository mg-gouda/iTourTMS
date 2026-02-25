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
import { trpc } from "@/lib/trpc";
import { marketCreateSchema } from "@/lib/validations/contracting";

type FormValues = z.input<typeof marketCreateSchema>;

export default function NewMarketPage() {
  const router = useRouter();
  const utils = trpc.useUtils();
  const { data: countries } = trpc.setup.getCountries.useQuery();

  const form = useForm<FormValues>({
    resolver: zodResolver(marketCreateSchema),
    defaultValues: {
      name: "",
      code: "",
      countryIds: [],
      active: true,
    },
  });

  const createMutation = trpc.contracting.market.create.useMutation({
    onSuccess: (data) => {
      utils.contracting.market.list.invalidate();
      router.push(`/contracting/markets/${data.id}`);
    },
  });

  function onSubmit(values: FormValues) {
    createMutation.mutate(values);
  }

  // Toggle a country in the countryIds array
  const countryIds = form.watch("countryIds") ?? [];
  function toggleCountry(id: string) {
    const current = form.getValues("countryIds") ?? [];
    if (current.includes(id)) {
      form.setValue("countryIds", current.filter((c) => c !== id));
    } else {
      form.setValue("countryIds", [...current, id]);
    }
  }

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">New Market</h1>
        <p className="text-muted-foreground">
          Define a geographic market segment for contract availability
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Name</FormLabel>
                <FormControl>
                  <Input placeholder="Europe" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="code"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Code</FormLabel>
                <FormControl>
                  <Input placeholder="EUR" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="space-y-2">
            <FormLabel>Countries</FormLabel>
            <div className="max-h-48 overflow-y-auto rounded-md border p-3 space-y-1">
              {(countries ?? []).map((c) => (
                <label
                  key={c.id}
                  className="flex items-center gap-2 text-sm cursor-pointer hover:bg-muted/50 rounded px-1 py-0.5"
                >
                  <Checkbox
                    checked={countryIds.includes(c.id)}
                    onCheckedChange={() => toggleCountry(c.id)}
                  />
                  {c.name} ({c.code})
                </label>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              {countryIds.length} selected
            </p>
          </div>

          <FormField
            control={form.control}
            name="active"
            render={({ field }) => (
              <FormItem className="flex items-center gap-2 space-y-0">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
                <FormLabel>Active</FormLabel>
              </FormItem>
            )}
          />

          {createMutation.error && (
            <p className="text-sm text-destructive">
              {createMutation.error.message}
            </p>
          )}

          <div className="flex gap-2">
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? "Creating..." : "Create Market"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push("/contracting/markets")}
            >
              Cancel
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
