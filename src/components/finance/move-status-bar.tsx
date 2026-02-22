"use client";

import { Badge } from "@/components/ui/badge";
import { MOVE_STATE_LABELS, PAYMENT_STATE_LABELS } from "@/lib/constants/finance";
import { cn } from "@/lib/utils";

interface MoveStatusBarProps {
  state: string;
  paymentState?: string;
}

const stateSteps = ["DRAFT", "POSTED"];

export function MoveStatusBar({ state, paymentState }: MoveStatusBarProps) {
  const isCancelled = state === "CANCELLED";
  const currentIdx = stateSteps.indexOf(state);

  return (
    <div className="flex items-center gap-2">
      {stateSteps.map((step, idx) => {
        const isActive = step === state;
        const isPast = idx < currentIdx;

        return (
          <div key={step} className="flex items-center gap-2">
            {idx > 0 && (
              <div
                className={cn(
                  "h-0.5 w-6",
                  isPast || isActive ? "bg-primary" : "bg-muted",
                )}
              />
            )}
            <Badge
              variant={isActive ? "default" : isPast ? "secondary" : "outline"}
              className={cn(
                isActive && "ring-2 ring-primary/20",
                isCancelled && step === "POSTED" && "bg-destructive text-destructive-foreground",
              )}
            >
              {isCancelled && step === "POSTED"
                ? "Cancelled"
                : MOVE_STATE_LABELS[step] ?? step}
            </Badge>
          </div>
        );
      })}

      {paymentState && state === "POSTED" && !isCancelled && (
        <>
          <div className="h-0.5 w-6 bg-muted" />
          <Badge
            variant={
              paymentState === "PAID"
                ? "default"
                : paymentState === "PARTIAL"
                  ? "secondary"
                  : "outline"
            }
            className={cn(
              paymentState === "PAID" && "bg-green-600 text-white",
            )}
          >
            {PAYMENT_STATE_LABELS[paymentState] ?? paymentState}
          </Badge>
        </>
      )}

      {isCancelled && (
        <Badge variant="destructive">Cancelled</Badge>
      )}
    </div>
  );
}
