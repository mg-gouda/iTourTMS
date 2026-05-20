"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
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
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { destinationCreateSchema } from "@/lib/validations/contracting";
import { PermissionGuard } from "@/components/shared/permission-guard";

type FormValues = z.input<typeof destinationCreateSchema>;

export default function NewDestinationPage() {
  const t = useTranslations("contracting");
  const tc = useTranslations("common");
  const router = useRouter();
  const utils = trpc.useUtils();
  const { data: countries } = trpc.setup.getCountries.useQuery();

  const form = useForm<FormValues>({
    resolver: zodResolver(destinationCreateSchema),
    defaultValues: {
      name: "",
      code: "",
      countryId: "",
      active: true,
    },
  });

  const createMutation = trpc.contracting.destination.create.useMutation({
    onSuccess: (data) => {
      utils.contracting.destination.list.invalidate();
      router.push(`/contracting/destinations/${data.id}`);
    },
  });

  function onSubmit(values: FormValues) {
    createMutation.mutate(values);
  }

  return (
    <PermissionGuard permission="contracting:destination:read">
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t("newDestination")}</h1>
        <p className="text-muted-foreground">
          {t("manageDestinations")}
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
                  <Input placeholder="Dubai" {...field} />
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
                  <Input placeholder="DXB" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="countryId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Country</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  value={field.value ?? ""}
                >
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select country" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {(countries ?? []).map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
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
              {createMutation.isPending ? tc("creating") : t("newDestination")}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push("/contracting/destinations")}
            >
              {tc("cancel")}
            </Button>
          </div>
        </form>
      </Form>
    </div>
    </PermissionGuard>
  );
}
