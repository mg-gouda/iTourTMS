"use client";

import { TriangleAlert } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";

const money = (n: number, currency: string) =>
  `${currency} ${n.toLocaleString("en", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/**
 * Cancelling, with the penalty shown before it is agreed to. Inside the
 * penalty window this becomes a request rather than a cancellation — a penalty
 * is money changing hands, and that is not the portal's decision to take.
 */
export function BookingCancelDialog({
  bookingId,
  open,
  onOpenChange,
  onDone,
}: {
  bookingId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDone: () => void;
}) {
  const [reason, setReason] = useState("");

  const { data: preview, isLoading } = trpc.partner.booking.cancellationPreview.useQuery(
    { id: bookingId },
    { enabled: open },
  );

  const cancel = trpc.partner.booking.cancel.useMutation({
    onSuccess: (result) => {
      toast.success(
        result.status === "cancelled"
          ? "Booking cancelled."
          : "Cancellation requested — we will confirm the penalty and come back to you.",
      );
      onOpenChange(false);
      onDone();
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Cancel this booking</DialogTitle>
          <DialogDescription>
            We will show you what it costs before anything happens.
          </DialogDescription>
        </DialogHeader>

        {isLoading || !preview ? (
          <Skeleton className="h-28" />
        ) : (
          <div className="space-y-4">
            <div className="rounded-md border p-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Booking value</span>
                <span>{money(preview.bookingTotal, preview.currencyCode)}</span>
              </div>
              <div className="mt-1 flex justify-between font-medium">
                <span>Cancellation penalty</span>
                <span className={preview.penaltyAmount > 0 ? "text-destructive" : "text-emerald-600"}>
                  {preview.penaltyAmount > 0
                    ? money(preview.penaltyAmount, preview.currencyCode)
                    : "None"}
                </span>
              </div>
              <p className="text-muted-foreground mt-2 text-xs">
                {preview.daysBefore} days before arrival
                {preview.policy ? ` · ${preview.policy}` : ""}
              </p>
            </div>

            {preview.needsApproval && (
              <div className="flex items-start gap-2 rounded-md border border-amber-500/40 bg-amber-500/5 p-3 text-xs">
                <TriangleAlert className="mt-0.5 size-4 shrink-0 text-amber-600" />
                <p>
                  This cancellation falls inside the penalty window, so it goes to us to
                  approve. Your booking stays live until we answer.
                </p>
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="cancel-reason" className="text-xs">
                Reason (optional)
              </Label>
              <Textarea
                id="cancel-reason"
                rows={3}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Anything that helps us understand the cancellation"
              />
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Keep booking
          </Button>
          <Button
            variant="destructive"
            disabled={cancel.isPending || isLoading}
            onClick={() => cancel.mutate({ id: bookingId, reason: reason.trim() || undefined })}
          >
            {cancel.isPending
              ? "Working..."
              : preview?.needsApproval
                ? "Request cancellation"
                : "Cancel booking"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
