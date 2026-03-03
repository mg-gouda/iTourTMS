"use client";

import type { ColumnDef, RowSelectionState } from "@tanstack/react-table";
import { FileDown, FileSpreadsheet, Plus, RefreshCw, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import {
  DataTable,
  DataTableColumnHeader,
} from "@/components/shared/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

type TariffRow = {
  id: string;
  name: string;
  currencyCode: string;
  generatedAt: Date;
  data: Record<string, unknown>;
  contract: { id: string; name: string; code: string };
  tourOperator: { id: string; name: string; code: string };
  markupRule: { id: string; name: string; markupType: string; value: { toString(): string } } | null;
};

const columns: ColumnDef<TariffRow>[] = [
  {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && "indeterminate")
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
        onClick={(e) => e.stopPropagation()}
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "name",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Name" />
    ),
    cell: ({ row }) => (
      <span className="font-medium">{row.original.name}</span>
    ),
  },
  {
    id: "contract",
    header: "Contract",
    cell: ({ row }) => (
      <span>
        {row.original.contract.name}{" "}
        <span className="font-mono text-xs text-muted-foreground">
          ({row.original.contract.code})
        </span>
      </span>
    ),
  },
  {
    id: "tourOperator",
    header: "Tour Operator",
    cell: ({ row }) => row.original.tourOperator.name,
  },
  {
    id: "markup",
    header: "Markup",
    cell: ({ row }) => {
      if (!row.original.markupRule) return <span className="text-muted-foreground">None</span>;
      const r = row.original.markupRule;
      const val = parseFloat(r.value.toString());
      return (
        <Badge variant="outline">
          {r.markupType === "PERCENTAGE" ? `${val}%` : val.toFixed(2)} {r.name}
        </Badge>
      );
    },
  },
  {
    accessorKey: "currencyCode",
    header: "Currency",
    cell: ({ row }) => (
      <Badge variant="secondary">{row.original.currencyCode}</Badge>
    ),
  },
  {
    id: "generatedAt",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Generated" />
    ),
    accessorFn: (row) => row.generatedAt,
    cell: ({ row }) =>
      new Date(row.original.generatedAt).toLocaleDateString(),
  },
];

