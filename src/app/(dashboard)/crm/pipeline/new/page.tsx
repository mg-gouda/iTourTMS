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
import { CRM_OPPORTUNITY_STAGE_LABELS } from "@/lib/constants/crm";
import { trpc } from "@/lib/trpc";
import { opportunityCreateSchema } from "@/lib/validations/crm";
import { PermissionGuard } from "@/components/shared/permission-guard";
import { useTranslations } from "next-intl";

type FormValues = z.input<typeof opportunityCreateSchema>;

export default function NewOpportunityPage() {
  const t = useTranslations("crm");
  const tc = useTranslations("common");
  const router = useRouter();
  const utils = trpc.useUtils();
  const { data: users } = trpc.user.list.useQuery();
  const { data: leads } = trpc.crm.lead.list.useQuery();
  const { data: customers } = trpc.crm.customer.list.useQuery();

  const form = useForm<FormValues>({
    resolver: zodResolver(opportunityCreateSchema),
    defaultValues: {
      title: "",
      stage: "PROSPECTING",
      value: undefined,
      probability: 10,
      expectedCloseDate: "",
      ownerId: "",
      leadId: "",
      customerId: "",
      notes: "",
    },
  });

  const createMutation = trpc.crm.opportunity.create.useMutation({
    onSuccess: (data) => {
      utils.crm.opportunity.list.invalidate();
      router.push(`/crm/pipeline/${data.id}`);
    },
  });

  function onSubmit(values: FormValues) {
    createMutation.mutate(values);
  }

  return (

    <PermissionGuard permission="crm:opportunity:read">
      <div className="mx-auto max-w-lg space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t("newOpportunity")}</h1>
        <p className="text-muted-foreground">{t("pipeline")}</p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="title"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{tc("name")}</FormLabel>
                <FormControl><Input placeholder="Desert Safari Package — Acme Corp" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="stage"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("stage")}</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger className="w-full"><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      {Object.entries(CRM_OPPORTUNITY_STAGE_LABELS).map(([v, l]) => (
                        <SelectItem key={v} value={v}>{l}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="probability"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("probability")} (%)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      value={field.value ?? ""}
                      onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="value"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("expectedValue")} ($)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={0}
                      step="0.01"
                      value={field.value ?? ""}
                      onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="expectedCloseDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("expectedClose")}</FormLabel>
                  <FormControl><Input type="date" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="ownerId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("owner")}</FormLabel>
                <Select onValueChange={field.onChange} value={field.value ?? ""}>
                  <FormControl><SelectTrigger className="w-full"><SelectValue placeholder={tc("select")} /></SelectTrigger></FormControl>
                  <SelectContent>
                    {(users ?? []).map((u) => (
                      <SelectItem key={u.id} value={u.id}>{u.name ?? u.email}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="leadId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("linkedLead")}</FormLabel>
                <Select onValueChange={field.onChange} value={field.value ?? ""}>
                  <FormControl><SelectTrigger className="w-full"><SelectValue placeholder={tc("none")} /></SelectTrigger></FormControl>
                  <SelectContent>
                    {(leads ?? []).map((l) => (
                      <SelectItem key={l.id} value={l.id}>{l.code} — {l.firstName} {l.lastName}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="customerId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("linkedCustomer")}</FormLabel>
                <Select onValueChange={field.onChange} value={field.value ?? ""}>
                  <FormControl><SelectTrigger className="w-full"><SelectValue placeholder={tc("none")} /></SelectTrigger></FormControl>
                  <SelectContent>
                    {(customers ?? []).map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.firstName} {c.lastName}</SelectItem>
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
                <FormControl><Textarea {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {createMutation.error && (
            <p className="text-sm text-destructive">{createMutation.error.message}</p>
          )}

          <div className="flex gap-2">
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? tc("creating") : t("newOpportunity")}
            </Button>
            <Button type="button" variant="outline" onClick={() => router.push("/crm/pipeline")}>
              {tc("cancel")}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  

    </PermissionGuard>

  );
}
