"use client";

import { format } from "date-fns";
import { useRouter } from "next/navigation";
import { useState } from "react";

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
import { trpc } from "@/lib/trpc";

type GroupBy = "hotel" | "status" | "currency";

export default function ContractSummaryPage() {
  const router = useRouter();
  const [groupBy, setGroupBy] = useState<GroupBy>("hotel");
  const { data, isLoading } =
    trpc.contracting.reports.contractSummary.useQuery({ groupBy });

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
