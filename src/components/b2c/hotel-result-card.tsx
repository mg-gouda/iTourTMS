import Link from "next/link";
import { Building2, MapPin, Star } from "lucide-react";
import { RoomRow } from "./room-row";

interface HotelResultCardProps {
  hotelId: string;
  hotelName: string;
  starRating: string;
  city: string;
  destinationName: string | null;
  imageUrl: string | null;
  amenities: string[];
  currency: string;
  nights: number;
  cheapestTotal: number;
  cheapestPerNight: number;
  contractId: string;
  rooms: {
    roomTypeId: string;
    roomTypeName: string;
    roomTypeCode: string;
    mealName: string;
    mealCode: string;
    availability: "available" | "on_request" | "limited" | "sold_out";
    remainingRooms: number;
    total: number;
    displayTotal: number;
    pricePerNight: number;
    totalBeforeOffer: number;
    appliedOffer: { name: string; saving: number } | null;
  }[];
  searchParams: string;
}

export function HotelResultCard({
  hotelId,
  hotelName,
  starRating,
  city,
  destinationName,
  imageUrl,
  amenities,
  currency,
  nights,
  cheapestTotal,
  cheapestPerNight,
  contractId,
  rooms,
  searchParams,
}: HotelResultCardProps) {
  const stars = starCount(starRating);

  // Show up to 3 room/meal combos by default
  const visibleRooms = rooms.slice(0, 3);

  return (
    <div className="pub-card overflow-hidden">
      <div className="flex flex-col md:flex-row">
        {/* Image */}
        <Link href={`/hotel/${hotelId}?${searchParams}`} className="group relative md:w-72 shrink-0">
          <div className="h-48 md:h-full overflow-hidden">
            {imageUrl ? (
              <img
                src={imageUrl}
                alt={hotelName}
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
              />
            ) : (
              <div className="flex h-full min-h-[12rem] w-full items-center justify-center bg-[var(--pub-muted)]">
                <Building2 className="h-10 w-10 text-[var(--pub-muted-foreground)]" />
              </div>
            )}
          </div>
        </Link>

        {/* Content */}
        <div className="flex-1 p-4">
          <div className="mb-3 flex items-start justify-between gap-4">
            <div>
              <div className="pub-stars mb-1">
                {Array.from({ length: stars }).map((_, i) => (
                  <Star key={i} className="h-3.5 w-3.5 fill-current" />
                ))}
              </div>
              <Link href={`/hotel/${hotelId}?${searchParams}`}>
                <h3
                  className="text-lg font-semibold hover:text-[var(--pub-primary)]"
                  style={{ fontFamily: "var(--pub-heading-font)" }}
                >
                  {hotelName}
                </h3>
              </Link>
              <p className="mt-0.5 text-sm text-[var(--pub-muted-foreground)]">
                <MapPin className="mr-1 inline h-3 w-3" />
                {destinationName || city}
              </p>
              {amenities.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {amenities.map((a) => (
                    <span
                      key={a}
                      className="rounded-full bg-[var(--pub-muted)] px-2 py-0.5 text-[10px] text-[var(--pub-muted-foreground)]"
                    >
                      {a}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Price summary */}
            <div className="text-right shrink-0">
              <div className="text-xs text-[var(--pub-muted-foreground)]">From</div>
              <div className="text-xl font-bold" style={{ color: "var(--pub-primary)" }}>
                {currency} {cheapestTotal.toFixed(0)}
              </div>
              <div className="text-xs text-[var(--pub-muted-foreground)]">
                {currency} {cheapestPerNight.toFixed(0)} / night
              </div>
            </div>
          </div>

          {/* Room rows */}
          <div>
            {visibleRooms.map((room, i) => {
              const bookingParams = new URLSearchParams(searchParams);
              bookingParams.set("hotelId", hotelId);
              bookingParams.set("hotelName", hotelName);
              bookingParams.set("contractId", contractId);
              bookingParams.set("roomTypeId", room.roomTypeId);
              bookingParams.set("roomType", room.roomTypeName);
              bookingParams.set("mealCode", room.mealCode);
              bookingParams.set("mealName", room.mealName);
              bookingParams.set("total", room.displayTotal.toFixed(2));
              bookingParams.set("currency", currency);
              bookingParams.set("nights", String(nights));
              const bookingUrl = `/booking?${bookingParams.toString()}`;

              return (
                <RoomRow
                  key={`${room.roomTypeCode}-${room.mealCode}-${i}`}
                  roomTypeName={room.roomTypeName}
                  mealName={room.mealName}
                  mealCode={room.mealCode}
                  availability={room.availability}
                  remainingRooms={room.remainingRooms}
                  total={room.total}
                  displayTotal={room.displayTotal}
                  pricePerNight={room.pricePerNight}
                  currency={currency}
                  nights={nights}
                  appliedOffer={room.appliedOffer}
                  totalBeforeOffer={room.totalBeforeOffer}
                  bookingUrl={bookingUrl}
                />
              );
            })}
            {rooms.length > 3 && (
              <Link
                href={`/hotel/${hotelId}?${searchParams}`}
                className="mt-2 block text-center text-sm text-[var(--pub-primary)] hover:underline"
              >
                +{rooms.length - 3} more room option{rooms.length - 3 > 1 ? "s" : ""}
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function starCount(rating: string): number {
  const map: Record<string, number> = { ONE: 1, TWO: 2, THREE: 3, FOUR: 4, FIVE: 5, FIVE_DELUXE: 5 };
  return map[rating] || 3;
}
