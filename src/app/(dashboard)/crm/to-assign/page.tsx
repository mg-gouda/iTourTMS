"use client";

import { Users } from "lucide-react";

export default function ToAssignPage() {
  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">TO Assign</h1>
          <p className="text-sm text-muted-foreground">Assign tour operators to excursions</p>
        </div>
      </div>

      <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed">
        <div className="flex flex-col items-center gap-2 text-center">
          <Users className="h-10 w-10 text-muted-foreground/40" />
          <p className="text-sm font-medium text-muted-foreground">TO Assign</p>
          <p className="text-xs text-muted-foreground">Tour operator assignment will appear here.</p>
        </div>
      </div>
    </div>
  );
}
