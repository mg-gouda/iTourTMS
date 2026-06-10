"use client";

import { use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Archive, ArrowLeft, Building2, ExternalLink, User,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { PartnerForm } from "@/components/finance/partner-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { MOVE_STATE_LABELS, PAYMENT_STATE_LABELS } from "@/lib/constants/finance";
import { PermissionGuard } from "@/components/shared/permission-guard";

export default function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const t = useTranslations("finance");
  const tc = useTranslations("common");
  const { id } = use(params);
  const router = useRouter();
  const utils = trpc.useUtils();

  const { data: partner, isLoading } = trpc.finance.partner.getById.useQuery({ id });
  const { data: stats } = trpc.finance.partner.getStats.useQuery({ id });
  const { data: invoicesData } = trpc.finance.move.list.useQuery({
    moveType: "OUT_INVOICE",
    partnerId: id,
  });
  const invoices = invoicesData?.items ?? [];
  const { data: paymentsData } = trpc.finance.payment.list.useQuery({
    partnerId: id,
  });
  const payments = paymentsData?.items ?? [];

  const update = trpc.finance.partner.update.useMutation({
    onSuccess: () => {
      toast.success(tc("saved"));
      utils.finance.partner.getById.invalidate({ id });
    },
    onError: (err) => toast.error(err.message),
  });

  const toggleActive = trpc.finance.partner.toggleActive.useMutation({
    onSuccess: () => {
      toast.success(partner?.isActive ? tc("archive") : tc("restore"));
      utils.finance.partner.getById.invalidate({ id });
      utils.finance.partner.list.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-64 bg-muted rounded" />
          <div className="h-4 w-40 bg-muted rounded" />
        </div>
      </div>
    );
  }

  if (!partner) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">{t("customer")} {tc("noResults")}.</p>
        <Button variant="link" asChild className="px-0 mt-2">
          <Link href="/finance/customers">← {tc("back")}</Link>
        </Button>
      </div>
    );
  }

  return (
    <PermissionGuard permission="finance:partner:read">
    <div className="p-6 space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/finance/customers">
              <ArrowLeft className="size-4" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-2">
              {partner.isCompany
                ? <Building2 className="size-5 text-muted-foreground" />
                : <User className="size-5 text-muted-foreground" />}
              <h1 className="text-2xl font-semibold">{partner.name}</h1>
              {!partner.isActive && (
                <Badge variant="secondary">{t("archived")}</Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">
              {partner.isCompany ? t("company") : t("individual")} · {t("customer")}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" asChild size="sm">
            <Link href={`/finance/customers/invoices?partnerId=${id}`}>
              <ExternalLink className="size-3.5 mr-1.5" />
              {t("invoices")}
            </Link>
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Archive className="size-3.5 mr-1.5" />
                {partner.isActive ? tc("archive") : tc("restore")}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  {partner.isActive ? tc("archive") : tc("restore")} {t("customer")}?
                </AlertDialogTitle>
                <AlertDialogDescription>
                  {tc("confirmDeleteDesc")}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{tc("cancel")}</AlertDialogCancel>
                <AlertDialogAction onClick={() => toggleActive.mutate({ id })}>
                  {partner.isActive ? tc("archive") : tc("restore")}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
          <Card className="col-span-1 py-0 gap-0">
            <div className="px-3 pt-2 pb-2">
              <p className="text-[11px] font-medium text-muted-foreground mb-0.5">{t("sales")}</p>
              <p className="text-sm font-bold leading-tight">{stats.salesCount}</p>
              <p className="text-[10px] text-muted-foreground font-mono">{stats.salesAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
            </div>
          </Card>
          <Card className="col-span-1 py-0 gap-0">
            <div className="px-3 pt-2 pb-2">
              <p className="text-[11px] font-medium text-muted-foreground mb-0.5">{t("invoiced")}</p>
              <p className="text-sm font-bold leading-tight font-mono">{stats.invoicedAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
            </div>
          </Card>
          <Card className="col-span-1 py-0 gap-0">
            <div className="px-3 pt-2 pb-2">
              <p className="text-[11px] font-medium text-muted-foreground mb-0.5">{t("vendorBillsStat")}</p>
              <p className="text-sm font-bold leading-tight font-mono">{stats.vendorBillsAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
            </div>
          </Card>
          <Card className="col-span-1 py-0 gap-0">
            <div className="px-3 pt-2 pb-2">
              <p className="text-[11px] font-medium text-muted-foreground mb-0.5">{t("due")}</p>
              <p className={`text-sm font-bold leading-tight font-mono ${stats.dueAmount > 0 ? "text-destructive" : ""}`}>{stats.dueAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
            </div>
          </Card>
          <Card className="col-span-1 py-0 gap-0">
            <div className="px-3 pt-2 pb-2">
              <p className="text-[11px] font-medium text-muted-foreground mb-0.5">{t("purchases")}</p>
              <p className="text-sm font-bold leading-tight">{stats.purchasesCount}</p>
              <p className="text-[10px] text-muted-foreground font-mono">{stats.purchasesAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
            </div>
          </Card>
          <Card className="col-span-1 py-0 gap-0">
            <div className="px-3 pt-2 pb-2">
              <p className="text-[11px] font-medium text-muted-foreground mb-0.5">{t("contracts")}</p>
              <p className="text-sm font-bold leading-tight">{stats.contractsCount}</p>
            </div>
          </Card>
        </div>
      )}

      {/* Tabs */}
      <Tabs defaultValue="details">
        <TabsList>
          <TabsTrigger value="details">{tc("details")}</TabsTrigger>
          <TabsTrigger value="invoices">{t("invoices")} ({invoices.length})</TabsTrigger>
          <TabsTrigger value="payments">{t("payments")} ({payments.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="mt-4">
          <PartnerForm
            type="customer"
            defaultValues={{
              isCompany: partner.isCompany,
              name: partner.name,
              titleId: partner.titleId ?? "",
              email: partner.email ?? "",
              phone: partner.phone ?? "",
              mobile: partner.mobile ?? "",
              website: partner.website ?? "",
              taxId: partner.taxId ?? "",
              street: partner.street ?? "",
              city: partner.city ?? "",
              zip: partner.zip ?? "",
              countryId: partner.countryId ?? "",
              paymentTermId: partner.paymentTermId ?? "",
              creditLimit: Number(partner.creditLimit ?? 0),
              creditUsed: Number(partner.creditUsed ?? 0),
              creditCurrency: partner.creditCurrency ?? "",
              notes: partner.notes ?? "",
            }}
            onSave={(values) => update.mutate({ id, data: values })}
            isSaving={update.isPending}
          />
        </TabsContent>

        <TabsContent value="invoices" className="mt-4">
          <Card>
            <CardContent className="pt-6">
              {invoices.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">{t("noInvoicesYet")}</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-muted-foreground">
                      <th className="text-left pb-2 font-medium">{t("number")}</th>
                      <th className="text-left pb-2 font-medium">{tc("date")}</th>
                      <th className="text-left pb-2 font-medium">{tc("status")}</th>
                      <th className="text-right pb-2 font-medium">{tc("total")}</th>
                      <th className="text-right pb-2 font-medium">{t("amountDue")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(invoices as {
                      id: string;
                      name: string | null;
                      date: string | Date;
                      state: string;
                      paymentState: string;
                      amountTotal: number | { toNumber(): number };
                      amountResidual: number | { toNumber(): number };
                    }[]).map((inv) => (
                      <tr key={inv.id} className="border-b last:border-0">
                        <td className="py-2">
                          <Link href={`/finance/customers/invoices/${inv.id}`} className="font-mono hover:underline text-primary">
                            {inv.name || t("draftInvoice")}
                          </Link>
                        </td>
                        <td className="py-2">{new Date(inv.date).toLocaleDateString()}</td>
                        <td className="py-2">
                          <Badge variant="outline" className="text-xs">
                            {MOVE_STATE_LABELS[inv.state as keyof typeof MOVE_STATE_LABELS] ?? inv.state}
                          </Badge>
                        </td>
                        <td className="py-2 text-right">
                          {(typeof inv.amountTotal === "object" ? inv.amountTotal.toNumber() : inv.amountTotal).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-2 text-right">
                          {(typeof inv.amountResidual === "object" ? inv.amountResidual.toNumber() : inv.amountResidual).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payments" className="mt-4">
          <Card>
            <CardContent className="pt-6">
              {payments.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">{t("noPaymentsYet")}</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-muted-foreground">
                      <th className="text-left pb-2 font-medium">{tc("reference")}</th>
                      <th className="text-left pb-2 font-medium">{tc("date")}</th>
                      <th className="text-left pb-2 font-medium">{t("paymentMethod")}</th>
                      <th className="text-left pb-2 font-medium">{tc("status")}</th>
                      <th className="text-right pb-2 font-medium">{tc("amount")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(payments as {
                      id: string;
                      name: string | null;
                      date: string | Date;
                      paymentType?: string;
                      journal?: { name: string };
                      state: string;
                      amount: number | { toNumber(): number };
                    }[]).map((p) => (
                      <tr key={p.id} className="border-b last:border-0">
                        <td className="py-2 font-mono">{p.name || "—"}</td>
                        <td className="py-2">{new Date(p.date).toLocaleDateString()}</td>
                        <td className="py-2">{p.journal?.name ?? "—"}</td>
                        <td className="py-2">
                          <Badge variant="outline" className="text-xs capitalize">{p.state}</Badge>
                        </td>
                        <td className="py-2 text-right">
                          {(typeof p.amount === "object" ? p.amount.toNumber() : p.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
    </PermissionGuard>
  );
}
