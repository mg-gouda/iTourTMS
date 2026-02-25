"use client";

import { format } from "date-fns";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { FileDown, FileSpreadsheet } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  CONTRACT_STATUS_LABELS,
  CONTRACT_STATUS_VARIANTS,
} from "@/lib/constants/contracting";
import { exportReportToExcel } from "@/lib/export/report-excel";
import { exportReportToPdf } from "@/lib/export/report-pdf";
import { trpc } from "@/lib/trpc";

type GroupBy = "hotel" | "status" | "currency";

export default function ContractSummaryPage() {
  const router = useRouter();
  const [groupBy, setGroupBy] = useState<GroupBy>("hotel");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const { data: rawData, isLoading } =
    trpc.contracting.reports.contractSummary.useQuery({ groupBy });

  // Client-side status filter
  const data = useMemo(() => {
    if (!rawData || statusFilter === "ALL") return rawData;
    return rawData
      .map((g) => ({
        ...g,
        contracts: g.contracts.filter((c) => c.status === statusFilter),
        contractCount: g.contracts.filter((c) => c.status === statusFilter).length,
      }))
      .filter((g) => g.contractCount > 0);
  }, [rawData, statusFilter]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="page-header">
          <h1 className="text-2xl font-bold tracking-tight">
            Contract Summary
          </h1>
          <p className="text-muted-foreground">
            Aggregated view of all contracts
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Status</SelectItem>
              <SelectItem value="DRAFT">Draft</SelectItem>
              <SelectItem value="POSTED">Posted</SelectItem>
              <SelectItem value="PUBLISHED">Published</SelectItem>
            </SelectContent>
          </Select>
          <span className="text-sm text-muted-foreground">Group by:</span>
          <Select
            value={groupBy}
            onValueChange={(v) => setGroupBy(v as GroupBy)}
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="hotel">Hotel</SelectItem>
              <SelectItem value="status">Status</SelectItem>
              <SelectItem value="currency">Currency</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="sm"
            disabled={!data || data.length === 0}
            onClick={() => {
              const allContracts = (data ?? []).flatMap((g) => g.contracts);
              exportReportToPdf({
                title: "Contract Summary",
                subtitle: `Grouped by ${groupBy}`,
                headers: ["Contract", "Code", "Hotel", "Currency", "Valid From", "Valid To", "Seasons", "Rooms", "Status"],
                rows: allContracts.map((c) => [
                  c.name, c.code, c.hotelName, c.currencyCode,
                  format(new Date(c.validFrom), "dd MMM yyyy"),
                  format(new Date(c.validTo), "dd MMM yyyy"),
                  String(c.seasonCount), String(c.roomTypeCount), c.status,
                ]),
              });
              toast.success("PDF downloaded");
            }}
          >
            <FileDown className="mr-1 size-4" /> PDF
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={!data || data.length === 0}
            onClick={async () => {
              const allContracts = (data ?? []).flatMap((g) => g.contracts);
              await exportReportToExcel({
                title: "Contract_Summary",
                headers: ["Contract", "Code", "Hotel", "Currency", "Valid From", "Valid To", "Seasons", "Rooms", "Status"],
                rows: allContracts.map((c) => [
                  c.name, c.code, c.hotelName, c.currencyCode,
                  format(new Date(c.validFrom), "dd MMM yyyy"),
                  format(new Date(c.validTo), "dd MMM yyyy"),
                  c.seasonCount, c.roomTypeCount, c.status,
                ]),
                columnWidths: [24, 12, 22, 10, 14, 14, 8, 8, 12],
              });
              toast.success("Excel downloaded");
            }}
          >
            <FileSpreadsheet className="mr-1 size-4" /> Excel
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {(data ?? []).map((group) => (
            <Card key={group.groupKey}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">
                    {group.groupLabel}
                  </CardTitle>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span>
                      {group.contractCount} contract
                      {group.contractCount !== 1 ? "s" : ""}
                    </span>
                    <span>Avg {group.avgSeasons} seasons</span>
                    <span>Avg {group.avgRoomTypes} room types</span>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Contract</TableHead>
                      <TableHead>Hotel</TableHead>
                      <TableHead>Currency</TableHead>
                      <TableHead>Period</TableHead>
                      <TableHead>Seasons</TableHead>
                      <TableHead>Rooms</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {group.contracts.map((c) => (
                      <TableRow
                        key={c.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() =>
                          router.push(`/contracting/contracts/${c.id}`)
                        }
                      >
                        <TableCell>
                          <span className="font-medium">{c.name}</span>
                          <span className="ml-2 font-mono text-xs text-muted-foreground">
                            {c.code}
                          </span>
                        </TableCell>
                        <TableCell>{c.hotelName}</TableCell>
                        <TableCell className="font-mono">
                          {c.currencyCode}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {format(new Date(c.validFrom), "dd MMM yy")} —{" "}
                          {format(new Date(c.validTo), "dd MMM yy")}
                        </TableCell>
                        <TableCell>{c.seasonCount}</TableCell>
                        <TableCell>{c.roomTypeCount}</TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              (CONTRACT_STATUS_VARIANTS[c.status] as
                                | "default"
                                | "secondary"
                                | "outline"
                                | "destructive") ?? "secondary"
                            }
                          >
                            {CONTRACT_STATUS_LABELS[c.status] ?? c.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ))}

          {(data ?? []).length === 0 && (
            <p className="text-center text-sm text-muted-foreground py-10">
              No contracts found.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
