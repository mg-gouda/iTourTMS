"use client";

import { Check, ChevronDown, MapPin } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc";

const COOKIE = "itms-branch"; // mirrors BRANCH_COOKIE in server/branch-scope.ts
const ALL = "all";

/** Which branch's records the dashboard shows and where new ones go. */
export function BranchSwitcher() {
  const { data } = trpc.branch.mine.useQuery(undefined, { staleTime: 60_000 });
  if (!data || data.branches.length === 0) return null;

  const active = data.branches.find((b) => b.id === data.activeId);

  // One branch: nothing to choose, but staff should still see where they are.
  if (data.branches.length === 1) {
    return (
      <span className="text-muted-foreground hidden items-center gap-1.5 text-xs font-medium md:inline-flex">
        <MapPin className="size-3.5" aria-hidden />
        {data.branches[0].name}
      </span>
    );
  }

  const pick = (value: string) => {
    document.cookie = `${COOKIE}=${encodeURIComponent(value)}; path=/; max-age=31536000; samesite=lax`;
    // ponytail: a reload drops every cached query at once; switching is rare.
    window.location.reload();
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            "h-8 gap-1.5 rounded-lg",
            !active && "border-primary/40 bg-primary/5 text-primary hover:bg-primary/10",
          )}
          aria-label={`Branch: ${active?.name ?? "All branches"}`}
        >
          <MapPin className="size-3.5" aria-hidden />
          <span className="max-w-32 truncate">{active?.name ?? "All branches"}</span>
          <ChevronDown className="size-3.5 opacity-60" aria-hidden />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-52">
        <DropdownMenuLabel className="text-muted-foreground text-xs font-normal">
          Working in
        </DropdownMenuLabel>
        {data.branches.map((b) => (
          <DropdownMenuItem key={b.id} onSelect={() => pick(b.id)} className="gap-2">
            <Check className={cn("size-4", b.id !== data.activeId && "invisible")} aria-hidden />
            <span className="flex-1">{b.name}</span>
            <span className="text-muted-foreground font-mono text-xs">{b.code}</span>
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => pick(ALL)} className="gap-2">
          <Check className={cn("size-4", active && "invisible")} aria-hidden />
          <span className="flex-1">All branches</span>
          <span className="text-muted-foreground text-xs">view only</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
