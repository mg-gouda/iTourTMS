"use client";

import { useState } from "react";
import { CheckCircle2, Users, MapPin } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { PermissionGuard } from "@/components/shared/permission-guard";
import { useTranslations } from "next-intl";

export default function ToAssignPage() {
  const t = useTranslations("crm");
  const tc = useTranslations("common");
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);

  const { data: plans, isLoading: plansLoading } = trpc.crm.programPlan.listWithTOCount.useQuery();

  const { data: tourOperators, isLoading: tosLoading } =
    trpc.crm.programPlan.listTourOperators.useQuery(
      { programPlanId: selectedPlanId! },
      { enabled: !!selectedPlanId },
    );

  const utils = trpc.useUtils();

  const assignMutation = trpc.crm.programPlan.assignTO.useMutation({
    onSuccess: () => {
      utils.crm.programPlan.listTourOperators.invalidate({ programPlanId: selectedPlanId! });
      utils.crm.programPlan.listWithTOCount.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const unassignMutation = trpc.crm.programPlan.unassignTO.useMutation({
    onSuccess: () => {
      utils.crm.programPlan.listTourOperators.invalidate({ programPlanId: selectedPlanId! });
      utils.crm.programPlan.listWithTOCount.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const selectedPlan = plans?.find((p) => p.id === selectedPlanId);

  function toggleTO(tourOperatorId: string, assigned: boolean) {
    if (!selectedPlanId) return;
    if (assigned) {
      unassignMutation.mutate({ programPlanId: selectedPlanId, tourOperatorId });
    } else {
      assignMutation.mutate({ programPlanId: selectedPlanId, tourOperatorId });
    }
  }

  const isMutating = assignMutation.isPending || unassignMutation.isPending;

  return (

    <PermissionGuard permission="crm:booking:read">
      <div className="flex flex-1 flex-col gap-6 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t("toAssign")}</h1>
        <p className="text-sm text-muted-foreground">
          Assign tour operators to excursion programs
        </p>
      </div>

      <div className="grid grid-cols-5 gap-6 flex-1">
        {/* ── Left: Programs list ── */}
        <div className="col-span-2 space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {t("programs")}
          </p>
          {plansLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))
          ) : !plans?.length ? (
            <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed p-8 text-center">
              <MapPin className="h-8 w-8 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">No programs yet</p>
            </div>
          ) : (
            plans.map((plan) => (
              <button
                key={plan.id}
                onClick={() => setSelectedPlanId(plan.id)}
                className={cn(
                  "w-full rounded-lg border p-3 text-left transition-colors",
                  selectedPlanId === plan.id
                    ? "border-primary bg-primary/5"
                    : "hover:border-muted-foreground/40 hover:bg-muted/30",
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{plan.name}</span>
                  <div className="flex items-center gap-1.5">
                    <Badge variant="secondary" className="text-xs">
                      <Users className="mr-1 h-2.5 w-2.5" />
                      {plan._count.tourOperators}
                    </Badge>
                    {!plan.active && (
                      <Badge variant="outline" className="text-xs text-muted-foreground">
                        Inactive
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="mt-1 flex items-center gap-2">
                  {plan.market && (
                    <span className="text-xs text-muted-foreground">{plan.market.name}</span>
                  )}
                  <span className="text-xs text-muted-foreground">
                    {plan._count.items} excursion{plan._count.items !== 1 ? "s" : ""}
                  </span>
                </div>
              </button>
            ))
          )}
        </div>

        {/* ── Right: TO assignment ── */}
        <div className="col-span-3">
          {!selectedPlanId ? (
            <div className="flex h-full items-center justify-center rounded-lg border border-dashed">
              <div className="flex flex-col items-center gap-2 text-center">
                <Users className="h-10 w-10 text-muted-foreground/40" />
                <p className="text-sm font-medium text-muted-foreground">Select a program</p>
                <p className="text-xs text-muted-foreground">
                  Choose a program on the left to manage its tour operator assignments.
                </p>
              </div>
            </div>
          ) : (
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base">{selectedPlan?.name}</CardTitle>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {tourOperators?.filter((t) => t.assigned).length ?? 0} of{" "}
                      {tourOperators?.length ?? 0} tour operators assigned
                    </p>
                  </div>
                  {selectedPlan?.market && (
                    <Badge variant="outline">{selectedPlan.market.name}</Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {tosLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))
                ) : !tourOperators?.length ? (
                  <p className="py-6 text-center text-sm text-muted-foreground">
                    No tour operators found. Add tour operators in the B2B Portal module.
                  </p>
                ) : (
                  tourOperators.map((to) => (
                    <div
                      key={to.id}
                      className={cn(
                        "flex items-center justify-between rounded-lg border px-4 py-2.5 transition-colors",
                        to.assigned && "border-green-200 bg-green-50/50 dark:border-green-900 dark:bg-green-950/20",
                      )}
                    >
                      <div className="flex items-center gap-3">
                        {to.assigned ? (
                          <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
                        ) : (
                          <div className="h-4 w-4 rounded-full border-2 border-muted-foreground/30 shrink-0" />
                        )}
                        <div>
                          <p className="text-sm font-medium">{to.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {to.code}
                            {to.market && ` · ${to.market.name}`}
                          </p>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant={to.assigned ? "outline" : "default"}
                        disabled={isMutating}
                        onClick={() => toggleTO(to.id, to.assigned)}
                        className={cn(
                          "min-w-[90px]",
                          to.assigned && "text-destructive hover:text-destructive border-destructive/30 hover:border-destructive",
                        )}
                      >
                        {to.assigned ? tc("remove") : tc("add")}
                      </Button>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  

    </PermissionGuard>

  );
}
