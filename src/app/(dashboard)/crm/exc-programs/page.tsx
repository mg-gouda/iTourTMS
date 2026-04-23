"use client";

import { MapPin } from "lucide-react";

export default function ExcProgramsPage() {
  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Exc. Programs</h1>
          <p className="text-sm text-muted-foreground">Manage excursion programs and itineraries</p>
        </div>
      </div>

      <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed">
        <div className="flex flex-col items-center gap-2 text-center">
          <MapPin className="h-10 w-10 text-muted-foreground/40" />
          <p className="text-sm font-medium text-muted-foreground">Exc. Programs</p>
          <p className="text-xs text-muted-foreground">Excursion programs and itineraries will appear here.</p>
        </div>
      </div>
    </div>
  );
}
