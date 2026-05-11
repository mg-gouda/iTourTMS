"use client";

import { use } from "react";
import Link from "next/link";
import {
  Archive, ArrowLeft, Building2, ExternalLink, User,
} from "lucide-react";
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
import { MOVE_STATE_LABELS } from "@/lib/constants/finance";

export default function VendorDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const utils = trpc.useUtils();

  const { data: partner, isLoading } = trpc.finance.partner.getById.useQuery({ id });
  const { data: stats } = trpc.finance.partner.getStats.useQuery({ id });
  const { data: billsData } = trpc.finance.move.list.useQuery({
    moveType: "IN_INVOICE",
    partnerId: id,
  });
  const bills = billsData?.items ?? [];
  const { data: paymentsData } = trpc.finance.payment.list.useQuery({
    partnerId: id,
    paymentType: "OUTBOUND",
  });
  const payments = paymentsData?.items ?? [];

  const update = trpc.finance.partner.update.useMutation({
    onSuccess: () => {
      toast.success("Vendor saved");
      utils.finance.partner.getById.invalidate({ id });
    },
    onError: (err) => toast.error(err.message),
  });

  const toggleActive = trpc.finance.partner.toggleActive.useMutation({
    onSuccess: () => {
      toast.success(partner?.isActive ? "Vendor archived" : "Vendor restored");
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
        <p className="text-muted-foreground">Vendor not found.</p>
        <Button variant="link" asChild className="px-0 mt-2">
          <Link href="/finance/vendors">← Back to vendors</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/finance/vendors">
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
                <Badge variant="secondary">Archived</Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">
              {partner.isCompany ? "Company" : "Individual"} · Vendor
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" asChild size="sm">
            <Link href={`/finance/vendors/bills?partnerId=${id}`}>
              <ExternalLink className="size-3.5 mr-1.5" />
              Bills
            </Link>
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Archive className="size-3.5 mr-1.5" />
                {partner.isActive ? "Archive" : "Restore"}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  {partner.isActive ? "Archive vendor?" : "Restore vendor?"}
                </AlertDialogTitle>
                <AlertDialogDescription>
                  {partner.isActive
                    ? "Archived vendors won't appear in new bills or lookups."
                    : "This will restore the vendor to active status."}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => toggleActive.mutate({ id })}>
                  {partner.isActive ? "Archive" : "Restore"}
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
              <p className="text-[11px] font-medium text-muted-foreground mb-0.5">Sales</p>
              <p className="text-sm font-bold leading-tight">{stats.salesCount}</p>
              <p className="text-[10px] text-muted-foreground font-mono">{stats.salesAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
            </div>
          </Card>
          <Card className="col-span-1 py-0 gap-0">
            <div className="px-3 pt-2 pb-2">
              <p className="text-[11px] font-medium text-muted-foreground mb-0.5">Invoiced</p>
              <p className="text-sm font-bold leading-tight font-mono">{stats.invoicedAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
            </div>
          </Card>
          <Card className="col-span-1 py-0 gap-0">
            <div className="px-3 pt-2 pb-2">
              <p className="text-[11px] font-medium text-muted-foreground mb-0.5">Vendor Bills</p>
              <p className="text-sm font-bold leading-tight font-mono">{stats.vendorBillsAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
            </div>
          </Card>
          <Card className="col-span-1 py-0 gap-0">
            <div className="px-3 pt-2 pb-2">
              <p className="text-[11px] font-medium text-muted-foreground mb-0.5">Due</p>
              <p className={`text-sm font-bold leading-tight font-mono ${stats.dueAmount > 0 ? "text-amber-600" : ""}`}>{stats.dueAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
            </div>
          </Card>
          <Card className="col-span-1 py-0 gap-0">
            <div className="px-3 pt-2 pb-2">
              <p className="text-[11px] font-medium text-muted-foreground mb-0.5">Purchases</p>
              <p className="text-sm font-bold leading-tight">{stats.purchasesCount}</p>
              <p className="text-[10px] text-muted-foreground font-mono">{stats.purchasesAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
            </div>
          </Card>
          <Card className="col-span-1 py-0 gap-0">
            <div className="px-3 pt-2 pb-2">
              <p className="text-[11px] font-medium text-muted-foreground mb-0.5">Contracts</p>
              <p className="text-sm font-bold leading-tight">{stats.contractsCount}</p>
            </div>
          </Card>
        </div>
      )}

      {/* Tabs */}
      <Tabs defaultValue="details">
        <TabsList>
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="bills">Bills ({bills.length})</TabsTrigger>
          <TabsTrigger value="payments">Payments ({payments.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="mt-4">
          <PartnerForm
            type="supplier"
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
              notes: partner.notes ?? "",
            }}
            onSave={(values) => update.mutate({ id, data: values })}
            isSaving={update.isPending}
          />
        </TabsContent>

        <TabsContent value="bills" className="mt-4">
          <Card>
            <CardContent className="pt-6">
              {bills.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No bills yet.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-muted-foreground">
                      <th className="text-left pb-2 font-medium">Number</th>
                      <th className="text-left pb-2 font-medium">Date</th>
                      <th className="text-left pb-2 font-medium">State</th>
                      <th className="text-right pb-2 font-medium">Total</th>
                      <th className="text-right pb-2 font-medium">Due</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(bills as {
                      id: string;
                      name: string | null;
                      date: string | Date;
                      state: string;
                      amountTotal: number | { toNumber(): number };
                      amountResidual: number | { toNumber(): number };
                    }[]).map((bill) => (
                      <tr key={bill.id} className="border-b last:border-0">
                        <td className="py-2">
                          <Link href={`/finance/vendors/bills/${bill.id}`} className="font-mono hover:underline text-primary">
                            {bill.name || "Draft"}
                          </Link>
                        </td>
                        <td className="py-2">{new Date(bill.date).toLocaleDateString()}</td>
                        <td className="py-2">
                          <Badge variant="outline" className="text-xs">
                            {MOVE_STATE_LABELS[bill.state as keyof typeof MOVE_STATE_LABELS] ?? bill.state}
                          </Badge>
                        </td>
                        <td className="py-2 text-right">
                          {(typeof bill.amountTotal === "object" ? bill.amountTotal.toNumber() : bill.amountTotal).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-2 text-right">
                          {(typeof bill.amountResidual === "object" ? bill.amountResidual.toNumber() : bill.amountResidual).toLocaleString(undefined, { minimumFractionDigits: 2 })}
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
                <p className="text-sm text-muted-foreground text-center py-8">No payments yet.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-muted-foreground">
                      <th className="text-left pb-2 font-medium">Reference</th>
                      <th className="text-left pb-2 font-medium">Date</th>
                      <th className="text-left pb-2 font-medium">Journal</th>
                      <th className="text-left pb-2 font-medium">State</th>
                      <th className="text-right pb-2 font-medium">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(payments as {
                      id: string;
                      name: string | null;
                      date: string | Date;
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
  );
}
