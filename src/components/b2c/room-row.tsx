import { Bed, UtensilsCrossed, Tag } from "lucide-react";
import { AvailabilityBadge } from "./availability-badge";

interface RoomRowProps {
  roomTypeName: string;
  mealName: string;
  mealCode: string;
  availability: "available" | "on_request" | "limited" | "sold_out";
  remainingRooms: number;
  total: number;
  pricePerNight: number;
  currency: string;
  nights: number;
  appliedOffer: { name: string; saving: number } | null;
  totalBeforeOffer: number;
}

export function RoomRow({
  roomTypeName,
  mealName,
  mealCode,
  availability,
  remainingRooms,
  total,
  pricePerNight,
  currency,
  nights,
  appliedOffer,
  totalBeforeOffer,
}: RoomRowProps) {
  return (
    <div className="flex flex-col gap-3 border-t border-[var(--pub-border)] py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex-1 space-y-1">
        <div className="flex items-center gap-2">
          <Bed className="h-4 w-4 text-[var(--pub-muted-foreground)]" />
          <span className="text-sm font-medium">{roomTypeName}</span>
          <AvailabilityBadge status={availability} remaining={remainingRooms} />
        </div>
        <div className="flex items-center gap-2 text-xs text-[var(--pub-muted-foreground)]">
          <UtensilsCrossed className="h-3 w-3" />
          <span>{mealName} ({mealCode})</span>
        </div>
        {appliedOffer && (
          <div className="flex items-center gap-1 text-xs text-emerald-600">
            <Tag className="h-3 w-3" />
            <span>{appliedOffer.name} — Save {currency} {appliedOffer.saving.toFixed(0)}</span>
          </div>
        )}
      </div>

      <div className="text-right">
        {appliedOffer && (
          <div className="text-xs text-[var(--pub-muted-foreground)] line-through">
            {currency} {totalBeforeOffer.toFixed(0)}
          </div>
        )}
        <div className="text-lg font-bold" style={{ color: "var(--pub-primary)" }}>
          {currency} {total.toFixed(0)}
        </div>
        <div className="text-xs text-[var(--pub-muted-foreground)]">
          {currency} {pricePerNight.toFixed(0)} / night &middot; {nights} night{nights !== 1 ? "s" : ""}
        </div>
      </div>
    </div>
  );
}
