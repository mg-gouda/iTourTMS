"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  BATCH_PAYMENT_STATE_LABELS,
  MOVE_STATE_LABELS,
  PAYMENT_TYPE_LABELS,
} from "@/lib/constants/finance";
import { trpc } from "@/lib/trpc";

interface BatchPaymentFormProps {
  defaultValues?: {
    id: string;
    name: string | null;
    state: string;
    paymentType: string;
    journalId: string;
    date: string | Date;
    totalAmount: number;
    paymentCount: number;
    journal?: { id: string; code: string; name: string };
    payments?: Array<{
      id: string;
      name: string | null;
      state: string;
      amount: number;
      partner?: { id: string; name: string } | null;
      currency?: { id: string; code: string; symbol: string };
      invoices?: Array<{
        id: string;
        name: string | null;
        amountTotal: number;
        paymentState: string;
      }>;
    }>;
  };
}

export function BatchPaymentForm({ defaultValues }: BatchPaymentFormProps) {
  const router = useRouter();
  const utils = trpc.useUtils();
  const isEdit = !!defaultValues?.id;
  const isDraft = !defaultValues?.state || defaultValues.state === "DRAFT";
  const isPosted = defaultValues?.state === "POSTED";

  // For new batch creation
  const [paymentType, setPaymentType] = useState<"INBOUND" | "OUTBOUND">("OUTBOUND");
  const [journalId, setJournalId] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [selectedInvoices, setSelectedInvoices] = useState<string[]>([]);

  const { data: journals } = trpc.finance.journal.list.useQuery();
  const bankJournals = (journals ?? []).filter(
    (j: any) => j.type === "BANK" || j.type === "CASH",
  );

  // Fetch unpaid invoices for batch creation
  const moveType = paymentType === "INBOUND" ? "OUT_INVOICE" : "IN_INVOICE";
  const { data: invoices } = trpc.finance.move.list.useQuery(
    { moveType, state: "POSTED" },
    { enabled: !isEdit },
  );

  // Filter to those with residual > 0
  const unpaidInvoices = (invoices?.items ?? []).filter(
    (inv: any) => Number(inv.amountResidual) > 0.01 || inv.paymentState !== "PAID",
  );

  const createMutation = trpc.finance.batchPayment.create.useMutation({
    onSuccess: (data) => {
      utils.finance.batchPayment.list.invalidate();
      router.push(`/finance/banking/batch-payments/${data.id}`);
    },
  });

  const confirmMutation = trpc.finance.batchPayment.confirm.useMutation({
    onSuccess: () => {
      utils.finance.batchPayment.list.invalidate();
      utils.finance.batchPayment.getById.invalidate();
      router.refresh();
    },
  });

  const cancelMutation = trpc.finance.batchPayment.cancel.useMutation({
    onSuccess: () => {
      utils.finance.batchPayment.list.invalidate();
      utils.finance.batchPayment.getById.invalidate();
      router.refresh();
    },
  });

  // Compute selected total
  const selectedTotal = unpaidInvoices
    .filter((inv: any) => selectedInvoices.includes(inv.id))
    .reduce((sum: number, inv: any) => {
      const residual = Number(inv.amountResidual);
      return sum + (residual > 0 ? residual : Number(inv.amountTotal));
    }, 0);

  function toggleInvoice(id: string) {
    setSelectedInvoices((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  function handleCreate() {
    if (!journalId || selectedInvoices.length === 0) return;
    createMutation.mutate({
      journalId,
      date: new Date(date),
      paymentType,
      invoiceMoveIds: selectedInvoices,
    });
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      {isEdit && defaultValues && (
        <>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {defaultValues.name && (
                <span className="font-mono text-lg font-bold">
                  {defaultValues.name}
                </span>
              )}
              <Badge variant="outline">
                {PAYMENT_TYPE_LABELS[defaultValues.paymentType] ?? defaultValues.paymentType}
              </Badge>
            </div>
            <Badge variant={isPosted ? "default" : "outline"}>
              {BATCH_PAYMENT_STATE_LABELS[defaultValues.state] ?? defaultValues.state}
            </Badge>
          </div>

          <Separator />

          {/* Batch details */}
          <div className="grid grid-cols-1 gap-4 text-sm md:grid-cols-4">
            <div>
              <span className="text-muted-foreground">Journal:</span>
              <p className="font-medium">
                {defaultValues.journal?.code} — {defaultValues.journal?.name}
              </p>
            </div>
            <div>
              <span className="text-muted-foreground">Date:</span>
              <p className="font-medium">
                {new Date(defaultValues.date).toLocaleDateString()}
              </p>
            </div>
            <div>
              <span className="text-muted-foreground">Total Amount:</span>
              <p className="font-mono font-medium">
                {Number(defaultValues.totalAmount).toFixed(2)}
              </p>
            </div>
            <div>
              <span className="text-muted-foreground">Payment Count:</span>
              <p className="font-medium">{defaultValues.paymentCount}</p>
            </div>
          </div>

          {/* Child Payments */}
          {defaultValues.payments && defaultValues.payments.length > 0 && (
            <Card>
              <CardContent className="pt-6">
                <h3 className="mb-4 text-lg font-semibold">Payments</h3>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Number</TableHead>
                      <TableHead>Partner</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Invoice</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {defaultValues.payments.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell className="font-mono">
                          {p.name ?? "Draft"}
                        </TableCell>
                        <TableCell>{p.partner?.name ?? "—"}</TableCell>
                        <TableCell className="text-right font-mono">
                          {Number(p.amount).toFixed(2)}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={p.state === "POSTED" ? "default" : "outline"}
                          >
                            {MOVE_STATE_LABELS[p.state] ?? p.state}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {p.invoices?.map((inv) => inv.name).join(", ") ?? "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* New Batch Form */}
      {!isEdit && (
        <>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div>
              <Label>Payment Type</Label>
              <Select
                onValueChange={(v) => {
                  setPaymentType(v as "INBOUND" | "OUTBOUND");
                  setSelectedInvoices([]);
                }}
                value={paymentType}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="INBOUND">Customer Payment</SelectItem>
                  <SelectItem value="OUTBOUND">Vendor Payment</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Journal</Label>
              <Select onValueChange={setJournalId} value={journalId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select journal" />
                </SelectTrigger>
                <SelectContent>
                  {bankJournals.map((j: any) => (
                    <SelectItem key={j.id} value={j.id}>
                      {j.code} — {j.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Date</Label>
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
          </div>

          {/* Invoice Selection */}
          <Card>
            <CardContent className="pt-6">
              <h3 className="mb-4 text-lg font-semibold">
                Select {paymentType === "INBOUND" ? "Invoices" : "Bills"} to Pay
              </h3>
              {unpaidInvoices.length === 0 ? (
                <p className="text-muted-foreground text-sm">
                  No unpaid {paymentType === "INBOUND" ? "invoices" : "bills"} found.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-8" />
                      <TableHead>Number</TableHead>
                      <TableHead>Partner</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead className="text-right">Residual</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {unpaidInvoices.map((inv: any) => (
                      <TableRow key={inv.id}>
                        <TableCell>
                          <Checkbox
                            checked={selectedInvoices.includes(inv.id)}
                            onCheckedChange={() => toggleInvoice(inv.id)}
                          />
                        </TableCell>
                        <TableCell className="font-mono">
                          {inv.name ?? "Draft"}
                        </TableCell>
                        <TableCell>{inv.partner?.name ?? "—"}</TableCell>
                        <TableCell className="text-right font-mono">
                          {Number(inv.amountTotal).toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {Number(inv.amountResidual).toFixed(2)}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {inv.paymentState ?? "NOT_PAID"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}

              {selectedInvoices.length > 0 && (
                <div className="mt-4 flex justify-end text-sm">
                  <div className="w-64 space-y-1">
                    <div className="flex justify-between">
                      <span>Selected:</span>
                      <span>{selectedInvoices.length} items</span>
                    </div>
                    <div className="flex justify-between font-bold">
                      <span>Total Amount:</span>
                      <span className="font-mono">{selectedTotal.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* Action Buttons */}
      <div className="flex gap-2">
        {!isEdit && (
          <Button
            onClick={handleCreate}
            disabled={
              !journalId ||
              selectedInvoices.length === 0 ||
              createMutation.isPending
            }
          >
            {createMutation.isPending ? "Creating..." : "Create Batch"}
          </Button>
        )}
        {isDraft && isEdit && defaultValues?.id && (
          <Button
            disabled={confirmMutation.isPending}
            onClick={() => confirmMutation.mutate({ id: defaultValues.id })}
          >
            {confirmMutation.isPending ? "Confirming..." : "Confirm Batch"}
          </Button>
        )}
        {isPosted && isEdit && defaultValues?.id && (
          <Button
            variant="destructive"
            disabled={cancelMutation.isPending}
            onClick={() => cancelMutation.mutate({ id: defaultValues.id })}
          >
            {cancelMutation.isPending ? "Cancelling..." : "Cancel Batch"}
          </Button>
        )}
        <Button
          variant="outline"
          onClick={() => router.push("/finance/banking/batch-payments")}
        >
          Back
        </Button>
      </div>

      {(createMutation.isError || confirmMutation.isError || cancelMutation.isError) && (
        <p className="text-sm text-destructive">
          {createMutation.error?.message ??
            confirmMutation.error?.message ??
            cancelMutation.error?.message}
        </p>
      )}
    </div>
  );
}
