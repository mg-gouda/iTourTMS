"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import { PermissionGuard } from "@/components/shared/permission-guard";
import { useTranslations } from "next-intl";

const updateSchema = z.object({
  name: z.string().min(1, "Name is required"),
  code: z.string().min(1, "Code is required"),
  contactPerson: z.string().optional(),
  email: z.string().email("Invalid email").or(z.literal("")).optional(),
  phone: z.string().optional(),
  countryId: z.string().optional(),
  marketId: z.string().optional(),
  creditLimit: z.number().min(0).optional(),
  paymentTermDays: z.number().int().min(0).optional(),
  commissionPct: z.number().min(0).max(100).optional(),
  active: z.boolean().optional(),
});

type FormValues = z.infer<typeof updateSchema>;

export default function TravelAgentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const utils = trpc.useUtils();
  const t = useTranslations("b2bPortal");
  const tc = useTranslations("common");

  const { data: agent, isLoading } = trpc.b2bPortal.travelAgent.getById.useQuery({ id });

  const form = useForm<FormValues>({
    resolver: zodResolver(updateSchema),
    defaultValues: {},
  });

  useEffect(() => {
    if (agent) {
      form.reset({
        name: agent.name,
        code: agent.code,
        contactPerson: agent.contactPerson ?? "",
        email: agent.email ?? "",
        phone: agent.phone ?? "",
        countryId: agent.countryId ?? "",
        marketId: agent.marketId ?? "",
        creditLimit: Number(agent.creditLimit ?? 0),
        paymentTermDays: agent.paymentTermDays ?? 30,
        commissionPct: Number(agent.commissionPct ?? 0),
        active: agent.active,
      });
    }
  }, [agent, form]);

  const updateMutation = trpc.b2bPortal.travelAgent.update.useMutation({
    onSuccess: () => {
      utils.b2bPortal.travelAgent.getById.invalidate({ id });
      utils.b2bPortal.travelAgent.list.invalidate();
    },
  });

  const deleteMutation = trpc.b2bPortal.travelAgent.delete.useMutation({
    onSuccess: () => {
      utils.b2bPortal.travelAgent.list.invalidate();
      router.push("/b2b-portal/travel-agents");
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!agent) return <p>{tc("noData")}</p>;

  const contracts = agent.contractAssignments ?? [];
  const hotels = agent.hotelAssignments ?? [];
  const tariffs = agent.tariffs ?? [];

  return (

    <PermissionGuard permission="b2b-portal:travelAgent:read">
      <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.push("/b2b-portal/travel-agents")}>
            <ArrowLeft className="size-4" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight">{agent.name}</h1>
              <Badge variant={agent.active ? "default" : "secondary"}>
                {agent.active ? tc("active") : tc("inactive")}
              </Badge>
            </div>
            <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
              <span className="font-mono">{agent.code}</span>
              {agent.country && <span>{agent.country.name}</span>}
              {agent.market && <span>{agent.market.name}</span>}
            </div>
          </div>
        </div>
        <Button
          variant="destructive"
          size="sm"
          onClick={() => {
            if (confirm(t("confirmDeleteTravelAgent"))) {
              deleteMutation.mutate({ id });
            }
          }}
        >
          {tc("delete")}
        </Button>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="details">
        <TabsList>
          <TabsTrigger value="details">{tc("details")}</TabsTrigger>
          <TabsTrigger value="contracts">{t("contracts")} ({contracts.length})</TabsTrigger>
          <TabsTrigger value="hotels">{t("hotels")} ({hotels.length})</TabsTrigger>
          <TabsTrigger value="tariffs">{t("rateSheets")} ({tariffs.length})</TabsTrigger>
        </TabsList>

        {/* Details Tab */}
        <TabsContent value="details" className="mt-4">
          <Card>
            <CardContent className="pt-6">
              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit((v) => updateMutation.mutate({ id, data: v }))}
                  className="space-y-4"
                >
                  <div className="grid grid-cols-2 gap-4">
                    <FormField control={form.control} name="name" render={({ field }) => (
                      <FormItem><FormLabel>{tc("name")}</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="code" render={({ field }) => (
                      <FormItem><FormLabel>{tc("code")}</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                  </div>
                  <FormField control={form.control} name="contactPerson" render={({ field }) => (
                    <FormItem><FormLabel>{t("contactPerson")}</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                  )} />
                  <div className="grid grid-cols-2 gap-4">
                    <FormField control={form.control} name="email" render={({ field }) => (
                      <FormItem><FormLabel>{tc("email")}</FormLabel><FormControl><Input type="email" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="phone" render={({ field }) => (
                      <FormItem><FormLabel>{tc("phone")}</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                    )} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <FormField control={form.control} name="countryId" render={({ field }) => (
                      <FormItem><FormLabel>{t("countryId")}</FormLabel><FormControl><Input placeholder={t("countryId")} {...field} /></FormControl></FormItem>
                    )} />
                    <FormField control={form.control} name="marketId" render={({ field }) => (
                      <FormItem><FormLabel>{t("marketId")}</FormLabel><FormControl><Input placeholder={t("marketId")} {...field} /></FormControl></FormItem>
                    )} />
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <FormField control={form.control} name="creditLimit" render={({ field }) => (
                      <FormItem><FormLabel>{t("creditLimit")}</FormLabel><FormControl><Input type="number" value={String(field.value ?? 0)} onChange={(e) => field.onChange(Number(e.target.value))} /></FormControl></FormItem>
                    )} />
                    <FormField control={form.control} name="paymentTermDays" render={({ field }) => (
                      <FormItem><FormLabel>{t("paymentTerms")}</FormLabel><FormControl><Input type="number" value={String(field.value ?? 30)} onChange={(e) => field.onChange(Number(e.target.value))} /></FormControl></FormItem>
                    )} />
                    <FormField control={form.control} name="commissionPct" render={({ field }) => (
                      <FormItem><FormLabel>{t("commissionPct")}</FormLabel><FormControl><Input type="number" step="0.1" value={String(field.value ?? 0)} onChange={(e) => field.onChange(Number(e.target.value))} /></FormControl></FormItem>
                    )} />
                  </div>
                  <FormField control={form.control} name="active" render={({ field }) => (
                    <FormItem className="flex items-center gap-2 space-y-0">
                      <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                      <FormLabel>{tc("active")}</FormLabel>
                    </FormItem>
                  )} />

                  {updateMutation.error && (
                    <p className="text-sm text-destructive">{updateMutation.error.message}</p>
                  )}
                  <Button type="submit" disabled={updateMutation.isPending}>
                    {updateMutation.isPending ? tc("saving") : tc("saveChanges")}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Contracts Tab */}
        <TabsContent value="contracts" className="mt-4">
          {contracts.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-sm text-muted-foreground">
                {t("noContractsAssigned")}
              </CardContent>
            </Card>
          ) : (
            <div className="overflow-hidden rounded border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-3 py-1.5 text-left text-xs font-medium">{t("contractCode")}</th>
                    <th className="px-3 py-1.5 text-left text-xs font-medium">{t("hotelName")}</th>
                  </tr>
                </thead>
                <tbody>
                  {contracts.map((ca) => (
                    <tr key={ca.id} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="px-3 py-1.5">
                        <Link
                          href={`/contracting/contracts/${ca.contract.id}`}
                          className="font-mono text-xs text-primary hover:underline"
                        >
                          {ca.contract.code ?? ca.contract.id}
                        </Link>
                      </td>
                      <td className="px-3 py-1.5">{(ca.contract as { hotel?: { name: string } }).hotel?.name ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>

        {/* Hotels Tab */}
        <TabsContent value="hotels" className="mt-4">
          {hotels.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-sm text-muted-foreground">
                {t("noHotelsAssigned")}
              </CardContent>
            </Card>
          ) : (
            <div className="overflow-hidden rounded border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-3 py-1.5 text-left text-xs font-medium">{t("hotelName")}</th>
                  </tr>
                </thead>
                <tbody>
                  {hotels.map((ha) => (
                    <tr key={ha.id} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="px-3 py-1.5">{ha.hotel?.name ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>

        {/* Rate Sheets Tab */}
        <TabsContent value="tariffs" className="mt-4">
          {tariffs.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-sm text-muted-foreground">
                {t("noRateSheetsFor")}
              </CardContent>
            </Card>
          ) : (
            <div className="overflow-hidden rounded border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-3 py-1.5 text-left text-xs font-medium">{tc("name")}</th>
                    <th className="px-3 py-1.5 text-left text-xs font-medium">Contract</th>
                    <th className="px-3 py-1.5 text-left text-xs font-medium">{t("generated")}</th>
                  </tr>
                </thead>
                <tbody>
                  {tariffs.map((tariff) => (
                    <tr key={tariff.id} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="px-3 py-1.5 font-medium text-sm">
                        {tariff.name}
                      </td>
                      <td className="px-3 py-1.5">
                        {tariff.contract ? (
                          <span className="font-mono text-xs">{tariff.contract.code} — {tariff.contract.name}</span>
                        ) : "—"}
                      </td>
                      <td className="px-3 py-1.5 text-muted-foreground">
                        {new Date(tariff.generatedAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>


    </PermissionGuard>

  );
}
