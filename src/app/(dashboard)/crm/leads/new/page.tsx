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
import { Textarea } from "@/components/ui/textarea";
import { CRM_LEAD_SOURCE_LABELS } from "@/lib/constants/crm";
import { trpc } from "@/lib/trpc";
import { leadCreateSchema } from "@/lib/validations/crm";
import { PermissionGuard } from "@/components/shared/permission-guard";
import { useTranslations } from "next-intl";

type FormValues = z.input<typeof leadCreateSchema>;

const SOURCE_OPTIONS = Object.entries(CRM_LEAD_SOURCE_LABELS);

export default function NewLeadPage() {
  const t = useTranslations("crm");
  const tc = useTranslations("common");
  const router = useRouter();
  const utils = trpc.useUtils();
  const { data: users } = trpc.user.list.useQuery();

  const form = useForm<FormValues>({
    resolver: zodResolver(leadCreateSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      source: "WEBSITE",
      status: "NEW",
      assignedToId: "",
      notes: "",
    },
  });

  const createMutation = trpc.crm.lead.create.useMutation({
    onSuccess: (data) => {
      utils.crm.lead.list.invalidate();
      router.push(`/crm/leads/${data.id}`);
    },
  });

  function onSubmit(values: FormValues) {
    createMutation.mutate(values);
  }

  return (

    <PermissionGuard permission="crm:lead:read">
      <div className="mx-auto max-w-lg space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t("newLead")}</h1>
        <p className="text-muted-foreground">{t("manageSalesLeads")}</p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="firstName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("firstName")}</FormLabel>
                  <FormControl>
                    <Input placeholder="John" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="lastName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("lastName")}</FormLabel>
                  <FormControl>
                    <Input placeholder="Doe" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{tc("email")}</FormLabel>
                <FormControl>
                  <Input type="email" placeholder="john@example.com" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{tc("phone")}</FormLabel>
                <FormControl>
                  <Input placeholder="+1 234 567 890" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="source"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("source")}</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder={tc("select")} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {SOURCE_OPTIONS.map(([val, label]) => (
                      <SelectItem key={val} value={val}>
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
            name="assignedToId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("assignedTo")}</FormLabel>
                <Select onValueChange={field.onChange} value={field.value ?? ""}>
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder={tc("select")} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {(users ?? []).map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.name ?? u.email}
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
            name="notes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{tc("notes")}</FormLabel>
                <FormControl>
                  <Textarea placeholder="Additional notes..." {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {createMutation.error && (
            <p className="text-sm text-destructive">{createMutation.error.message}</p>
          )}

          <div className="flex gap-2">
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? tc("creating") : t("newLead")}
            </Button>
            <Button type="button" variant="outline" onClick={() => router.push("/crm/leads")}>
              {tc("cancel")}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  

    </PermissionGuard>

  );
}
