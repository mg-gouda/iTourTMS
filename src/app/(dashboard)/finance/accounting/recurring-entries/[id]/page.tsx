"use client";

import { Pause, Play, RotateCcw, Trash2 } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  RECURRING_FREQUENCY_LABELS,
  RECURRING_STATE_LABELS,
} from "@/lib/constants/finance";
import { trpc } from "@/lib/trpc";

const stateVariant: Record<string, "default" | "secondary" | "outline"> = {
  ACTIVE: "default",
  PAUSED: "secondary",
  DONE: "outline",
};

export default function RecurringEntryDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const utils = trpc.useUtils();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [generateAllDialogOpen, setGenerateAllDialogOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  const { data: entry, isLoading } =
    trpc.finance.recurringEntry.getById.useQuery({ id });

  const pauseMutation = trpc.finance.recurringEntry.pause.useMutation({
    onSuccess: () => utils.finance.recurringEntry.getById.invalidate({ id }),
  });

  const resumeMutation = trpc.finance.recurringEntry.resume.useMutation({
    onSuccess: () => utils.finance.recurringEntry.getById.invalidate({ id }),
  });

  const generateNextMutation =
    trpc.finance.recurringEntry.generateNext.useMutation({
      onSuccess: () => utils.finance.recurringEntry.getById.invalidate({ id }),
    });

  const generateAllMutation =
    trpc.finance.recurringEntry.generateAllDue.useMutation({
      onSuccess: () => {
        utils.finance.recurringEntry.list.invalidate();
        utils.finance.recurringEntry.getById.invalidate({ id });
        setGenerateAllDialogOpen(false);
      },
    });

  const updateMutation = trpc.finance.recurringEntry.update.useMutation({
    onSuccess: () => {
      toast.success("Recurring entry updated");
      utils.finance.recurringEntry.getById.invalidate({ id });
      setEditOpen(false);
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteMutation = trpc.finance.recurringEntry.delete.useMutation({
    onSuccess: () => {
      utils.finance.recurringEntry.list.invalidate();
      router.push("/finance/accounting/recurring-entries");
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        Loading...
      </div>
    );
  }
  if (!entry) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        Recurring entry not found
      </div>
    );
  }

  const isActive = entry.state === "ACTIVE";
  const isPaused = entry.state === "PAUSED";
  const isDone = entry.state === "DONE";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight">
              {entry.name}
            </h1>
            <Badge variant={stateVariant[entry.state] ?? "outline"}>
              {RECURRING_STATE_LABELS[entry.state] ?? entry.state}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            {RECURRING_FREQUENCY_LABELS[entry.frequency]} recurring entry
            {entry.ref && ` — ${entry.ref}`}
          </p>
        </div>

        <div className="flex gap-2">
          {isActive && (
            <>
              <Button
                onClick={() => generateNextMutation.mutate({ id })}
                disabled={generateNextMutation.isPending}
              >
                <RotateCcw className="mr-2 h-4 w-4" />
                {generateNextMutation.isPending
                  ? "Generating..."
                  : "Generate Next"}
              </Button>
              <Button
                variant="outline"
                onClick={() => setGenerateAllDialogOpen(true)}
              >
                Generate All Due
              </Button>
              <Button
                variant="secondary"
                onClick={() => pauseMutation.mutate({ id })}
                disabled={pauseMutation.isPending}
              >
                <Pause className="mr-2 h-4 w-4" />
                Pause
              </Button>
            </>
          )}
          {isPaused && (
            <Button
              onClick={() => resumeMutation.mutate({ id })}
              disabled={resumeMutation.isPending}
            >
              <Play className="mr-2 h-4 w-4" />
              Resume
            </Button>
          )}
          {!isDone && (
            <>
              <Button
                variant="outline"
                onClick={() => setEditOpen(true)}
              >
                Edit
              </Button>
              <Button
                variant="destructive"
                onClick={() => setDeleteDialogOpen(true)}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Success message from generate */}
      {generateNextMutation.data && (
        <div className="rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-800 dark:border-green-800 dark:bg-green-950 dark:text-green-200">
          Draft journal entry generated successfully.
        </div>
      )}
      {generateNextMutation.error && (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-200">
          {generateNextMutation.error.message}
        </div>
      )}

      {/* Details Card */}
      <div className="grid grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Journal</span>
              <span>
                {entry.journal
                  ? `${entry.journal.code} — ${entry.journal.name}`
                  : "—"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Partner</span>
              <span>{entry.partner?.name ?? "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Frequency</span>
              <span>
                {RECURRING_FREQUENCY_LABELS[entry.frequency] ??
                  entry.frequency}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Reference</span>
              <span>{entry.ref ?? "—"}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Schedule</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Next Run Date</span>
              <span>
                {new Date(entry.nextRunDate).toLocaleDateString()}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">End Date</span>
              <span>
                {entry.endDate
                  ? new Date(entry.endDate).toLocaleDateString()
                  : "No end date"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Last Run</span>
              <span>
                {entry.lastRunDate
                  ? new Date(entry.lastRunDate).toLocaleDateString()
                  : "Never"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total Generated</span>
              <span className="font-mono">{entry.totalGenerated}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Line Templates */}
      <Card>
        <CardHeader>
          <CardTitle>Line Templates</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Seq</TableHead>
                <TableHead>Account</TableHead>
                <TableHead>Label</TableHead>
                <TableHead className="text-right">Debit</TableHead>
                <TableHead className="text-right">Credit</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entry.lineTemplates.map((line: any) => (
                <TableRow key={line.id}>
                  <TableCell className="font-mono text-muted-foreground">
                    {line.sequence}
                  </TableCell>
                  <TableCell>
                    {line.account
                      ? `${line.account.code} — ${line.account.name}`
                      : line.accountId}
                  </TableCell>
                  <TableCell>{line.name ?? "—"}</TableCell>
                  <TableCell className="text-right font-mono">
                    {Number(line.debit).toFixed(2)}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {Number(line.credit).toFixed(2)}
                  </TableCell>
                </TableRow>
              ))}
              <TableRow className="font-medium">
                <TableCell colSpan={3} className="text-right">
                  Total
                </TableCell>
                <TableCell className="text-right font-mono">
                  {entry.lineTemplates
                    .reduce((s: number, l: any) => s + Number(l.debit), 0)
                    .toFixed(2)}
                </TableCell>
                <TableCell className="text-right font-mono">
                  {entry.lineTemplates
                    .reduce((s: number, l: any) => s + Number(l.credit), 0)
                    .toFixed(2)}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Delete Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Recurring Entry</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;{entry.name}&quot;? This
              action cannot be undone. Previously generated journal entries will
              not be affected.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteMutation.mutate({ id })}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Generate All Due Dialog */}
      <Dialog
        open={generateAllDialogOpen}
        onOpenChange={setGenerateAllDialogOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Generate All Due Entries</DialogTitle>
            <DialogDescription>
              This will generate draft journal entries for all active recurring
              templates that are due as of today. Continue?
            </DialogDescription>
          </DialogHeader>
          {generateAllMutation.data && (
            <p className="text-sm text-green-600">
              Generated {generateAllMutation.data.count} journal{" "}
              {generateAllMutation.data.count === 1 ? "entry" : "entries"}.
            </p>
          )}
          {generateAllMutation.error && (
            <p className="text-sm text-destructive">
              {generateAllMutation.error.message}
            </p>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setGenerateAllDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={() => generateAllMutation.mutate({})}
              disabled={generateAllMutation.isPending}
            >
              {generateAllMutation.isPending
                ? "Generating..."
                : "Generate All"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      {entry && (
        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Recurring Entry</DialogTitle>
            </DialogHeader>
            <RecurringEditForm
              entry={entry}
              onSave={(data) => updateMutation.mutate({ id, ...data })}
              isPending={updateMutation.isPending}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

function RecurringEditForm({
  entry,
  onSave,
  isPending,
}: {
  entry: { name: string; frequency: string; nextRunDate: string | Date | null; endDate: string | Date | null; ref: string | null };
  onSave: (data: Record<string, unknown>) => void;
  isPending: boolean;
}) {
  const [name, setName] = useState(entry.name);
  const [frequency, setFrequency] = useState(entry.frequency);
  const [nextRunDate, setNextRunDate] = useState(
    entry.nextRunDate ? new Date(entry.nextRunDate).toISOString().slice(0, 10) : "",
  );
  const [endDate, setEndDate] = useState(
    entry.endDate ? new Date(entry.endDate).toISOString().slice(0, 10) : "",
  );

  return (
    <div className="space-y-4">
      <div>
        <Label>Name</Label>
        <Input value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div>
        <Label>Frequency</Label>
        <Select value={frequency} onValueChange={setFrequency}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="MONTHLY">Monthly</SelectItem>
            <SelectItem value="QUARTERLY">Quarterly</SelectItem>
            <SelectItem value="YEARLY">Yearly</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label>Next Run Date</Label>
        <Input type="date" value={nextRunDate} onChange={(e) => setNextRunDate(e.target.value)} />
      </div>
      <div>
        <Label>End Date (optional)</Label>
        <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
      </div>
      <Button
        className="w-full"
        disabled={!name || isPending}
        onClick={() =>
          onSave({
            name,
            frequency,
            nextRunDate: nextRunDate ? new Date(nextRunDate) : undefined,
            endDate: endDate ? new Date(endDate) : null,
          })
        }
      >
        {isPending ? "Saving..." : "Save Changes"}
      </Button>
    </div>
  );
}
