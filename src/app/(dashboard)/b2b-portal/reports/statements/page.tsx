"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { FileDown, Search } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import {
  DataTable,
  DataTableColumnHeader,
} from "@/components/shared/data-table";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc";

type StatementRow = {
  createdAt: Date;
  type: string;
  amount: unknown;
  reference: string | null;
  runningBalance: unknown;
  booking: { id: string; code: string } | null;
  notes: string | null;
};

const columns: ColumnDef<StatementRow>[] = [
  {
    id: "date",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Date" />,
    accessorFn: (row) => new Date(row.createdAt).getTime(),
    cell: ({ row }) => new Date(row.original.createdAt).toLocaleDateString(),
  },
  {
    id: "description",
    header: "Description / Reference",
    cell: ({ row }) => (
      <div>
        <span className="font-medium">{row.original.type}</span>
        {row.original.booking && (
          <span className="ml-2 text-xs text-muted-foreground">({row.original.booking.code})</span>
        )}
        {row.original.reference && (
          <span className="ml-2 text-xs text-muted-foreground">Ref: {row.original.reference}</span>
        )}
      </div>
    ),
  },
  {
    id: "debit",
    header: "Debit",
    cell: ({ row }) => {
      const val = Number(row.original.amount ?? 0);
      return val < 0 ? (
        <span className="text-red-600">${Math.abs(val).toLocaleString()}</span>
      ) : (
        "—"
      );
    },
  },
  {
    id: "credit",
    header: "Credit",
    cell: ({ row }) => {
      const val = Number(row.original.amount ?? 0);
      return val > 0 ? (
        <span className="text-green-600">${val.toLocaleString()}</span>
      ) : (
        "—"
      );
    },
  },
  {
    id: "runningBalance",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Running Balance" />,
    cell: ({ row }) => (
      <span className="font-medium">
        ${Number(row.original.runningBalance ?? 0).toLocaleString()}
      </span>
    ),
  },
];

export default function StatementsPage() {
  const { data: toList } = trpc.b2bPortal.tourOperator.list.useQuery();

  const [tourOperatorId, setTourOperatorId] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const enabled = !!tourOperatorId && !!dateFrom && !!dateTo;

  const { data, isLoading } = trpc.b2bPortal.reports.statement.useQuery(
    {
      tourOperatorId,
      dateFrom: new Date(dateFrom),
      dateTo: new Date(dateTo),
    },
    { enabled }
  );

  const selectedPartner = (toList ?? []).find(
    (to: { id: string; name: string }) => to.id === tourOperatorId
  ) as { id: string; name: string } | undefined;

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Partner Statements</h1>
        <p className="text-muted-foreground">Generate account statements for partners</p>
      </div>

      {/* Form */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid gap-4 md:grid-cols-4 items-end">
            <div>
              <Label>Tour Operator *</Label>
              <Select value={tourOperatorId || "none"} onValueChange={(v) => setTourOperatorId(v === "none" ? "" : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select partner" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none" disabled>Select partner</SelectItem>
                  {(toList ?? []).map((to: { id: string; name: string }) => (
                    <SelectItem key={to.id} value={to.id}>{to.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Date From *</Label>
              <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} required />
            </div>
            <div>
              <Label>Date To *</Label>
              <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} required />
            </div>
            <div>
              <Button disabled={!enabled} className="w-full">
                <Search className="mr-2 h-4 w-4" />
                Generate
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Statement Display */}
      {enabled && isLoading && (
        <div className="space-y-4">
          <Card>
            <CardHeader><Skeleton className="h-6 w-48" /></CardHeader>
            <CardContent><Skeleton className="h-4 w-32" /></CardContent>
          </Card>
          <div className="overflow-hidden rounded-lg border shadow-sm">
            <div className="bg-primary h-10" />
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 border-b px-4 py-3">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-24" />
              </div>
            ))}
          </div>
        </div>
      )}

      {enabled && !isLoading && data && (
        <>
          {/* Statement Header */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">
                    Statement: {selectedPartner?.name ?? "Partner"}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    Period: {new Date(dateFrom).toLocaleDateString()} — {new Date(dateTo).toLocaleDateString()}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => toast.info("PDF export coming soon")}
                >
                  <FileDown className="mr-1 h-4 w-4" /> Export PDF
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex gap-8">
                <div>
                  <p className="text-sm text-muted-foreground">Opening Balance</p>
                  <p className="text-xl font-bold">
                    ${Number(data.openingBalance ?? 0).toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Closing Balance</p>
                  <p className="text-xl font-bold">
                    ${Number(data.closingBalance ?? 0).toLocaleString()}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Statement Lines */}
          <DataTable
            columns={columns}
            data={(data.transactions ?? []) as StatementRow[]}
            searchKey="type"
            searchPlaceholder="Search transactions..."
          />

          {/* Footer */}
          <Card>
            <CardContent className="py-4">
              <div className="flex justify-end">
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Closing Balance</p>
                  <p className="text-2xl font-bold">
                    ${Number(data.closingBalance ?? 0).toLocaleString()}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {enabled && !isLoading && !data && (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            No statement data found for the selected criteria.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
