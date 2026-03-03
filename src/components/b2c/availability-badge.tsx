import { Check, Clock, AlertTriangle } from "lucide-react";

interface AvailabilityBadgeProps {
  status: "available" | "on_request" | "limited" | "sold_out";
  remaining?: number;
}

export function AvailabilityBadge({ status, remaining }: AvailabilityBadgeProps) {
  switch (status) {
    case "available":
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
          <Check className="h-3 w-3" />
          Available
        </span>
      );
    case "on_request":
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-700">
          <Clock className="h-3 w-3" />
          On Request
        </span>
      );
    case "limited":
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-orange-100 px-2.5 py-0.5 text-xs font-medium text-orange-700">
          <AlertTriangle className="h-3 w-3" />
          {remaining ? `Only ${remaining} left` : "Limited"}
        </span>
      );
    case "sold_out":
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-700">
          Sold Out
        </span>
      );
  }
}
