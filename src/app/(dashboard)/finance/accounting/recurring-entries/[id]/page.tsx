"use client";

import { Pause, Play, RotateCcw, Trash2 } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { useTranslations } from "next-intl";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Combobox } from "@/components/ui/combobox";
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
import { PermissionGuard } from "@/components/shared/permission-guard";

const stateVariant: Record<string, "default" | "secondary" | "outline"> = {
  ACTIVE: "default",
  PAUSED: "secondary",
  DONE: "outline",
};

export default function RecurringEntryDetailPage() {
  const t = useTranslations("finance");
  const tc = useTranslations("common");
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
      toast.success(tc("updated"));
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
        {tc("loading")}
      </div>
    );
  }
  if (!entry) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        {t("recurringEntryNotFound")}
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
            {RECURRING_FREQUENCY_LABELS[entry.frequency]} {t("recurringEntryLabel")}
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
                  ? t("generating")
                  : t("generateNext")}
              </Button>
              <Button
                variant="outline"
                onClick={() => setGenerateAllDialogOpen(true)}
              >
                {t("generateAllDue")}
              </Button>
              <Button
                variant="secondary"
                onClick={() => pauseMutation.mutate({ id })}
                disabled={pauseMutation.isPending}
              >
                <Pause className="mr-2 h-4 w-4" />
                {t("pause")}
              </Button>
            </>
          )}
          {isPaused && (
            <Button
              onClick={() => resumeMutation.mutate({ id })}
              disabled={resumeMutation.isPending}
            >
              <Play className="mr-2 h-4 w-4" />
              {t("resume")}
            </Button>
          )}
          {!isDone && (
            <>
              <Button
                variant="outline"
                onClick={() => setEditOpen(true)}
              >
                {tc("edit")}
              </Button>
              <Button
                variant="destructive"
                onClick={() => setDeleteDialogOpen(true)}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                {tc("delete")}
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Success message from generate */}
      {generateNextMutation.data && (
        <div className="rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-800 dark:border-green-800 dark:bg-green-950 dark:text-green-200">
          {t("draftEntryGenerated")}
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
            <CardTitle>{tc("details")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t("journal")}</span>
              <span>
                {entry.journal
                  ? `${entry.journal.code} — ${entry.journal.name}`
                  : "—"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t("partner")}</span>
              <span>{entry.partner?.name ?? "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t("frequency")}</span>
              <span>
                {RECURRING_FREQUENCY_LABELS[entry.frequency] ??
                  entry.frequency}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t("reference")}</span>
              <span>{entry.ref ?? "—"}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("schedule")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t("nextRunDate")}</span>
              <span>
                {new Date(entry.nextRunDate).toLocaleDateString()}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t("endDate")}</span>
              <span>
                {entry.endDate
                  ? new Date(entry.endDate).toLocaleDateString()
                  : t("noEndDate")}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t("lastRun")}</span>
              <span>
                {entry.lastRunDate
                  ? new Date(entry.lastRunDate).toLocaleDateString()
                  : t("never")}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t("totalGenerated")}</span>
              <span className="font-mono">{entry.totalGenerated}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Line Templates */}
      <Card>
        <CardHeader>
          <CardTitle>{t("lineTemplates")}</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("seq")}</TableHead>
                <TableHead>{t("accountName")}</TableHead>
                <TableHead>{t("label")}</TableHead>
                <TableHead className="text-right">{t("debit")}</TableHead>
                <TableHead className="text-right">{t("credit")}</TableHead>
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
                  {tc("total")}
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
            <DialogTitle>{t("deleteRecurringEntry")}</DialogTitle>
            <DialogDescription>
              {tc("confirmDelete")} &quot;{entry.name}&quot;? {tc("confirmDeleteDesc")}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
            >
              {tc("cancel")}
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteMutation.mutate({ id })}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? tc("deleting") : tc("delete")}
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
            <DialogTitle>{t("generateAllDueEntries")}</DialogTitle>
            <DialogDescription>
              {t("generateAllDueDesc")}
            </DialogDescription>
          </DialogHeader>
          {generateAllMutation.data && (
            <p className="text-sm text-green-600">
              {t("generatedCount", { count: generateAllMutation.data.count })}
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
              {tc("cancel")}
            </Button>
            <Button
              onClick={() => generateAllMutation.mutate({})}
              disabled={generateAllMutation.isPending}
            >
              {generateAllMutation.isPending
                ? t("generating")
                : t("generateAllDue")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      {entry && (
        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("editRecurringEntry")}</DialogTitle>
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
  const t = useTranslations("finance");
  const tc = useTranslations("common");
  const [name, setName] = useState(entry.name);
  const [frequency, setFrequency] = useState(entry.frequency);
  const [nextRunDate, setNextRunDate] = useState(
    entry.nextRunDate ? new Date(entry.nextRunDate).toISOString().slice(0, 10) : "",
  );
  const [endDate, setEndDate] = useState(
    entry.endDate ? new Date(entry.endDate).toISOString().slice(0, 10) : "",
  );

  return (
    <PermissionGuard permission="finance:move:read">
    <div className="space-y-4">
      <div>
        <Label>{tc("name")}</Label>
        <Input value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div>
        <Label>{t("frequency")}</Label>
        <Combobox
          options={[
            { value: "MONTHLY", label: RECURRING_FREQUENCY_LABELS["MONTHLY"] ?? "Monthly" },
            { value: "QUARTERLY", label: RECURRING_FREQUENCY_LABELS["QUARTERLY"] ?? "Quarterly" },
            { value: "YEARLY", label: RECURRING_FREQUENCY_LABELS["YEARLY"] ?? "Yearly" },
          ]}
          value={frequency}
          onValueChange={setFrequency}
        />
      </div>
      <div>
        <Label>{t("nextRunDate")}</Label>
        <Input type="date" value={nextRunDate} onChange={(e) => setNextRunDate(e.target.value)} />
      </div>
      <div>
        <Label>{t("endDateOptional")}</Label>
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
        {isPending ? tc("saving") : tc("saveChanges")}
      </Button>
    </div>
    </PermissionGuard>
  );
}
