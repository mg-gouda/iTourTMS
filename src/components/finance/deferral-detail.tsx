"use client";

import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency } from "@/lib/format";

export interface DeferralView {
  name: string;
  state: string;
  branch: string;
  amount: number;
  done: number;
  startDate: Date;
  endDate: Date;
  debit: { code: string; name: string };
  credit: { code: string; name: string };
  lines: { id: string; date: Date; amount: number; posted: boolean; move: { id: string; name: string | null } | null }[];
}

/**
 * Shared screen for deferred revenue and deferred expense: the same schedule,
 * posting one way or the other. `verb` is "Recognise" or "Amortise".
 */
export function DeferralDetail({
  backHref,
  backLabel,
  verb,
  view,
  posting,
  onPostDue,
  onPostLine,
}: {
  backHref: string;
  backLabel: string;
  verb: string;
  view: DeferralView;
  posting: boolean;
  onPostDue: () => void;
  onPostLine: (id: string) => void;
}) {
  const now = new Date();
  const due = view.lines.filter((l) => !l.posted && new Date(l.date) <= now).length;
  const open = view.state !== "CLOSED";
  const pct = view.amount > 0 ? Math.round((view.done / view.amount) * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href={backHref} className="text-muted-foreground text-sm hover:underline">
            ← {backLabel}
          </Link>
          <h1 className="mt-1 text-2xl font-bold tracking-tight">{view.name}</h1>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-sm">
            <Badge variant={open ? "default" : "secondary"}>{view.state}</Badge>
            <span className="text-muted-foreground">
              {new Date(view.startDate).toLocaleDateString()} – {new Date(view.endDate).toLocaleDateString()} · {view.branch}
            </span>
          </div>
        </div>
        {open && (
          <Button onClick={onPostDue} disabled={posting || !due}>
            {posting ? "Posting…" : due ? `${verb} ${due} due line${due === 1 ? "" : "s"}` : "Nothing due"}
          </Button>
        )}
      </div>

      <dl className="grid grid-cols-2 gap-x-6 gap-y-3 rounded-lg border p-4 sm:grid-cols-4">
        <div>
          <dt className="text-muted-foreground text-xs">Total</dt>
          <dd className="font-mono text-sm tabular-nums">{formatCurrency(view.amount)}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground text-xs">Posted so far</dt>
          <dd className="font-mono text-sm tabular-nums">
            {formatCurrency(view.done)} <span className="text-muted-foreground">({pct}%)</span>
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground text-xs">Debit</dt>
          <dd className="text-sm">{view.debit.code} — {view.debit.name}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground text-xs">Credit</dt>
          <dd className="text-sm">{view.credit.code} — {view.credit.name}</dd>
        </div>
      </dl>

      <Card>
        <CardHeader>
          <CardTitle>Schedule</CardTitle>
          <CardDescription>Each line posts one entry in {view.branch}&apos;s books.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Entry</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {view.lines.map((l) => (
                <TableRow key={l.id}>
                  <TableCell>{new Date(l.date).toLocaleDateString()}</TableCell>
                  <TableCell className="text-right font-mono tabular-nums">{formatCurrency(l.amount)}</TableCell>
                  <TableCell>
                    {l.move ? (
                      <Link href={`/finance/accounting/journal-entries/${l.move.id}`} className="text-primary font-mono text-xs underline">
                        {l.move.name}
                      </Link>
                    ) : open ? (
                      <Button variant="ghost" size="sm" className="h-7" disabled={posting} onClick={() => onPostLine(l.id)}>
                        {verb} now
                      </Button>
                    ) : (
                      <span className="text-muted-foreground text-xs">—</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
