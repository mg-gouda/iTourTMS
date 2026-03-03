"use client";

import { Star } from "lucide-react";

interface SearchFiltersProps {
  currentStar: string;
  currentSort: string;
  onStarChange: (star: string) => void;
  onSortChange: (sort: string) => void;
}

const starOptions = [
  { value: "", label: "All Stars" },
  { value: "FIVE_DELUXE", label: "5 Star Deluxe" },
  { value: "FIVE", label: "5 Star" },
  { value: "FOUR", label: "4 Star" },
  { value: "THREE", label: "3 Star" },
  { value: "TWO", label: "2 Star" },
];

const sortOptions = [
  { value: "price_asc", label: "Price: Low to High" },
  { value: "price_desc", label: "Price: High to Low" },
  { value: "star_desc", label: "Star Rating" },
  { value: "name_asc", label: "Name: A-Z" },
];

export function SearchFilters({
  currentStar,
  currentSort,
  onStarChange,
  onSortChange,
}: SearchFiltersProps) {
  return (
    <div className="space-y-5">
      {/* Sort */}
      <div>
        <h4 className="mb-2 text-sm font-semibold">Sort By</h4>
        <select
          value={currentSort}
          onChange={(e) => onSortChange(e.target.value)}
          className="w-full rounded-[var(--pub-radius)] border border-[var(--pub-border)] bg-[var(--pub-background)] px-3 py-2 text-sm"
        >
          {sortOptions.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      {/* Star Rating */}
      <div>
        <h4 className="mb-2 text-sm font-semibold">Star Rating</h4>
        <div className="space-y-1.5">
          {starOptions.map((opt) => (
            <label
              key={opt.value}
              className={`flex cursor-pointer items-center gap-2 rounded-[var(--pub-radius)] px-2 py-1.5 text-sm transition-colors hover:bg-[var(--pub-muted)] ${
                currentStar === opt.value ? "bg-[var(--pub-muted)] font-medium" : ""
              }`}
            >
              <input
                type="radio"
                name="star"
                value={opt.value}
                checked={currentStar === opt.value}
                onChange={() => onStarChange(opt.value)}
                className="accent-[var(--pub-primary)]"
              />
              <span className="flex items-center gap-1">
                {opt.value && (
                  <span className="pub-stars">
                    {Array.from({ length: starNum(opt.value) }).map((_, i) => (
                      <Star key={i} className="h-3 w-3 fill-current" />
                    ))}
                  </span>
                )}
                {!opt.value && opt.label}
              </span>
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}

function starNum(v: string): number {
  const m: Record<string, number> = { ONE: 1, TWO: 2, THREE: 3, FOUR: 4, FIVE: 5, FIVE_DELUXE: 5 };
  return m[v] ?? 0;
}
