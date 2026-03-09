"use client";

import { CalendarDays } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  addMonths,
  format,
  differenceInCalendarDays,
  isBefore,
  isAfter,
  isSameDay,
  startOfDay,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  getDay,
  subMonths,
} from "date-fns";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface DateRangePickerProps {
  startDate: Date | null;
  endDate: Date | null;
  onChange: (start: Date | null, end: Date | null) => void;
  startLabel?: string;
  endLabel?: string;
  /** Minimum selectable date (default: today). Set to a past date to allow past selection. */
  minDate?: Date;
  /** Maximum selectable date (default: none) */
  maxDate?: Date;
  single?: boolean;
  placeholder?: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function getMonthGrid(month: Date): (Date | null)[][] {
  const start = startOfMonth(month);
  const end = endOfMonth(month);
  const days = eachDayOfInterval({ start, end });
  const weeks: (Date | null)[][] = [];
  let currentWeek: (Date | null)[] = [];

  const startDay = (getDay(start) + 6) % 7;
  for (let i = 0; i < startDay; i++) currentWeek.push(null);

  for (const day of days) {
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

  return weeks;
}

function fmt(d: Date): string {
  return format(d, "MMM d, yyyy");
}

function fmtShort(d: Date): string {
  return format(d, "d MMM");
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function DateRangePicker({
  startDate,
  endDate,
  onChange,
  startLabel = "Check-in",
  endLabel = "Check-out",
  minDate,
  maxDate,
  single = false,
  placeholder,
}: DateRangePickerProps) {
  const today = startOfDay(new Date());
  const min = minDate ? startOfDay(minDate) : today;
  const max = maxDate ? startOfDay(maxDate) : null;

  const [open, setOpen] = useState(false);
  const [viewMonth, setViewMonth] = useState(
    startDate ? startOfMonth(startDate) : startOfMonth(today),
  );
  const [hoverDate, setHoverDate] = useState<Date | null>(null);
  const [selectingEnd, setSelectingEnd] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [dropdownPos, setDropdownPos] = useState<{ top: number; left: number } | null>(null);

  // Compute position from trigger rect
  const updatePosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const dropdownWidth = 720;
    let left = rect.left + rect.width / 2 - dropdownWidth / 2;
    // Clamp to viewport
    if (left < 16) left = 16;
    if (left + dropdownWidth > window.innerWidth - 16) left = window.innerWidth - 16 - dropdownWidth;
    setDropdownPos({ top: rect.bottom + 8, left });
  }, []);

  useEffect(() => {
    if (!open) return;
    updatePosition();
    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("resize", updatePosition);
    return () => {
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
    };
  }, [open, updatePosition]);

  useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  function handleDayClick(day: Date) {
    if (isBefore(day, min)) return;
    if (max && isAfter(day, max)) return;

    if (single) {
      onChange(day, null);
      setOpen(false);
      return;
    }

    if (!selectingEnd || !startDate) {
      onChange(day, null);
      setSelectingEnd(true);
      setHoverDate(null);
    } else {
      if (isBefore(day, startDate)) {
        onChange(day, null);
        setSelectingEnd(true);
      } else {
        onChange(startDate, day);
        setSelectingEnd(false);
        setOpen(false);
      }
    }
  }

  function handleDayHover(day: Date) {
    if (selectingEnd && startDate && !isBefore(day, startDate)) {
      setHoverDate(day);
    }
  }

  const nightCount =
    startDate && endDate ? differenceInCalendarDays(endDate, startDate) : null;

  const previewEnd =
    selectingEnd && startDate && hoverDate ? hoverDate : null;
  const previewNights =
    startDate && previewEnd
      ? differenceInCalendarDays(previewEnd, startDate)
      : null;

  const month1 = viewMonth;
  const month2 = addMonths(viewMonth, 1);

  return (
    <div className="relative">
      {/* Trigger */}
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2.5 rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-left transition-all hover:border-[var(--pub-primary)]/50 focus:border-[var(--pub-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--pub-primary)]"
      >
        <CalendarDays className="h-4 w-4 shrink-0 text-[var(--pub-primary)]" />
        {single ? (
          <span className={startDate ? "text-gray-900" : "text-gray-400"}>
            {startDate ? fmt(startDate) : placeholder || "Select date"}
          </span>
        ) : (
          <div className="flex items-center gap-1.5 min-w-0 flex-1">
            <span
              className={
                startDate ? "text-gray-900 font-medium" : "text-gray-400"
              }
            >
              {startDate ? fmtShort(startDate) : startLabel}
            </span>
            <span className="text-gray-300">—</span>
            <span
              className={
                endDate ? "text-gray-900 font-medium" : "text-gray-400"
              }
            >
              {endDate ? fmtShort(endDate) : endLabel}
            </span>
            {nightCount !== null && (
              <span className="ml-auto shrink-0 rounded-full bg-[var(--pub-primary)]/10 px-2 py-0.5 text-[10px] font-bold text-[var(--pub-primary)]">
                {nightCount} night{nightCount !== 1 ? "s" : ""}
              </span>
            )}
          </div>
        )}
      </button>

      {/* Dropdown Calendar — portaled to body to escape transform ancestors */}
      {open && dropdownPos && createPortal(
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-[60] bg-black/10"
            onClick={() => setOpen(false)}
          />

          <div
            ref={dropdownRef}
            className="fixed z-[70] w-[calc(100vw-2rem)] max-w-[720px] rounded-2xl border border-gray-100 bg-white shadow-2xl animate-in fade-in-0 zoom-in-95 slide-in-from-top-2 duration-200"
            style={{ top: dropdownPos.top, left: dropdownPos.left }}
          >
            {/* Header with navigation */}
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
              <button
                type="button"
                onClick={() => setViewMonth(subMonths(viewMonth, 1))}
                className="flex h-9 w-9 items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors"
              >
                <svg
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
              </button>

              <div className="flex items-center gap-12">
                <h3 className="text-base font-bold text-gray-900">
                  {format(month1, "MMMM yyyy")}
                </h3>
                <h3 className="text-base font-bold text-gray-900 hidden sm:block">
                  {format(month2, "MMMM yyyy")}
                </h3>
              </div>

              <button
                type="button"
                onClick={() => setViewMonth(addMonths(viewMonth, 1))}
                className="flex h-9 w-9 items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors"
              >
                <svg
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </button>
            </div>

            {/* Night count hint */}
            {selectingEnd && startDate && (
              <div className="py-2 text-center text-sm font-medium text-[var(--pub-primary)]">
                {previewNights
                  ? `${previewNights} night${previewNights !== 1 ? "s" : ""} selected`
                  : "Now select your check-out date"}
              </div>
            )}

            {/* Two-month calendar grid */}
            <div className="flex divide-x divide-gray-100 px-4 pb-2 pt-2 sm:px-6">
              {/* Month 1 */}
              <div className="flex-1 pr-4 sm:pr-6">
                <MonthGrid
                  month={month1}
                  min={min}
                  max={max}
                  startDate={startDate}
                  endDate={endDate}
                  previewEnd={previewEnd}
                  onDayClick={handleDayClick}
                  onDayHover={handleDayHover}
                  today={today}
                />
              </div>
              {/* Month 2 */}
              <div className="flex-1 pl-4 sm:pl-6 hidden sm:block">
                <MonthGrid
                  month={month2}
                  min={min}
                  max={max}
                  startDate={startDate}
                  endDate={endDate}
                  previewEnd={previewEnd}
                  onDayClick={handleDayClick}
                  onDayHover={handleDayHover}
                  today={today}
                />
              </div>
            </div>

            {/* Footer — quick actions */}
            {!single && (
              <div className="flex items-center justify-between border-t border-gray-100 px-6 py-3">
                <div className="flex gap-2">
                  {[3, 5, 7, 14].map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => {
                        const s = startDate || today;
                        const e = new Date(s.getTime() + n * 86400000);
                        onChange(s, e);
                        setSelectingEnd(false);
                        setOpen(false);
                      }}
                      className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-500 hover:border-[var(--pub-primary)] hover:text-[var(--pub-primary)] hover:bg-[var(--pub-primary)]/5 transition-colors"
                    >
                      {n} Nights
                    </button>
                  ))}
                </div>
                {(startDate || endDate) && (
                  <button
                    type="button"
                    onClick={() => {
                      onChange(null, null);
                      setSelectingEnd(false);
                    }}
                    className="text-xs font-semibold text-gray-400 hover:text-red-500 transition-colors"
                  >
                    Clear dates
                  </button>
                )}
              </div>
            )}
          </div>
        </>,
        document.body,
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Month Grid — spacious layout
// ---------------------------------------------------------------------------

function MonthGrid({
  month,
  min,
  max,
  startDate,
  endDate,
  previewEnd,
  onDayClick,
  onDayHover,
  today,
}: {
  month: Date;
  min: Date;
  max: Date | null;
  startDate: Date | null;
  endDate: Date | null;
  previewEnd: Date | null;
  onDayClick: (d: Date) => void;
  onDayHover: (d: Date) => void;
  today: Date;
}) {
  const weeks = getMonthGrid(month);
  const effectiveEnd = endDate || previewEnd;

  return (
    <div className="select-none">
      {/* Weekday headers */}
      <div className="grid grid-cols-7 mb-2">
        {WEEKDAYS.map((wd) => (
          <div
            key={wd}
            className="flex h-10 items-center justify-center text-xs font-semibold text-gray-400"
          >
            {wd}
          </div>
        ))}
      </div>
      {/* Day rows */}
      {weeks.map((week, wi) => (
        <div key={wi} className="grid grid-cols-7">
          {week.map((day, di) => {
            if (!day) {
              return <div key={`empty-${di}`} className="h-11" />;
            }

            const disabled = isBefore(day, min) || (max ? isAfter(day, max) : false);
            const isToday = isSameDay(day, today);
            const isStart = !!startDate && isSameDay(day, startDate);
            const isEnd = !!endDate && isSameDay(day, endDate);
            const isPreviewEnd =
              !!previewEnd && !endDate && isSameDay(day, previewEnd);

            const inRange =
              !!startDate &&
              !!effectiveEnd &&
              isAfter(day, startDate) &&
              isBefore(day, effectiveEnd);

            const inPreviewOnly = inRange && !endDate && !!previewEnd;

            // Cell background (full-width strip for range)
            let cellBg = "";
            let cellRound = "";

            if (isStart && effectiveEnd) {
              cellBg = "bg-[var(--pub-primary)]/10";
              cellRound = "rounded-l-full";
            } else if (isEnd) {
              cellBg = "bg-[var(--pub-primary)]/10";
              cellRound = "rounded-r-full";
            } else if (isPreviewEnd) {
              cellBg = "bg-[var(--pub-primary)]/5";
              cellRound = "rounded-r-full";
            } else if (inRange) {
              cellBg = inPreviewOnly
                ? "bg-[var(--pub-primary)]/5"
                : "bg-[var(--pub-primary)]/10";
            }

            // Inner button style
            let btnBg = "";
            let textColor = "text-gray-800";
            let fontWeight = "";

            if (disabled) {
              textColor = "text-gray-300";
            } else if (isStart || isEnd) {
              btnBg = "bg-[var(--pub-primary)] shadow-md shadow-[var(--pub-primary)]/25";
              textColor = "text-white";
              fontWeight = "font-bold";
            } else if (isPreviewEnd) {
              btnBg = "bg-[var(--pub-primary)]/60";
              textColor = "text-white";
              fontWeight = "font-bold";
            } else if (inRange) {
              textColor = "text-[var(--pub-primary)]";
              fontWeight = "font-semibold";
            }

            return (
              <div
                key={day.toISOString()}
                className={`h-11 flex items-center justify-center transition-colors duration-75 ${cellBg} ${cellRound}`}
              >
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => onDayClick(day)}
                  onMouseEnter={() => onDayHover(day)}
                  className={`
                    relative flex h-10 w-10 items-center justify-center rounded-full text-sm transition-all duration-100
                    ${btnBg} ${textColor} ${fontWeight}
                    ${disabled ? "cursor-not-allowed" : "cursor-pointer"}
                    ${
                      !disabled && !isStart && !isEnd && !isPreviewEnd
                        ? "hover:bg-[var(--pub-primary)]/10 hover:text-[var(--pub-primary)] hover:font-semibold hover:scale-105"
                        : ""
                    }
                    ${
                      isToday && !isStart && !isEnd
                        ? "ring-2 ring-[var(--pub-primary)]/30 ring-offset-1"
                        : ""
                    }
                  `}
                >
                  {day.getDate()}
                </button>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
