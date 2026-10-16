"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { PermissionGuard } from "@/components/shared/permission-guard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Combobox } from "@/components/ui/combobox";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAccountOptions } from "@/hooks/use-account-options";
import { formatCurrency } from "@/lib/format";
import { trpc } from "@/lib/trpc";

const STATE_VARIANT: Record<string, "default" | "outline" | "secondary"> = {
  DRAFT: "outline",
  OPEN: "default",
  CLOSED: "secondary",
};

/** One asset: what it is worth, where its depreciation posts, and the board. */
export default function AssetDetailPage() {
  const { id } = useParams<{ id: string }>();
  const utils = trpc.useUtils();
  const { data: asset, isLoading } = trpc.finance.asset.getById.useQuery({ id });
  const expenseAccounts = useAccountOptions("EXPENSE");
  const assetAccounts = useAccountOptions("ASSET_FIXED", "ASSET_NON_CURRENT");

  const [accounts, setAccounts] = useState({ depreciationAccountId: "", accumulationAccountId: "" });
  useEffect(() => {
    if (asset) {
      setAccounts({
        depreciationAccountId: asset.depreciationAccountId ?? "",
        accumulationAccountId: asset.accumulationAccountId ?? "",
      });
    }
  }, [asset]);

  const refresh = () => {
    utils.finance.asset.getById.invalidate({ id });
    utils.finance.asset.list.invalidate();
  };
  const onError = (e: { message: string }) => toast.error(e.message);
  const update = trpc.finance.asset.update.useMutation({
    onSuccess: () => { refresh(); toast.success("Accounts saved"); },
    onError,
  });
  const compute = trpc.finance.asset.compute.useMutation({
    onSuccess: () => { refresh(); toast.success("Depreciation board computed"); },
    onError,
  });
  const postDue = trpc.finance.asset.postDue.useMutation({
    onSuccess: (r) => { refresh(); toast.success(r.posted ? `${r.posted} depreciation entr${r.posted === 1 ? "y" : "ies"} posted` : "Nothing due yet"); },
    onError,
  });

  if (isLoading) return <Skeleton className="h-96 w-full" />;
  if (!asset) return <p className="text-muted-foreground">Asset not found.</p>;

  const accountsMissing = !asset.depreciationAccountId || !asset.accumulationAccountId;
  const dirty =
    accounts.depreciationAccountId !== (asset.depreciationAccountId ?? "") ||
    accounts.accumulationAccountId !== (asset.accumulationAccountId ?? "");
  const due = asset.depreciationLines.filter((l) => !l.isPosted && new Date(l.date) <= new Date()).length;
  const facts: [string, string][] = [
    ["Original value", formatCurrency(Number(asset.originalValue))],
    ["Salvage value", formatCurrency(Number(asset.salvageValue))],
    ["Accumulated depreciation", formatCurrency(Number(asset.accumulatedDepreciation))],
    ["Net book value", formatCurrency(Number(asset.netBookValue))],
    ["Acquired", new Date(asset.acquisitionDate).toLocaleDateString()],
    ["Useful life", `${asset.usefulLifeYears} years · ${asset.method.replaceAll("_", " ").toLowerCase()}`],
  ];

  return (
    <PermissionGuard permission="finance:asset:read">
      <div className="space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <Link href="/finance/accounting/assets" className="text-muted-foreground text-sm hover:underline">
              ← Assets
            </Link>
            <h1 className="mt-1 text-2xl font-bold tracking-tight">{asset.name}</h1>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-sm">
              <Badge variant={STATE_VARIANT[asset.state] ?? "outline"}>{asset.state}</Badge>
              <span className="text-muted-foreground">
                {asset.account.code} — {asset.account.name} · {asset.branch.name}
              </span>
            </div>
          </div>
          <div className="flex gap-2">
            {asset.state === "DRAFT" && (
              <Button onClick={() => compute.mutate({ id })} disabled={compute.isPending}>
                Compute depreciation board
              </Button>
            )}
            {asset.state === "OPEN" && (
              <Button onClick={() => postDue.mutate({ id })} disabled={postDue.isPending || accountsMissing || !due}>
                {postDue.isPending ? "Posting…" : due ? `Post ${due} due line${due === 1 ? "" : "s"}` : "Nothing due"}
              </Button>
            )}
          </div>
        </div>

        <dl className="grid grid-cols-2 gap-x-6 gap-y-3 rounded-lg border p-4 sm:grid-cols-3 lg:grid-cols-6">
          {facts.map(([label, value]) => (
            <div key={label}>
              <dt className="text-muted-foreground text-xs">{label}</dt>
              <dd className="font-mono text-sm tabular-nums">{value}</dd>
            </div>
          ))}
        </dl>

        <Card>
          <CardHeader>
            <CardTitle>Posting accounts</CardTitle>
            <CardDescription>
              {accountsMissing
                ? "Depreciation cannot post until both accounts are set."
                : `Each line posts Dr expense / Cr accumulated depreciation in ${asset.branch.name}'s books.`}
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
            <div className="grid gap-1.5">
              <Label>Depreciation expense</Label>
              <Combobox
                options={expenseAccounts}
                value={accounts.depreciationAccountId}
                onValueChange={(v) => setAccounts((a) => ({ ...a, depreciationAccountId: v }))}
                placeholder="Select account"
                searchPlaceholder="Search accounts…"
              />
            </div>
            <div className="grid gap-1.5">
              <Label>Accumulated depreciation</Label>
              <Combobox
                options={assetAccounts}
                value={accounts.accumulationAccountId}
                onValueChange={(v) => setAccounts((a) => ({ ...a, accumulationAccountId: v }))}
                placeholder="Select account"
                searchPlaceholder="Search accounts…"
              />
            </div>
            <Button
              variant="outline"
              disabled={!dirty || update.isPending}
              onClick={() =>
                update.mutate({
                  id,
                  depreciationAccountId: accounts.depreciationAccountId || null,
                  accumulationAccountId: accounts.accumulationAccountId || null,
                })
              }
            >
              Save accounts
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Depreciation board</CardTitle>
            {asset.state === "DRAFT" && (
              <CardDescription>Compute the board to see the schedule.</CardDescription>
            )}
          </CardHeader>
          {asset.depreciationLines.length > 0 && (
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Line</TableHead>
                    <TableHead className="text-right">Depreciation</TableHead>
                    <TableHead className="text-right">Residual</TableHead>
                    <TableHead>Entry</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {asset.depreciationLines.map((l) => (
                    <TableRow key={l.id}>
                      <TableCell>{new Date(l.date).toLocaleDateString()}</TableCell>
                      <TableCell>{l.name}</TableCell>
                      <TableCell className="text-right font-mono tabular-nums">{formatCurrency(Number(l.depreciation))}</TableCell>
                      <TableCell className="text-right font-mono tabular-nums">{formatCurrency(Number(l.residual))}</TableCell>
                      <TableCell>
                        {l.move ? (
                          <Link href={`/finance/accounting/journal-entries/${l.move.id}`} className="text-primary font-mono text-xs underline">
                            {l.move.name}
                          </Link>
                        ) : new Date(l.date) <= new Date() ? (
                          <Badge variant="outline">Due</Badge>
                        ) : (
                          <span className="text-muted-foreground text-xs">Scheduled</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          )}
        </Card>
      </div>
    </PermissionGuard>
  );
}
