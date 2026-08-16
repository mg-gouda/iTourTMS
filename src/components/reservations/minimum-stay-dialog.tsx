"use client";

import { CalendarClock } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { MinimumStayRule } from "@/lib/reservations/dates";

/**
 * Shown when a chosen stay is shorter than the contract allows. The picker
 * already greys those dates out, so this catches typed and pasted dates — and
 * says which rule is doing the blocking rather than just refusing.
 */
export function MinimumStayDialog({
  open,
  onOpenChange,
  rule,
  nights,
  earliestDeparture,
  onUseEarliest,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rule: MinimumStayRule;
  nights: number;
  earliestDeparture?: string;
  onUseEarliest?: () => void;
}) {
  const where =
    rule.source === "season"
      ? `the season ${rule.seasonLabel ?? ""}`.trim()
      : "this contract";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarClock className="size-5 text-amber-500" />
            Stay is too short
          </DialogTitle>
          <DialogDescription asChild>
            <div className="space-y-2 text-sm">
              <p>
                {where.charAt(0).toUpperCase() + where.slice(1)} requires a minimum stay of{" "}
                <strong>
                  {rule.nights} night{rule.nights === 1 ? "" : "s"}
                </strong>
                {nights > 0 && (
                  <>
                    , and this booking is{" "}
                    <strong>
                      {nights} night{nights === 1 ? "" : "s"}
                    </strong>
                  </>
                )}
                .
              </p>
              <p>
                Pick a departure on or after{" "}
                <strong>{earliestDeparture ?? "the earliest allowed date"}</strong>, or book against
                a contract with a shorter minimum stay.
              </p>
            </div>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Change dates myself
          </Button>
          {earliestDeparture && onUseEarliest && (
            <Button onClick={onUseEarliest}>Use {earliestDeparture}</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
