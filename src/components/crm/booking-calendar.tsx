"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  CRM_BOOKING_STATUS_LABELS,
  CRM_BOOKING_STATUS_VARIANTS,
} from "@/lib/constants/crm";

type BookingEntry = {
  id: string;
  code: string;
  status: string;
  travelDate: Date;
  paxAdults: number;
  paxChildren: number;
  paxInfants: number;
  totalSelling: unknown;
  customer: { firstName: string; lastName: string } | null;
};

interface BookingCalendarProps {
  bookings: BookingEntry[];
}

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfWeek(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function BookingCalendar({ bookings }: BookingCalendarProps) {
  const router = useRouter();
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());

  const prevMonth = useCallback(() => {
    if (month === 0) { setYear((y) => y - 1); setMonth(11); }
    else setMonth((m) => m - 1);
  }, [month]);

  const nextMonth = useCallback(() => {
    if (month === 11) { setYear((y) => y + 1); setMonth(0); }
    else setMonth((m) => m + 1);
  }, [month]);

  const goToday = useCallback(() => {
    setYear(today.getFullYear());
    setMonth(today.getMonth());
  }, [today]);

  // Group bookings by day of month
  const bookingsByDay = useMemo(() => {
    const map: Record<number, BookingEntry[]> = {};
    for (const b of bookings) {
      const d = new Date(b.travelDate);
      if (d.getFullYear() === year && d.getMonth() === month) {
        const day = d.getDate();
        if (!map[day]) map[day] = [];
        map[day].push(b);
      }
    }
    return map;
  }, [bookings, year, month]);

  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfWeek(year, month);
  const todayDate = today.getFullYear() === year && today.getMonth() === month ? today.getDate() : -1;

  // Build weeks grid
  const weeks: (number | null)[][] = [];
  let currentWeek: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) currentWeek.push(null);
  for (let day = 1; day <= daysInMonth; day++) {
    currentWeek.push(day);
    if (currentWeek.length === 7) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
  }
  if (currentWeek.length > 0) {
    while (currentWeek.length < 7) currentWeek.push(null);
    weeks.push(currentWeek);
  }

  return (
    <div className="space-y-4">
      {/* Navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={prevMonth}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h2 className="text-lg font-semibold min-w-[180px] text-center">
            {MONTH_NAMES[month]} {year}
          </h2>
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={nextMonth}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <Button variant="outline" size="sm" onClick={goToday}>Today</Button>
      </div>

      {/* Calendar Grid */}
      <div className="overflow-hidden rounded-lg border">
        {/* Day headers */}
        <div className="grid grid-cols-7 bg-muted/50">
          {DAY_NAMES.map((d) => (
            <div key={d} className="px-2 py-2 text-center text-xs font-medium text-muted-foreground border-b">
              {d}
            </div>
          ))}
        </div>

        {/* Weeks */}
        {weeks.map((week, wi) => (
          <div key={wi} className="grid grid-cols-7">
            {week.map((day, di) => {
              const dayBookings = day ? bookingsByDay[day] ?? [] : [];
              const isToday = day === todayDate;
              return (
                <div
                  key={di}
                  className={`min-h-[90px] border-b border-r last:border-r-0 p-1 ${
                    day ? "bg-background" : "bg-muted/20"
                  } ${isToday ? "ring-2 ring-inset ring-primary/30" : ""}`}
                >
                  {day && (
                    <>
                      <div className={`text-xs font-medium px-1 ${isToday ? "text-primary font-bold" : "text-muted-foreground"}`}>
                        {day}
                      </div>
                      <div className="space-y-0.5 mt-0.5">
                        {dayBookings.slice(0, 3).map((b) => (
                          <div
                            key={b.id}
                            className="cursor-pointer rounded px-1 py-0.5 text-[10px] leading-tight truncate hover:opacity-80 transition-opacity"
                            style={{
                              backgroundColor: getStatusColor(b.status),
                              color: "#fff",
                            }}
                            onClick={() => router.push(`/crm/bookings/${b.id}`)}
                            title={`${b.code} — ${b.customer ? `${b.customer.firstName} ${b.customer.lastName}` : "Walk-in"}`}
                          >
                            {b.code} {b.customer ? b.customer.lastName : ""}
                          </div>
                        ))}
                        {dayBookings.length > 3 && (
                          <div className="text-[10px] text-muted-foreground px-1">
                            +{dayBookings.length - 3} more
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs">
        {Object.entries(CRM_BOOKING_STATUS_LABELS).map(([status, label]) => (
          <div key={status} className="flex items-center gap-1.5">
            <div
              className="h-2.5 w-2.5 rounded-sm"
              style={{ backgroundColor: getStatusColor(status) }}
            />
            <span className="text-muted-foreground">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function getStatusColor(status: string): string {
  switch (status) {
    case "DRAFT": return "#94a3b8";
    case "CONFIRMED": return "#22c55e";
    case "CANCELLED": return "#ef4444";
    case "COMPLETED": return "#3b82f6";
    case "NO_SHOW": return "#f59e0b";
    default: return "#94a3b8";
  }
}
