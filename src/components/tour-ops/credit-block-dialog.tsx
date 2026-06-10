"use client";

import { useState } from "react";
import { AlertTriangle, CheckCircle, XCircle } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

interface CreditBlockInfo {
  overrideRequestId: string;
  overageAmount: number;
  creditLimit: number;
  creditUsed: number;
  requestedAmount: number;
}

interface Props {
  open: boolean;
  blockInfo: CreditBlockInfo;
  isOperationsManager: boolean;
  onClose: () => void;
  /** Called after OM approves and file is created */
  onApproved?: (fileId: string, quotationCode: string) => void;
}

export function CreditBlockDialog({ open, blockInfo, isOperationsManager, onClose, onApproved }: Props) {
  const [notes, setNotes] = useState("");
  const utils = trpc.useUtils();

  const approve = trpc.tourOps.creditOverride.approve.useMutation({
    onSuccess: (data) => {
      toast.success(`Approved — Quotation ${data.quotationCode} created`);
      utils.tourOps.creditOverride.listPending.invalidate();
      onApproved?.(data.fileId, data.quotationCode);
      onClose();
    },
    onError: (e) => toast.error(e.message),
  });

  const deny = trpc.tourOps.creditOverride.deny.useMutation({
    onSuccess: () => {
      toast.success("Override request denied");
      utils.tourOps.creditOverride.listPending.invalidate();
      onClose();
    },
    onError: (e) => toast.error(e.message),
  });

  const available = blockInfo.creditLimit - blockInfo.creditUsed;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Credit Limit Exceeded
          </DialogTitle>
          <DialogDescription asChild>
            <div className="space-y-3 pt-2">
              <div className="rounded-md border bg-muted/40 p-3 text-sm space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Credit Limit</span>
                  <span className="font-mono font-medium">${blockInfo.creditLimit.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Currently Used</span>
                  <span className="font-mono font-medium text-amber-600">${blockInfo.creditUsed.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Available</span>
                  <span className="font-mono font-medium text-green-600">${available.toLocaleString()}</span>
                </div>
                <div className="flex justify-between border-t pt-1.5">
                  <span className="text-muted-foreground">This Request</span>
                  <span className="font-mono font-medium">${blockInfo.requestedAmount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium text-destructive">Exceeds by</span>
                  <span className="font-mono font-bold text-destructive">${blockInfo.overageAmount.toLocaleString()}</span>
                </div>
              </div>

              {isOperationsManager ? (
                <p className="text-sm text-muted-foreground">
                  You can approve this override to proceed with the quotation, or deny it to cancel.
                </p>
              ) : (
                <div className="rounded-md border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30 p-3 text-sm text-amber-800 dark:text-amber-300">
                  Your request has been sent to your Operations Manager for approval. You will be notified once a decision is made.
                </div>
              )}
            </div>
          </DialogDescription>
        </DialogHeader>

        {isOperationsManager && (
          <div className="space-y-1.5">
            <Label className="text-sm">Notes (optional)</Label>
            <Textarea
              placeholder="Add a note for the requester…"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        )}

        <DialogFooter>
          {isOperationsManager ? (
            <>
              <Button
                variant="outline"
                onClick={() => deny.mutate({ id: blockInfo.overrideRequestId, notes })}
                disabled={deny.isPending || approve.isPending}
              >
                <XCircle className="mr-1.5 h-4 w-4" />
                {deny.isPending ? "Denying…" : "Deny"}
              </Button>
              <Button
                onClick={() => approve.mutate({ id: blockInfo.overrideRequestId, notes })}
                disabled={approve.isPending || deny.isPending}
              >
                <CheckCircle className="mr-1.5 h-4 w-4" />
                {approve.isPending ? "Approving…" : "Approve & Create"}
              </Button>
            </>
          ) : (
            <Button variant="outline" onClick={onClose}>Close</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
