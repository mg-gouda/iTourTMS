"use client";

import { DollarSign, Plus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo } from "react";

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
  CRM_OPPORTUNITY_STAGE_LABELS,
  CRM_OPPORTUNITY_STAGE_VARIANTS,
  CRM_PIPELINE_STAGE_ORDER,
} from "@/lib/constants/crm";
import { trpc } from "@/lib/trpc";

export default function PipelinePage() {
  const router = useRouter();
  const utils = trpc.useUtils();
  const { data: opportunities, isLoading } = trpc.crm.opportunity.list.useQuery();

  const updateMutation = trpc.crm.opportunity.update.useMutation({
    onSuccess: () => {
      utils.crm.opportunity.list.invalidate();
    },
  });

  const columns = useMemo(() => {
    const grouped: Record<string, typeof opportunities> = {};
    for (const stage of CRM_PIPELINE_STAGE_ORDER) {
      grouped[stage] = [];
    }
    for (const opp of opportunities ?? []) {
      if (grouped[opp.stage]) {
        grouped[opp.stage]!.push(opp);
      }
    }
    return grouped;
  }, [opportunities]);

  if (isLoading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Pipeline</h1>
          <p className="text-muted-foreground">Kanban view of your sales pipeline</p>
        </div>
        <div className="grid grid-cols-6 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-6 w-full" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Pipeline</h1>
          <p className="text-muted-foreground">Kanban view of your sales pipeline</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={async () => {
              const { exportPipelineToExcel } = await import("@/lib/export/crm-pipeline-excel");
              await exportPipelineToExcel(opportunities ?? []);
            }}
            disabled={!opportunities?.length}
          >
            Export Excel
          </Button>
          <Button asChild>
            <Link href="/crm/pipeline/new">
              <Plus className="mr-2 size-4" /> New Opportunity
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        {CRM_PIPELINE_STAGE_ORDER.map((stage) => {
          const opps = columns[stage] ?? [];
          const stageTotal = opps.reduce((sum, o) => sum + Number(o.value ?? 0), 0);

          return (
            <div key={stage} className="space-y-2">
              <div className="rounded-md bg-muted px-3 py-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider">
                    {CRM_OPPORTUNITY_STAGE_LABELS[stage]}
                  </span>
                  <Badge variant="secondary" className="text-xs">
                    {opps.length}
                  </Badge>
                </div>
                {stageTotal > 0 && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    ${stageTotal.toLocaleString()}
                  </p>
                )}
              </div>

              <div className="space-y-2 min-h-[100px]">
                {opps.map((opp) => (
                  <Card
                    key={opp.id}
                    className="cursor-pointer hover:border-primary/50 transition-colors"
                    onClick={() => router.push(`/crm/pipeline/${opp.id}`)}
                  >
                    <CardHeader className="p-3 pb-1">
                      <CardTitle className="text-xs font-medium leading-tight">
                        {opp.title}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-3 pt-0 space-y-2">
                      {opp.value && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <DollarSign className="h-3 w-3" />
                          {Number(opp.value).toLocaleString()}
                        </div>
                      )}
                      {opp.owner && (
                        <p className="text-xs text-muted-foreground truncate">
                          {opp.owner.name}
                        </p>
                      )}
                      <Select
                        value={opp.stage}
                        onValueChange={(newStage) =>
                          updateMutation.mutate({ id: opp.id, data: { stage: newStage as typeof opp.stage } })
                        }
                      >
                        <SelectTrigger className="h-7 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {CRM_PIPELINE_STAGE_ORDER.map((s) => (
                            <SelectItem key={s} value={s}>
                              {CRM_OPPORTUNITY_STAGE_LABELS[s]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
