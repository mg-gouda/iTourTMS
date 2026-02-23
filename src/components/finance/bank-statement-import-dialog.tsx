"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { trpc } from "@/lib/trpc";

export function BankStatementImportDialog() {
  const router = useRouter();
  const utils = trpc.useUtils();
  const [open, setOpen] = useState(false);
  const [journalId, setJournalId] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [balanceStart, setBalanceStart] = useState(0);
  const [csvContent, setCsvContent] = useState("");
  const [fileName, setFileName] = useState("");
  const [preview, setPreview] = useState<string[]>([]);

  const { data: journals } = trpc.finance.journal.list.useQuery();
  const bankJournals = (journals ?? []).filter(
    (j: any) => j.type === "BANK" || j.type === "CASH",
  );

  const importMutation = trpc.finance.bankStatement.import.useMutation({
    onSuccess: (data) => {
      utils.finance.bankStatement.list.invalidate();
      setOpen(false);
      router.push(`/finance/banking/statements/${data.id}`);
    },
  });

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const content = ev.target?.result as string;
      setCsvContent(content);
      // Preview first 5 lines
      const lines = content.split("\n").filter((l) => l.trim());
      setPreview(lines.slice(0, 6));
    };
    reader.readAsText(file);
  }

  function handleImport() {
    if (!journalId || !csvContent) return;
    importMutation.mutate({
      journalId,
      date: new Date(date),
      balanceStart,
      csvContent,
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">Import CSV</Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Import Bank Statement</DialogTitle>
          <DialogDescription>
            Upload a CSV file with columns: date, description, amount, reference
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
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

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Statement Date</Label>
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
            <div>
              <Label>Opening Balance</Label>
              <Input
                type="number"
                step="0.01"
                value={balanceStart}
                onChange={(e) => setBalanceStart(parseFloat(e.target.value) || 0)}
              />
            </div>
          </div>

          <div>
            <Label>CSV File</Label>
            <Input
              type="file"
              accept=".csv"
              onChange={handleFileChange}
            />
            {fileName && (
              <p className="text-muted-foreground mt-1 text-xs">
                {fileName}
              </p>
            )}
          </div>

          {preview.length > 0 && (
            <div className="rounded border p-3">
              <p className="mb-2 text-xs font-semibold">Preview:</p>
              <div className="max-h-32 overflow-auto text-xs font-mono">
                {preview.map((line, i) => (
                  <div key={i} className={i === 0 ? "font-bold" : ""}>
                    {line}
                  </div>
                ))}
              </div>
            </div>
          )}

          {importMutation.isError && (
            <p className="text-sm text-destructive">
              {importMutation.error.message}
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleImport}
            disabled={!journalId || !csvContent || importMutation.isPending}
          >
            {importMutation.isPending ? "Importing..." : "Import"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
