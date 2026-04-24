"use client";

import { Plus, MapPin, CheckCircle2, XCircle } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { formatOperatingDays } from "@/lib/constants/crm";
import { trpc } from "@/lib/trpc";

export default function ExcProgramsPage() {
  const utils = trpc.useUtils();
  const { data: plans, isLoading } = trpc.crm.programPlan.list.useQuery();

  const deleteMutation = trpc.crm.programPlan.delete.useMutation({
    onSuccess: () => {
      utils.crm.programPlan.list.invalidate();
      toast.success("Program deleted");
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Excursion Programs</h1>
          <p className="text-sm text-muted-foreground">
            Schedule which excursions run, for which market, on which days of the week
          </p>
        </div>
        <Button asChild>
          <Link href="/crm/exc-programs/new">
            <Plus className="mr-2 h-4 w-4" /> New Program
          </Link>
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : !plans?.length ? (
        <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed">
          <div className="flex flex-col items-center gap-2 text-center">
            <MapPin className="h-10 w-10 text-muted-foreground/40" />
            <p className="text-sm font-medium text-muted-foreground">No programs yet</p>
            <p className="text-xs text-muted-foreground">Create a program to schedule excursions by market and day of week.</p>
            <Button size="sm" asChild className="mt-2">
              <Link href="/crm/exc-programs/new">New Program</Link>
            </Button>
          </div>
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Market</TableHead>
                <TableHead className="text-center">Excursions</TableHead>
                <TableHead>Status</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {plans.map((plan) => (
                <TableRow
                  key={plan.id}
                  className="cursor-pointer"
                  onClick={() => window.location.href = `/crm/exc-programs/${plan.id}`}
                >
                  <TableCell className="font-medium">{plan.name}</TableCell>
                  <TableCell>
                    {plan.market ? (
                      <Badge variant="outline">{plan.market.name}</Badge>
                    ) : (
                      <span className="text-muted-foreground text-xs">All markets</span>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="secondary">{plan._count.items}</Badge>
                  </TableCell>
                  <TableCell>
                    {plan.active ? (
                      <span className="flex items-center gap-1 text-xs text-green-600">
                        <CheckCircle2 className="h-3 w-3" /> Active
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <XCircle className="h-3 w-3" /> Inactive
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm("Delete this program?")) {
                          deleteMutation.mutate({ id: plan.id });
                        }
                      }}
                    >
                      Delete
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
