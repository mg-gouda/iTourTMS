"use client";

import { format } from "date-fns";
import { AlertTriangle, Calendar, CheckCircle2, Clock, XCircle } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { trpc } from "@/lib/trpc";
import { useState } from "react";

const TYPE_LABELS: Record<string, string> = {
  OPTION_EXPIRY: "Option Expiry",
  DEPOSIT_DUE: "Deposit Due",
  BALANCE_DUE: "Balance Due",
  ROOMING_LIST: "Rooming List",
  FREE_CANCELLATION: "Free Cancellation",
  NAME_CHANGE: "Name Change",
  RECONFIRMATION: "Reconfirmation",
  SUPPLIER_PAYMENT: "Supplier Payment",
  ALLOTMENT_RELEASE: "Allotment Release",
};

const STATUS_VARIANTS: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  UPCOMING: "default",
  WARNING: "secondary",
  OVERDUE: "destructive",
  COMPLETED: "outline",
  WAIVED: "outline",
};

export default function DeadlinesPage() {
  const [days, setDays] = useState(14);
  const utils = trpc.useUtils();

  const { data: deadlines, isLoading } = trpc.reservations.deadline.dashboard.useQuery({
    days,
  });

  const completeMutation = trpc.reservations.deadline.complete.useMutation({
    onSuccess: () => utils.reservations.deadline.dashboard.invalidate(),
  });
  const waiveMutation = trpc.reservations.deadline.waive.useMutation({
    onSuccess: () => utils.reservations.deadline.dashboard.invalidate(),
  });

  // Compute status based on dueDate
  function getDisplayStatus(dl: { status: string; dueDate: Date | string }) {
    if (dl.status === "COMPLETED" || dl.status === "WAIVED") return dl.status;
    const due = new Date(dl.dueDate);
    const now = new Date();
    const diffDays = Math.ceil((due.getTime() - now.getTime()) / 86_400_000);
    if (diffDays < 0) return "OVERDUE";
    if (diffDays <= 3) return "WARNING";
    return "UPCOMING";
  }

  // KPI counts
  const overdue = deadlines?.filter((d) => getDisplayStatus(d) === "OVERDUE").length ?? 0;
  const warning = deadlines?.filter((d) => getDisplayStatus(d) === "WARNING").length ?? 0;
  const upcoming = deadlines?.filter((d) => getDisplayStatus(d) === "UPCOMING").length ?? 0;

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Deadlines Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Track option expiry, payment due dates, and other booking deadlines
          </p>
        </div>
        <Select value={String(days)} onValueChange={(v) => setDays(Number(v))}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Next 7 days</SelectItem>
            <SelectItem value="14">Next 14 days</SelectItem>
            <SelectItem value="30">Next 30 days</SelectItem>
            <SelectItem value="60">Next 60 days</SelectItem>
            <SelectItem value="90">Next 90 days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Overdue</CardTitle>
            <XCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{overdue}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Warning (3 days)</CardTitle>
            <AlertTriangle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-500">{warning}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Upcoming</CardTitle>
            <Clock className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-500">{upcoming}</div>
          </CardContent>
        </Card>
      </div>

      {/* Deadlines Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-2 p-6">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : !deadlines?.length ? (
            <div className="p-6 text-center text-muted-foreground">
              No deadlines in the next {days} days.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Status</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Booking</TableHead>
                  <TableHead>Hotel</TableHead>
                  <TableHead>Guest</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {deadlines.map((dl) => {
                  const status = getDisplayStatus(dl);
                  return (
                    <TableRow key={dl.id}>
                      <TableCell>
                        <Badge variant={STATUS_VARIANTS[status] ?? "default"}>
                          {status}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">
                        {TYPE_LABELS[dl.type] ?? dl.type}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                          {format(new Date(dl.dueDate), "dd MMM yyyy")}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Link
                          href={`/reservations/bookings/${dl.booking.id}`}
                          className="font-mono text-sm text-primary hover:underline"
                        >
                          {dl.booking.code}
                        </Link>
                      </TableCell>
                      <TableCell>{dl.booking.hotel?.name ?? "—"}</TableCell>
                      <TableCell>{dl.booking.leadGuestName ?? "—"}</TableCell>
                      <TableCell className="max-w-[200px] truncate text-sm text-muted-foreground">
                        {dl.description ?? "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        {status !== "COMPLETED" && status !== "WAIVED" && (
                          <div className="flex justify-end gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => completeMutation.mutate({ id: dl.id })}
                              disabled={completeMutation.isPending}
                            >
                              <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
                              Done
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => waiveMutation.mutate({ id: dl.id })}
                              disabled={waiveMutation.isPending}
                            >
                              Waive
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
