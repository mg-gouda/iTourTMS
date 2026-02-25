"use client";

import { ArrowLeft, FileDown, FileSpreadsheet, RefreshCw, Trash2 } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { exportTariffToExcel, type TariffExportData } from "@/lib/export/tariff-excel";
import { exportTariffToPdf } from "@/lib/export/tariff-pdf";
import { trpc } from "@/lib/trpc";

interface TariffRateEntry {
  seasonName: string;
  seasonCode: string;
  roomTypeName: string;
  roomTypeCode: string;
  mealBasisName: string;
  mealCode: string;
  baseRate: number;
  markup: number;
  sellingRate: number;
}

interface TariffDataShape {
  contractName?: string;
  contractCode?: string;
  hotelName?: string;
  tourOperatorName?: string;
  tourOperatorCode?: string;
  markupRuleName?: string | null;
  markupType?: string;
  markupValue?: number;
  rateBasis?: string;
  rates?: TariffRateEntry[];
  generatedAt?: string;
}

export default function TariffDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const utils = trpc.useUtils();
  const [deleteOpen, setDeleteOpen] = useState(false);

  const { data, isLoading } = trpc.contracting.tariff.getById.useQuery(
    { id },
    { enabled: !!id },
  );

  const regenerateMutation = trpc.contracting.tariff.regenerate.useMutation({
    onSuccess: (result) => {
      utils.contracting.tariff.list.invalidate();
      toast.success("Tariff regenerated");
      router.push(`/contracting/tariffs/${result.id}`);
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  const deleteMutation = trpc.contracting.tariff.delete.useMutation({
    onSuccess: () => {
      utils.contracting.tariff.list.invalidate();
      toast.success("Tariff deleted");
      router.push("/contracting/tariffs");
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-4 animate-fade-in">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!data) return null;

  const tariffData = data.data as unknown as TariffDataShape;
  const rates = tariffData?.rates ?? [];

  function buildExportData(): TariffExportData {
    return {
      tariffName: data!.name,
      contractName: data!.contract.name,
      contractCode: data!.contract.code,
      hotelName: (data!.contract as any).hotel?.name ?? tariffData?.hotelName,
      tourOperatorName: data!.tourOperator.name,
      tourOperatorCode: data!.tourOperator.code,
      markupRuleName: data!.markupRule?.name ?? null,
      markupType: data!.markupRule?.markupType,
      markupValue: data!.markupRule ? Number(data!.markupRule.value) : undefined,
      currencyCode: data!.currencyCode,
      rateBasis: data!.contract.rateBasis,
      generatedAt: data!.generatedAt as unknown as string,
      rates,
    };
  }

  // Group rates by season
  const seasonGroups = new Map<string, TariffRateEntry[]>();
  for (const rate of rates) {
    const key = rate.seasonCode;
    if (!seasonGroups.has(key)) {
      seasonGroups.set(key, []);
    }
    seasonGroups.get(key)!.push(rate);
  }

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/contracting/tariffs">
              <ArrowLeft className="size-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{data.name}</h1>
            <p className="text-muted-foreground">
              Generated{" "}
              {new Date(data.generatedAt).toLocaleDateString(undefined, {
                year: "numeric",
                month: "long",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              exportTariffToPdf(buildExportData(), "iTour TMS");
              toast.success("PDF downloaded");
            }}
            disabled={rates.length === 0}
          >
            <FileDown className="mr-2 size-4" />
            PDF
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={async () => {
              await exportTariffToExcel(buildExportData());
              toast.success("Excel downloaded");
            }}
            disabled={rates.length === 0}
          >
            <FileSpreadsheet className="mr-2 size-4" />
            Excel
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => regenerateMutation.mutate({ id })}
            disabled={regenerateMutation.isPending}
          >
            <RefreshCw className="mr-2 size-4" />
            Regenerate
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setDeleteOpen(true)}
          >
            <Trash2 className="mr-2 size-4" /> Delete
          </Button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Contract
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Link
              href={`/contracting/contracts/${data.contract.id}`}
              className="font-medium hover:underline"
            >
              {data.contract.name}
            </Link>
            <p className="text-xs text-muted-foreground font-mono">
              {data.contract.code}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Tour Operator
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Link
              href={`/contracting/tour-operators/${data.tourOperator.id}`}
              className="font-medium hover:underline"
            >
              {data.tourOperator.name}
            </Link>
            <p className="text-xs text-muted-foreground font-mono">
              {data.tourOperator.code}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Markup
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.markupRule ? (
              <>
                <p className="font-medium">{data.markupRule.name}</p>
                <p className="text-xs text-muted-foreground">
                  {data.markupRule.markupType === "PERCENTAGE"
                    ? `${parseFloat(data.markupRule.value.toString())}%`
                    : parseFloat(data.markupRule.value.toString()).toFixed(2)}{" "}
                  {data.markupRule.markupType.replace(/_/g, " ").toLowerCase()}
                </p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">No markup (cost rates)</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Currency & Rates
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Badge variant="secondary" className="text-base">
              {data.currencyCode}
            </Badge>
            <p className="mt-1 text-xs text-muted-foreground">
              {rates.length} rate entries &middot;{" "}
              {data.contract.rateBasis === "PER_PERSON"
                ? "Per Person"
                : "Per Room"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Rate tables grouped by season */}
      {Array.from(seasonGroups.entries()).map(([seasonCode, seasonRates]) => (
        <Card key={seasonCode}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Badge variant="outline">{seasonCode}</Badge>
              {seasonRates[0]?.seasonName}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Room Type</TableHead>
                  <TableHead>Meal Plan</TableHead>
                  <TableHead className="text-right">Base Rate</TableHead>
                  <TableHead className="text-right">Markup</TableHead>
                  <TableHead className="text-right">Selling Rate</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {seasonRates.map((rate, idx) => (
                  <TableRow key={idx}>
                    <TableCell>
                      {rate.roomTypeName}{" "}
                      <span className="font-mono text-xs text-muted-foreground">
                        ({rate.roomTypeCode})
                      </span>
                    </TableCell>
                    <TableCell>
                      {rate.mealBasisName}{" "}
                      <span className="font-mono text-xs text-muted-foreground">
                        ({rate.mealCode})
                      </span>
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {rate.baseRate.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-green-600 dark:text-green-400">
                      +{rate.markup.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right font-mono font-bold">
                      {rate.sellingRate.toFixed(2)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ))}

      {rates.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No rate data available. Try regenerating the tariff.
          </CardContent>
        </Card>
      )}

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Tariff</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;{data.name}&quot;? This
              action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteMutation.mutate({ id })}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