export default function TariffsPage() {
  const router = useRouter();
  const utils = trpc.useUtils();
  const { data, isLoading } = trpc.contracting.tariff.list.useQuery();
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);

  const regenerateMutation = trpc.contracting.tariff.regenerate.useMutation({
    onSuccess: () => {
      utils.contracting.tariff.list.invalidate();
      toast.success("Tariff regenerated");
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  const deleteMutation = trpc.contracting.tariff.delete.useMutation({
    onSuccess: () => {
      utils.contracting.tariff.list.invalidate();
      toast.success("Tariff deleted");
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  const deleteBulkMutation = trpc.contracting.tariff.deleteBulk.useMutation({
    onSuccess: (result) => {
      utils.contracting.tariff.list.invalidate();
      setRowSelection({});
      setBulkDeleteOpen(false);
      toast.success(`Deleted ${result.count} tariff${result.count !== 1 ? "s" : ""}`);
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  const allData = (data ?? []) as TariffRow[];

  // Get selected row data
  const selectedIds = Object.keys(rowSelection)
    .filter((k) => rowSelection[k])
    .map((idx) => allData[Number(idx)]?.id)
    .filter(Boolean) as string[];

  const handleBulkDelete = () => {
    if (selectedIds.length === 0) return;
    deleteBulkMutation.mutate({ ids: selectedIds });
  };

  const handleBulkPdfExport = async () => {
    toast.info("Generating PDF bundle...");
    try {
      const res = await fetch("/api/export/tariff-pdf-bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: selectedIds }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Download failed" }));
        throw new Error(err.error ?? "Download failed");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = res.headers.get("Content-Disposition")
        ?.match(/filename="(.+)"/)?.[1] ?? "Tariffs.zip";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success(`Downloaded ${selectedIds.length} PDF(s) as ZIP`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "PDF export failed");
    }
  };

  const handleBulkExcelExport = async () => {
    const { exportTariffToExcel } = await import("@/lib/export/tariff-excel");
    const selectedTariffs = selectedIds
      .map((id) => allData.find((t) => t.id === id))
      .filter(Boolean);
    for (const tariff of selectedTariffs) {
      if (!tariff) continue;
      const stored = tariff.data ?? {};
      await exportTariffToExcel({
        tariffName: tariff.name,
        contractName: tariff.contract.name,
        contractCode: tariff.contract.code,
        hotelName: (stored as any).hotelName ?? "",
        tourOperatorName: tariff.tourOperator.name,
        tourOperatorCode: tariff.tourOperator.code,
        markupRuleName: tariff.markupRule?.name ?? null,
        markupType: tariff.markupRule?.markupType,
        markupValue: tariff.markupRule ? Number(tariff.markupRule.value) : undefined,
        currencyCode: tariff.currencyCode,
        rateBasis: (stored as any).rateBasis ?? "PER_PERSON",
        generatedAt: new Date(tariff.generatedAt).toISOString(),
        rates: (stored as any).rates ?? [],
      });
    }
    toast.success(`Exported ${selectedTariffs.length} Excel file(s)`);
  };

  const actionColumn: ColumnDef<TariffRow> = {
    id: "actions",
    cell: ({ row }) => (
      <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
        <Button
          variant="ghost"
          size="icon"
          className="size-8"
          title="Download PDF"
          onClick={() => window.open(`/api/export/tariff-pdf/${row.original.id}`, "_blank")}
        >
          <FileDown className="size-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="size-8"
          title="Download Excel"
          onClick={async () => {
            const { exportTariffToExcel } = await import("@/lib/export/tariff-excel");
            const stored = row.original.data ?? {};
            await exportTariffToExcel({
              tariffName: row.original.name,
              contractName: row.original.contract.name,
              contractCode: row.original.contract.code,
              hotelName: (stored as any).hotelName ?? "",
              tourOperatorName: row.original.tourOperator.name,
              tourOperatorCode: row.original.tourOperator.code,
              markupRuleName: row.original.markupRule?.name ?? null,
              markupType: row.original.markupRule?.markupType,
              markupValue: row.original.markupRule ? Number(row.original.markupRule.value) : undefined,
              currencyCode: row.original.currencyCode,
              rateBasis: (stored as any).rateBasis ?? "PER_PERSON",
              generatedAt: new Date(row.original.generatedAt).toISOString(),
              rates: (stored as any).rates ?? [],
            });
            toast.success("Excel downloaded");
          }}
        >
          <FileSpreadsheet className="size-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="size-8"
          title="Regenerate"
          onClick={() => regenerateMutation.mutate({ id: row.original.id })}
          disabled={regenerateMutation.isPending}
        >
          <RefreshCw className="size-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="size-8 text-destructive"
          title="Delete"
          onClick={() => deleteMutation.mutate({ id: row.original.id })}
          disabled={deleteMutation.isPending}
        >
          <Trash2 className="size-3.5" />
        </Button>
      </div>
    ),
  };

  // Bulk actions toolbar
  const bulkToolbar = selectedIds.length > 0 ? (
    <div className="flex items-center gap-2 ml-auto">
      <span className="text-sm text-muted-foreground">
        {selectedIds.length} selected
      </span>
      <Button
        variant="outline"
        size="sm"
        onClick={handleBulkPdfExport}
      >
        <FileDown className="mr-2 size-4" />
        PDF
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={handleBulkExcelExport}
      >
        <FileSpreadsheet className="mr-2 size-4" />
        Excel
      </Button>
      <Button
        variant="destructive"
        size="sm"
        onClick={() => setBulkDeleteOpen(true)}
      >
        <Trash2 className="mr-2 size-4" />
        Delete ({selectedIds.length})
      </Button>
    </div>
  ) : null;

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="page-header">
          <h1 className="text-2xl font-bold tracking-tight">Tariffs</h1>
          <p className="text-muted-foreground">
            Generated tariff sheets with markup applied for tour operators
          </p>
        </div>
        <Button asChild>
          <Link href="/contracting/tariffs/generate">
            <Plus className="mr-2 size-4" /> Generate Tariff
          </Link>
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-9 w-64" />
          <div className="overflow-hidden rounded-lg border shadow-sm">
            <div className="bg-primary h-10" />
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 border-b px-4 py-3">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-20" />
              </div>
            ))}
          </div>
        </div>
      ) : (
        <DataTable
          columns={[...columns, actionColumn]}
          data={allData}
          searchKey="name"
          searchPlaceholder="Search tariffs..."
          onRowClick={(row) => router.push(`/contracting/tariffs/${row.id}`)}
          enableRowSelection
          rowSelection={rowSelection}
          onRowSelectionChange={setRowSelection}
          toolbar={bulkToolbar}
        />
      )}

      <Dialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Tariffs</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete {selectedIds.length} tariff
              {selectedIds.length !== 1 ? "s" : ""}? This action cannot be
              undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkDeleteOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleBulkDelete}
              disabled={deleteBulkMutation.isPending}
            >
              {deleteBulkMutation.isPending
                ? "Deleting..."
                : `Delete ${selectedIds.length} Tariff${selectedIds.length !== 1 ? "s" : ""}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
