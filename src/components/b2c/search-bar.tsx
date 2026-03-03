"use client";

import { Search, Users, CalendarDays, MinusCircle, PlusCircle } from "lucide-react";

interface SearchBarProps {
  destinations: { id: string; name: string }[];
  initialValues: {
    destination: string;
    checkIn: string;
    checkOut: string;
    adults: number;
    children: number;
    childAges: number[];
  };
  onSearch: (params: {
    destination: string;
    checkIn: string;
    checkOut: string;
    adults: number;
    children: number;
    childAges: number[];
  }) => void;
  isLoading?: boolean;
}

export function SearchBar({ destinations, initialValues, onSearch, isLoading }: SearchBarProps) {
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const children = parseInt(fd.get("children") as string) || 0;
    const childAges: number[] = [];
    for (let i = 0; i < children; i++) {
      childAges.push(parseInt(fd.get(`childAge_${i}`) as string) || 0);
    }
    onSearch({
      destination: fd.get("destination") as string,
      checkIn: fd.get("checkIn") as string,
      checkOut: fd.get("checkOut") as string,
      adults: parseInt(fd.get("adults") as string) || 2,
      children,
      childAges,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="pub-card p-4 sm:p-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
        {/* Destination */}
        <div className="lg:col-span-2">
          <label className="mb-1.5 flex items-center gap-1 text-sm font-medium">
            <CalendarDays className="h-3.5 w-3.5" />
            Destination
          </label>
          <select
            name="destination"
            defaultValue={initialValues.destination}
            className="w-full rounded-[var(--pub-radius)] border border-[var(--pub-border)] bg-[var(--pub-background)] px-3 py-2 text-sm"
          >
            <option value="">All Destinations</option>
            {destinations.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </div>

        {/* Check-in */}
        <div>
          <label className="mb-1.5 flex items-center gap-1 text-sm font-medium">
            <CalendarDays className="h-3.5 w-3.5" />
            Check-in
          </label>
          <input
            type="date"
            name="checkIn"
            required
            defaultValue={initialValues.checkIn}
            min={new Date().toISOString().split("T")[0]}
            className="w-full rounded-[var(--pub-radius)] border border-[var(--pub-border)] bg-[var(--pub-background)] px-3 py-2 text-sm"
          />
        </div>

        {/* Check-out */}
        <div>
          <label className="mb-1.5 flex items-center gap-1 text-sm font-medium">
            <CalendarDays className="h-3.5 w-3.5" />
            Check-out
          </label>
          <input
            type="date"
            name="checkOut"
            required
            defaultValue={initialValues.checkOut}
            min={new Date().toISOString().split("T")[0]}
            className="w-full rounded-[var(--pub-radius)] border border-[var(--pub-border)] bg-[var(--pub-background)] px-3 py-2 text-sm"
          />
        </div>

        {/* Adults */}
        <div>
          <label className="mb-1.5 flex items-center gap-1 text-sm font-medium">
            <Users className="h-3.5 w-3.5" />
            Adults
          </label>
          <select
            name="adults"
            defaultValue={initialValues.adults}
            className="w-full rounded-[var(--pub-radius)] border border-[var(--pub-border)] bg-[var(--pub-background)] px-3 py-2 text-sm"
          >
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <option key={n} value={n}>
                {n} Adult{n > 1 ? "s" : ""}
              </option>
            ))}
          </select>
        </div>

        {/* Search Button */}
        <div className="flex items-end">
          <button
            type="submit"
            disabled={isLoading}
            className="pub-btn pub-btn-primary w-full justify-center disabled:opacity-50"
          >
            {isLoading ? (
              <span className="animate-pulse">Searching...</span>
            ) : (
              <>
                <Search className="h-4 w-4" />
                Search
              </>
            )}
          </button>
        </div>
      </div>

      {/* Children row */}
      <ChildrenSelector defaultChildren={initialValues.children} defaultChildAges={initialValues.childAges} />
    </form>
  );
}

function ChildrenSelector({
  defaultChildren,
  defaultChildAges,
}: {
  defaultChildren: number;
  defaultChildAges: number[];
}) {
  return (
    <div className="mt-3 border-t border-[var(--pub-border)] pt-3">
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium">Children</label>
          <select
            name="children"
            defaultValue={defaultChildren}
            className="rounded-[var(--pub-radius)] border border-[var(--pub-border)] bg-[var(--pub-background)] px-2 py-1 text-sm"
            onChange={(e) => {
              // Force re-render by dispatching a custom event
              const form = e.target.closest("form");
              if (form) {
                const event = new Event("childrenchange", { bubbles: true });
                form.dispatchEvent(event);
              }
            }}
          >
            {[0, 1, 2, 3, 4].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </div>
        {/* Age selectors */}
        {Array.from({ length: defaultChildren }).map((_, i) => (
          <div key={i} className="flex items-center gap-1">
            <label className="text-xs text-[var(--pub-muted-foreground)]">
              Child {i + 1} age
            </label>
            <select
              name={`childAge_${i}`}
              defaultValue={defaultChildAges[i] ?? 5}
              className="rounded-[var(--pub-radius)] border border-[var(--pub-border)] bg-[var(--pub-background)] px-1.5 py-1 text-xs"
            >
              {Array.from({ length: 18 }, (_, a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>
    </div>
  );
}
