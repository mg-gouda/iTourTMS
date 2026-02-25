"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { Plus, Users, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

type TORow = {
  id: string;
  name: string;
  code: string;
  contactPerson: string | null;
  email: string | null;
  active: boolean;
  country: { name: string } | null;
  market: { name: string } | null;
  _count: { contractAssignments: number; hotelAssignments: number };
};

const columns: ColumnDef<TORow>[] = [
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
    accessorKey: "code",
    header: "Code",
    cell: ({ row }) => (
      <span className="font-mono">{row.original.code}</span>
    ),
  },
  {
    id: "country",
    header: "Country",
    cell: ({ row }) => row.original.country?.name ?? "—",
  },
  {
    id: "market",
    header: "Market",
    cell: ({ row }) => row.original.market?.name ?? "—",
  },
  {
    id: "contracts",
    header: "Contracts",
    cell: ({ row }) => row.original._count.contractAssignments,
  },
  {
    id: "hotels",
    header: "Hotels",
    cell: ({ row }) => row.original._count.hotelAssignments,
  },
  {
    accessorKey: "active",
    header: "Status",
    cell: ({ row }) => (
      <Badge variant={row.original.active ? "default" : "secondary"}>
        {row.original.active ? "Active" : "Inactive"}
      </Badge>
    ),
  },
];

export default function TourOperatorsPage() {
  const router = useRouter();
  const utils = trpc.useUtils();
  const { data, isLoading } = trpc.contracting.tourOperator.list.useQuery();

  const [activeFilter, setActiveFilter] = useState("ALL");
  const [bulkOpen, setBulkOpen] = useState(false);
  const [selectedTOs, setSelectedTOs] = useState<string[]>([]);
  const [selectedHotels, setSelectedHotels] = useState<string[]>([]);
  const [cascade, setCascade] = useState(true);

  const { data: hotels } = trpc.contracting.hotel.list.useQuery(
    undefined,
    { enabled: bulkOpen },
  );

  const bulkMutation = trpc.contracting.tourOperator.bulkAssign.useMutation({
    onSuccess: (result) => {
      utils.contracting.tourOperator.list.invalidate();
      setBulkOpen(false);
      setSelectedTOs([]);
      setSelectedHotels([]);
      toast.success(
        `Created ${result.hotelAssigned} hotel assignment(s)${result.contractAssigned > 0 ? ` and ${result.contractAssigned} contract assignment(s)` : ""}`,
      );
    },
    onError: (err) => toast.error(err.message),
  });

  const filteredData = useMemo(() => {
    let result = (data ?? []) as TORow[];
    if (activeFilter !== "ALL") {
      result = result.filter((t) =>
        activeFilter === "ACTIVE" ? t.active : !t.active,
      );
    }
    return result;
  }, [data, activeFilter]);

  const hasFilters = activeFilter !== "ALL";

  const filterToolbar = (
    <div className="flex items-center gap-2">
      <Select value={activeFilter} onValueChange={setActiveFilter}>
        <SelectTrigger className="h-9 w-[120px]">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">All Status</SelectItem>
          <SelectItem value="ACTIVE">Active</SelectItem>
          <SelectItem value="INACTIVE">Inactive</SelectItem>
        </SelectContent>
      </Select>

      {hasFilters && (
        <Button variant="ghost" size="sm" onClick={() => setActiveFilter("ALL")}>
          <X className="mr-1 h-3 w-3" />
          Clear
        </Button>
      )}
    </div>
  );

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="page-header">
          <h1 className="text-2xl font-bold tracking-tight">Tour Operators</h1>
          <p className="text-muted-foreground">
            Manage tour operators and their contract/hotel assignments
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setBulkOpen(true)}>
            <Users className="mr-2 size-4" /> Bulk Assign
          </Button>
          <Button asChild>
            <Link href="/contracting/tour-operators/new">
              <Plus className="mr-2 size-4" /> New Tour Operator
            </Link>
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-9 w-64" />
          <div className="overflow-hidden rounded-lg border shadow-sm">
            <div className="bg-primary h-10" />
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 border-b px-4 py-3">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-12" />
                <Skeleton className="h-4 w-12" />
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>
            ))}
          </div>
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={filteredData}
          searchKey="name"
          searchPlaceholder="Search tour operators..."
          toolbar={filterToolbar}
          onRowClick={(row) => router.push(`/contracting/tour-operators/${row.id}`)}
        />
      )}

      {/* Bulk Assign Dialog */}
      <Dialog open={bulkOpen} onOpenChange={setBulkOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Bulk Assign Tour Operators to Hotels</DialogTitle>
            <DialogDescription>
              Select tour operators and hotels. Assignments cascade to published contracts by default.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Tour Operator selection */}
            <div>
              <h4 className="mb-2 text-sm font-medium">Tour Operators</h4>
              <div className="max-h-[160px] space-y-1 overflow-y-auto rounded border p-2">
                {((data ?? []) as TORow[])
                  .filter((to) => to.active)
                  .map((to) => (
                    <label
                      key={to.id}
                      className="flex items-center gap-2 rounded p-1.5 hover:bg-muted/50 cursor-pointer"
                    >
                      <Checkbox
                        checked={selectedTOs.includes(to.id)}
                        onCheckedChange={(checked) =>
                          setSelectedTOs((prev) =>
                            checked ? [...prev, to.id] : prev.filter((id) => id !== to.id),
                          )
                        }
                      />
                      <span className="text-sm">{to.name}</span>
                      <span className="text-xs text-muted-foreground font-mono">{to.code}</span>
                    </label>
                  ))}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {selectedTOs.length} selected
              </p>
            </div>

            {/* Hotel selection */}
            <div>
              <h4 className="mb-2 text-sm font-medium">Hotels</h4>
              <div className="max-h-[160px] space-y-1 overflow-y-auto rounded border p-2">
                {(hotels ?? []).map((h) => (
                  <label
                    key={h.id}
                    className="flex items-center gap-2 rounded p-1.5 hover:bg-muted/50 cursor-pointer"
                  >
                    <Checkbox
                      checked={selectedHotels.includes(h.id)}
                      onCheckedChange={(checked) =>
                        setSelectedHotels((prev) =>
                          checked ? [...prev, h.id] : prev.filter((id) => id !== h.id),
                        )
                      }
                    />
                    <span className="text-sm">{h.name}</span>
                    <span className="text-xs text-muted-foreground font-mono">{h.code}</span>
                  </label>
                ))}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {selectedHotels.length} selected
              </p>
            </div>

            {/* Cascade option */}
            <div className="flex items-center gap-2">
              <Checkbox
                id="bulk-cascade"
                checked={cascade}
                onCheckedChange={(v) => setCascade(!!v)}
              />
              <label htmlFor="bulk-cascade" className="text-sm">
                Also assign to published contracts for these hotels
              </label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={
                selectedTOs.length === 0 ||
                selectedHotels.length === 0 ||
                bulkMutation.isPending
              }
              onClick={() =>
                bulkMutation.mutate({
                  hotelIds: selectedHotels,
                  tourOperatorIds: selectedTOs,
                  cascadeToContracts: cascade,
                })
              }
            >
              Assign ({selectedTOs.length} × {selectedHotels.length})
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
