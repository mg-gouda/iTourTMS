"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Plus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/shared/data-table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { TT_JOB_STATUS_LABELS, TT_JOB_STATUS_VARIANTS, TT_SERVICE_TYPE_LABELS } from "@/lib/constants/traffic";
import { trpc } from "@/lib/trpc";

type Job = {
  id: string;
  code: string;
  serviceType: string;
  status: string;
  serviceDate: string | Date;
  pickupTime: string | null;
  paxCount: number;
  leadPassenger: string | null;
  vehicleType: { name: string } | null;
  partner: { name: string } | null;
  pickupAirport: { code: string } | null;
  pickupHotel: { name: string } | null;
  dropoffAirport: { code: string } | null;
  dropoffHotel: { name: string } | null;
  flight: { flightNumber: string } | null;
  booking: {
    id: string;
    code: string;
    arrivalFlightNo: string | null;
    arrivalTime: string | null;
    arrivalOriginApt: string | null;
    arrivalDestApt: string | null;
    arrivalTerminal: string | null;
    departFlightNo: string | null;
    departTime: string | null;
    departOriginApt: string | null;
    departDestApt: string | null;
    departTerminal: string | null;
    hotel: { name: string };
  } | null;
  _count: { assignments: number };
};

const columns: ColumnDef<Job>[] = [
  { accessorKey: "code", header: "Code", cell: ({ row }) => <span className="font-mono">{row.original.code}</span> },
  {
    id: "serviceType",
    header: "Service",
    accessorFn: (row) => row.serviceType,
    cell: ({ row }) => TT_SERVICE_TYPE_LABELS[row.original.serviceType] ?? row.original.serviceType,
  },
  {
    id: "status",
    header: "Status",
    accessorFn: (row) => row.status,
    cell: ({ row }) => (
      <Badge variant={(TT_JOB_STATUS_VARIANTS[row.original.status] ?? "secondary") as never}>
        {TT_JOB_STATUS_LABELS[row.original.status] ?? row.original.status}
      </Badge>
    ),
  },
  {
    id: "serviceDate",
    header: "Date",
    accessorFn: (row) => row.serviceDate,
    cell: ({ row }) => new Date(row.original.serviceDate).toLocaleDateString(),
  },
  { accessorKey: "pickupTime", header: "Pickup" },
  { id: "pax", header: "Pax", accessorFn: (row) => row.paxCount },
  { id: "passenger", header: "Lead Passenger", accessorFn: (row) => row.leadPassenger ?? "—" },
  { id: "vehicle", header: "Vehicle Type", accessorFn: (row) => row.vehicleType?.name ?? "—" },
  { id: "partner", header: "Partner", accessorFn: (row) => row.partner?.name ?? "—" },
  {
    id: "pickup",
    header: "Pickup",
    accessorFn: (row) => row.pickupAirport?.code ?? row.pickupHotel?.name ?? "—",
  },
  {
    id: "dropoff",
    header: "Dropoff",
    accessorFn: (row) => row.dropoffAirport?.code ?? row.dropoffHotel?.name ?? "—",
  },
  {
    id: "booking",
    header: "Booking",
    accessorFn: (row) => row.booking?.code ?? "",
    cell: ({ row }) => {
      const b = row.original.booking;
      if (!b) return <span className="text-muted-foreground">—</span>;
      return (
        <div>
          <span className="font-mono text-xs">{b.code}</span>
          <span className="block text-xs text-muted-foreground">{b.hotel?.name}</span>
        </div>
      );
    },
  },
  {
    id: "arrFlight",
    header: "Arr Flight",
    accessorFn: (row) => row.booking?.arrivalFlightNo ?? "",
    cell: ({ row }) => {
      const b = row.original.booking;
      if (b?.arrivalFlightNo) {
        return (
          <div className="text-xs leading-tight">
            <span className="font-semibold">{b.arrivalFlightNo}</span>
            {b.arrivalTime && <span className="ml-1 text-muted-foreground">{b.arrivalTime}</span>}
            {(b.arrivalOriginApt || b.arrivalDestApt) && (
              <span className="block text-muted-foreground">
                {b.arrivalOriginApt ?? "?"} → {b.arrivalDestApt ?? "?"}
                {b.arrivalTerminal && ` T${b.arrivalTerminal}`}
              </span>
            )}
          </div>
        );
      }
      return <span className="text-muted-foreground">—</span>;
    },
  },
  {
    id: "depFlight",
    header: "Dep Flight",
    accessorFn: (row) => row.booking?.departFlightNo ?? "",
    cell: ({ row }) => {
      const b = row.original.booking;
      if (b?.departFlightNo) {
        return (
          <div className="text-xs leading-tight">
            <span className="font-semibold">{b.departFlightNo}</span>
            {b.departTime && <span className="ml-1 text-muted-foreground">{b.departTime}</span>}
            {(b.departOriginApt || b.departDestApt) && (
              <span className="block text-muted-foreground">
                {b.departOriginApt ?? "?"} → {b.departDestApt ?? "?"}
                {b.departTerminal && ` T${b.departTerminal}`}
              </span>
            )}
          </div>
        );
      }
      // Fallback to standalone flight if no booking
      const f = row.original.flight;
      if (!row.original.booking && f?.flightNumber) {
        return <span className="text-xs">{f.flightNumber}</span>;
      }
      return <span className="text-muted-foreground">—</span>;
    },
  },
];

export default function TrafficJobsPage() {
  const router = useRouter();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [serviceTypeFilter, setServiceTypeFilter] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");

  const { data: jobs, isLoading } = trpc.traffic.trafficJob.list.useQuery(
    {
      ...(statusFilter !== "all" ? { status: statusFilter } : {}),
      ...(serviceTypeFilter !== "all" ? { serviceType: serviceTypeFilter } : {}),
      ...(dateFrom ? { dateFrom: new Date(dateFrom) } : {}),
      ...(dateTo ? { dateTo: new Date(dateTo + "T23:59:59") } : {}),
    },
  );

  return (
    <div className="animate-fade-in space-y-6">
      <div className="page-header flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Traffic Jobs</h1>
          <p className="text-muted-foreground">Manage transport jobs and assignments</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            disabled={!data?.items?.length}
            onClick={async () => {
              const { exportTrafficJobsToExcel } = await import("@/lib/export/traffic-jobs-excel");
              await exportTrafficJobsToExcel(data?.items ?? []);
            }}
          >
            Export Excel
          </Button>
          <Button asChild>
            <Link href="/traffic/jobs/new">
              <Plus className="mr-2 h-4 w-4" />
              New Job
            </Link>
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">From</Label>
          <Input type="date" className="w-[150px]" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">To</Label>
          <Input type="date" className="w-[150px]" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {Object.entries(TT_JOB_STATUS_LABELS).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={serviceTypeFilter} onValueChange={setServiceTypeFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Service Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Services</SelectItem>
            {Object.entries(TT_SERVICE_TYPE_LABELS).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {(dateFrom || dateTo || statusFilter !== "all" || serviceTypeFilter !== "all") && (
          <Button variant="ghost" size="sm" onClick={() => { setDateFrom(""); setDateTo(""); setStatusFilter("all"); setServiceTypeFilter("all"); }}>
            Clear
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={(jobs ?? []) as Job[]}
          onRowClick={(row) => router.push(`/traffic/jobs/${row.id}`)}
        />
      )}
    </div>
  );
}
