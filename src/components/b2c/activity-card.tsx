"use client";

import { useState } from "react";
import { Compass, Clock, Users } from "lucide-react";
import { ActivityEnquiryForm } from "./activity-enquiry-form";

interface Props {
  excursion: {
    id: string;
    name: string;
    description: string | null;
    duration: string | null;
    maxPax: number | null;
    productType: string;
    category: string;
    programCount: number;
  };
  typeLabel: string;
  categoryLabel: string;
}

export function ActivityCard({ excursion, typeLabel, categoryLabel }: Props) {
  const [showForm, setShowForm] = useState(false);

  return (
    <div className="pub-card overflow-hidden">
      <div className="relative h-40 bg-gradient-to-br from-[var(--pub-primary)] to-[var(--pub-accent)]">
        <div className="flex h-full items-center justify-center">
          <Compass className="h-12 w-12 text-white/30" />
        </div>
        <span className="absolute left-2 top-2 rounded-full bg-white/90 px-2 py-0.5 text-xs font-medium text-[var(--pub-foreground)]">
          {categoryLabel}
        </span>
        <span className="absolute right-2 top-2 rounded-full bg-[var(--pub-secondary)] px-2 py-0.5 text-xs font-medium text-white">
          {typeLabel}
        </span>
      </div>

      <div className="p-4">
        <h3
          className="mb-1 text-lg font-bold"
          style={{ fontFamily: "var(--pub-heading-font)" }}
        >
          {excursion.name}
        </h3>

        {excursion.description && (
          <p className="mb-3 line-clamp-2 text-sm text-[var(--pub-muted-foreground)]">
            {excursion.description}
          </p>
        )}

        <div className="flex flex-wrap gap-3 text-xs text-[var(--pub-muted-foreground)]">
          {excursion.duration && (
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              {excursion.duration}
            </span>
          )}
          {excursion.maxPax && (
            <span className="flex items-center gap-1">
              <Users className="h-3.5 w-3.5" />
              Max {excursion.maxPax}
            </span>
          )}
        </div>

        {excursion.programCount > 0 && (
          <p className="mt-3 text-xs text-[var(--pub-accent)]">
            {excursion.programCount} day program
            {excursion.programCount > 1 ? "s" : ""}
          </p>
        )}

        {showForm ? (
          <div className="mt-4 rounded-lg border border-[var(--pub-border)]">
            <ActivityEnquiryForm
              excursionId={excursion.id}
              excursionName={excursion.name}
              maxPax={excursion.maxPax}
              onClose={() => setShowForm(false)}
            />
          </div>
        ) : (
          <button
            onClick={() => setShowForm(true)}
            className="pub-btn pub-btn-primary mt-4 block w-full text-center text-sm"
          >
            Book Now
          </button>
        )}
      </div>
    </div>
  );
}
