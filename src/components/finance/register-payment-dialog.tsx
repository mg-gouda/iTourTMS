"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import type { z } from "zod";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { registerPaymentSchema } from "@/lib/validations/finance";

type RegisterPaymentValues = z.input<typeof registerPaymentSchema>;

interface RegisterPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoiceMoveId: string;
  amountResidual: number;
}

export function RegisterPaymentDialog({
  open,
  onOpenChange,
  invoiceMoveId,
  amountResidual,
}: RegisterPaymentDialogProps) {
  const router = useRouter();
  const utils = trpc.useUtils();

  const form = useForm<RegisterPaymentValues>({
    resolver: zodResolver(registerPaymentSchema),
    defaultValues: {
      invoiceMoveId,
      amount: amountResidual,
      date: new Date(),
      journalId: "",
      ref: null,
    },
  });

  const { data: journals } = trpc.finance.journal.list.useQuery();
  const paymentJournals = (journals ?? []).filter(
    (j: any) => j.type === "CASH" || j.type === "BANK",
  );

  const registerMutation = trpc.finance.payment.registerPayment.useMutation({
    onSuccess: () => {
      utils.finance.move.getById.invalidate();
      utils.finance.move.list.invalidate();
      utils.finance.payment.list.invalidate();
      onOpenChange(false);
      router.refresh();
    },
  });

  function onSubmit(values: RegisterPaymentValues) {
    registerMutation.mutate(values);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Register Payment</DialogTitle>
          <DialogDescription>
            Record a payment against this invoice. Amount due:{" "}
            <span className="font-mono font-bold">
              {amountResidual.toFixed(2)}
            </span>
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-4"
          >
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Amount</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      min="0.01"
                      {...field}
                      onChange={(e) =>
                        field.onChange(parseFloat(e.target.value) || 0)
                      }
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Payment Date</FormLabel>
                  <FormControl>
                    <Input
                      type="date"
                      value={
                        field.value instanceof Date
                          ? field.value.toISOString().split("T")[0]
                          : typeof field.value === "string"
                            ? field.value.split("T")[0]
                            : ""
                      }
                      onChange={(e) => field.onChange(new Date(e.target.value))}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="journalId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Journal</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value ?? ""}
                  >
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select journal" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {paymentJournals.map((j: any) => (
                        <SelectItem key={j.id} value={j.id}>
                          {j.code} — {j.name}
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
              name="ref"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reference (optional)</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Payment reference"
                      {...field}
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

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={registerMutation.isPending}>
                {registerMutation.isPending
                  ? "Registering..."
                  : "Register Payment"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
