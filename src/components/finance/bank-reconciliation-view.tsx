"use client";

import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { trpc } from "@/lib/trpc";

export function BankReconciliationView() {
  const [journalId, setJournalId] = useState("");
  const [selectedStatementLines, setSelectedStatementLines] = useState<string[]>([]);
  const [selectedJournalItems, setSelectedJournalItems] = useState<string[]>([]);
  const [writeOffAmount, setWriteOffAmount] = useState(0);
  const [writeOffAccountId, setWriteOffAccountId] = useState("");

  const { data: journals } = trpc.finance.journal.list.useQuery();
  const bankJournals = (journals ?? []).filter(
    (j: any) => j.type === "BANK" || j.type === "CASH",
  );

  const { data: statementLines, isLoading: stLoading } =
    trpc.finance.reconciliation.getUnreconciledStatementLines.useQuery(
      { journalId },
      { enabled: !!journalId },
    );

  const { data: journalItems, isLoading: jiLoading } =
    trpc.finance.reconciliation.getUnreconciledJournalItems.useQuery(
      { journalId },
      { enabled: !!journalId },
    );

  const { data: suggestions } =
    trpc.finance.reconciliation.suggestMatches.useQuery(
      { journalId },
      { enabled: !!journalId },
    );

  const { data: accounts } = trpc.finance.account.list.useQuery();

  const utils = trpc.useUtils();

  const reconcileMutation = trpc.finance.reconciliation.reconcile.useMutation({
    onSuccess: () => {
      setSelectedStatementLines([]);
      setSelectedJournalItems([]);
      setWriteOffAmount(0);
      setWriteOffAccountId("");
      utils.finance.reconciliation.getUnreconciledStatementLines.invalidate();
      utils.finance.reconciliation.getUnreconciledJournalItems.invalidate();
      utils.finance.reconciliation.suggestMatches.invalidate();
    },
  });

  const unreconcileMutation = trpc.finance.reconciliation.unreconcile.useMutation({
    onSuccess: () => {
      utils.finance.reconciliation.getUnreconciledStatementLines.invalidate();
      utils.finance.reconciliation.getUnreconciledJournalItems.invalidate();
    },
  });

  // Compute selected totals
  const selectedStTotal = (statementLines ?? [])
    .filter((l: any) => selectedStatementLines.includes(l.id))
    .reduce((sum: number, l: any) => sum + Number(l.amount), 0);

  const selectedJiTotal = (journalItems ?? [])
    .filter((j: any) => selectedJournalItems.includes(j.id))
    .reduce((sum: number, j: any) => sum + (Number(j.debit) - Number(j.credit)), 0);

  const difference = selectedStTotal - selectedJiTotal - writeOffAmount;

  // Suggestion lookup
  const suggestionMap = new Map<string, string>();
  for (const s of suggestions ?? []) {
    suggestionMap.set(s.statementLineId, s.journalItemId);
  }

  function handleAutoMatch() {
    if (!suggestions || suggestions.length === 0) return;
    const stIds: string[] = [];
    const jiIds: string[] = [];
    for (const s of suggestions) {
      stIds.push(s.statementLineId);
      jiIds.push(s.journalItemId);
    }
    setSelectedStatementLines(stIds);
    setSelectedJournalItems(jiIds);
  }

  function toggleStatementLine(id: string) {
    setSelectedStatementLines((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  function toggleJournalItem(id: string) {
    setSelectedJournalItems((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  function handleReconcile() {
    reconcileMutation.mutate({
      bankStatementLineIds: selectedStatementLines,
      moveLineIds: selectedJournalItems,
      writeOffAmount,
      writeOffAccountId: writeOffAccountId || undefined,
    });
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="w-64">
          <Label>Journal</Label>
          <Select onValueChange={setJournalId} value={journalId}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select journal" />
            </SelectTrigger>
            <SelectContent>
              {bankJournals.map((j: any) => (
                <SelectItem key={j.id} value={j.id}>
                  {j.code} — {j.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {journalId && (
          <Button
            variant="outline"
            className="mt-5"
            onClick={handleAutoMatch}
            disabled={!suggestions || suggestions.length === 0}
          >
            Auto-Match ({suggestions?.length ?? 0})
          </Button>
        )}
      </div>

      {!journalId && (
        <p className="text-muted-foreground py-10 text-center">
          Select a journal to start reconciling.
        </p>
      )}

      {journalId && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {/* Left Panel — Statement Lines */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">
                Unreconciled Statement Lines
                {statementLines && (
                  <Badge variant="outline" className="ml-2">
                    {statementLines.length}
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {stLoading ? (
                <p className="text-muted-foreground text-sm">Loading...</p>
              ) : !statementLines || statementLines.length === 0 ? (
                <p className="text-muted-foreground text-sm">
                  No unreconciled statement lines.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-8" />
                      <TableHead>Date</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {statementLines.map((line: any) => {
                      const hasSuggestion = suggestionMap.has(line.id);
                      return (
                        <TableRow
                          key={line.id}
                          className={hasSuggestion ? "bg-green-50 dark:bg-green-950/20" : ""}
                        >
                          <TableCell>
                            <Checkbox
                              checked={selectedStatementLines.includes(line.id)}
                              onCheckedChange={() => toggleStatementLine(line.id)}
                            />
                          </TableCell>
                          <TableCell className="text-xs">
                            {new Date(line.date).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">{line.name}</div>
                            {line.ref && (
                              <div className="text-muted-foreground text-xs">
                                {line.ref}
                              </div>
                            )}
                          </TableCell>
                          <TableCell
                            className={`text-right font-mono ${Number(line.amount) >= 0 ? "text-green-600" : "text-red-600"}`}
                          >
                            {Number(line.amount).toFixed(2)}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Right Panel — Journal Items */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">
                Unreconciled Journal Items
                {journalItems && (
                  <Badge variant="outline" className="ml-2">
                    {journalItems.length}
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {jiLoading ? (
                <p className="text-muted-foreground text-sm">Loading...</p>
              ) : !journalItems || journalItems.length === 0 ? (
                <p className="text-muted-foreground text-sm">
                  No unreconciled journal items.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-8" />
                      <TableHead>Date</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-right">Debit</TableHead>
                      <TableHead className="text-right">Credit</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {journalItems.map((item: any) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          <Checkbox
                            checked={selectedJournalItems.includes(item.id)}
                            onCheckedChange={() => toggleJournalItem(item.id)}
                          />
                        </TableCell>
                        <TableCell className="text-xs">
                          {item.move?.date
                            ? new Date(item.move.date).toLocaleDateString()
                            : "—"}
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {item.move?.name ?? "—"}
                          </div>
                          <div className="text-muted-foreground text-xs">
                            {item.name ?? item.move?.ref ?? ""}
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {Number(item.debit) > 0
                            ? Number(item.debit).toFixed(2)
                            : "—"}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {Number(item.credit) > 0
                            ? Number(item.credit).toFixed(2)
                            : "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Bottom Bar */}
      {journalId && (selectedStatementLines.length > 0 || selectedJournalItems.length > 0) && (
        <Card>
          <CardContent className="flex items-center gap-6 pt-6">
            <div className="flex-1 grid grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Statement Total:</span>
                <span className="ml-2 font-mono font-bold">
                  {selectedStTotal.toFixed(2)}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Journal Total:</span>
                <span className="ml-2 font-mono font-bold">
                  {selectedJiTotal.toFixed(2)}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Difference:</span>
                <span
                  className={`ml-2 font-mono font-bold ${Math.abs(difference) > 0.01 ? "text-destructive" : "text-green-600"}`}
                >
                  {difference.toFixed(2)}
                </span>
              </div>
            </div>

            {Math.abs(difference) > 0.01 && (
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  step="0.01"
                  placeholder="Write-off"
                  className="w-28"
                  value={writeOffAmount || ""}
                  onChange={(e) => setWriteOffAmount(parseFloat(e.target.value) || 0)}
                />
                <Select
                  onValueChange={setWriteOffAccountId}
                  value={writeOffAccountId}
                >
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Write-off account" />
                  </SelectTrigger>
                  <SelectContent>
                    {((accounts as any)?.items ?? accounts ?? []).map((a: any) => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.code} — {a.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <Button
              onClick={handleReconcile}
              disabled={
                reconcileMutation.isPending ||
                selectedStatementLines.length === 0 ||
                selectedJournalItems.length === 0 ||
                (Math.abs(difference) > 0.01 && !writeOffAccountId)
              }
            >
              {reconcileMutation.isPending ? "Reconciling..." : "Reconcile"}
            </Button>
          </CardContent>

          {reconcileMutation.isError && (
            <div className="px-6 pb-4">
              <p className="text-sm text-destructive">
                {reconcileMutation.error.message}
              </p>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
