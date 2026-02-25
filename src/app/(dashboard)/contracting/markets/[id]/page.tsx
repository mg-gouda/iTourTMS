"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import type { z } from "zod";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CONTRACT_STATUS_LABELS, CONTRACT_STATUS_VARIANTS } from "@/lib/constants/contracting";
import { trpc } from "@/lib/trpc";
import { marketUpdateSchema } from "@/lib/validations/contracting";

type FormValues = z.input<typeof marketUpdateSchema>;

export default function MarketDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const utils = trpc.useUtils();
  const [editing, setEditing] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [countrySearch, setCountrySearch] = useState("");

  const { data, isLoading } = trpc.contracting.market.getById.useQuery({ id });
  const { data: countries } = trpc.setup.getCountries.useQuery();

  const form = useForm<FormValues>({
    resolver: zodResolver(marketUpdateSchema),
  });

  useEffect(() => {
    if (data) {
      form.reset({
        name: data.name,
        code: data.code,
        countryIds: data.countryIds,
        active: data.active,
      });
    }
  }, [data, form]);

  const updateMutation = trpc.contracting.market.update.useMutation({
    onSuccess: () => {
      utils.contracting.market.getById.invalidate({ id });
      utils.contracting.market.list.invalidate();
      setEditing(false);
    },
  });

  const deleteMutation = trpc.contracting.market.delete.useMutation({
    onSuccess: () => {
      utils.contracting.market.list.invalidate();
      router.push("/contracting/markets");
    },
  });

  const countryIds = form.watch("countryIds") ?? [];

  const filteredCountries = useMemo(() => {
    const q = countrySearch.toLowerCase().trim();
    if (!q) return countries ?? [];
    return (countries ?? []).filter(
      (c) => c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q),
    );
  }, [countries, countrySearch]);

  if (isLoading) {
    return (
      <div className="py-10 text-center text-muted-foreground">Loading...</div>
    );
  }

  if (!data) {
    return (
      <div className="py-10 text-center text-muted-foreground">
        Market not found
      </div>
    );
  }

  function onSubmit(values: FormValues) {
    updateMutation.mutate({ id, data: values });
  }

  function toggleCountry(cid: string) {
    const current = form.getValues("countryIds") ?? [];
    if (current.includes(cid)) {
      form.setValue("countryIds", current.filter((c) => c !== cid));
    } else {
      form.setValue("countryIds", [...current, cid]);
    }
  }

  // Build country name lookup
  const countryMap = new Map((countries ?? []).map((c) => [c.id, c.name]));
  const displayCountries = data.countryIds
    .map((cid) => countryMap.get(cid) ?? cid)
    .join(", ");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {data.name}{" "}
            <span className="text-muted-foreground font-mono text-base">
              ({data.code})
            </span>
          </h1>
          <Badge variant={data.active ? "default" : "secondary"} className="mt-1">
            {data.active ? "Active" : "Inactive"}
          </Badge>
        </div>
        <div className="flex gap-2">
          {editing ? (
            <>
              <Button
                onClick={form.handleSubmit(onSubmit)}
                disabled={updateMutation.isPending}
              >
                {updateMutation.isPending ? "Saving..." : "Save"}
              </Button>
              <Button variant="outline" onClick={() => setEditing(false)}>
                Cancel
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => setEditing(true)}>
                Edit
              </Button>
              <Button
                variant="destructive"
                onClick={() => setDeleteOpen(true)}
              >
                Delete
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Details Card */}
      <Card>
        <CardHeader>
          <CardTitle>Market Details</CardTitle>
        </CardHeader>
        <CardContent>
          {editing ? (
            <Form {...form}>
              <form className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value ?? ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Code</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value ?? ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="space-y-2">
                  <FormLabel>Countries</FormLabel>
                  <Input
                    placeholder="Search countries..."
                    value={countrySearch}
                    onChange={(e) => setCountrySearch(e.target.value)}
                    className="h-8"
                  />
                  <div className="max-h-48 overflow-y-auto rounded-md border p-3 space-y-1">
                    {filteredCountries.map((c) => (
                      <label
                        key={c.id}
                        className="flex items-center gap-2 text-sm cursor-pointer hover:bg-muted/50 rounded px-1 py-0.5"
                      >
                        <Checkbox
                          checked={countryIds.includes(c.id)}
                          onCheckedChange={() => toggleCountry(c.id)}
                        />
                        {c.name} ({c.code})
                      </label>
                    ))}
                    {filteredCountries.length === 0 && (
                      <p className="text-xs text-muted-foreground py-2 text-center">
                        No countries match &ldquo;{countrySearch}&rdquo;
                      </p>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {countryIds.length} selected
                  </p>
                </div>
                <FormField
                  control={form.control}
                  name="active"
                  render={({ field }) => (
                    <FormItem className="flex items-center gap-2 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value ?? data.active}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <FormLabel>Active</FormLabel>
                    </FormItem>
                  )}
                />
              </form>
            </Form>
          ) : (
            <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-sm font-medium text-muted-foreground">Name</dt>
                <dd className="mt-1">{data.name}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-muted-foreground">Code</dt>
                <dd className="mt-1 font-mono">{data.code}</dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-sm font-medium text-muted-foreground">Countries</dt>
                <dd className="mt-1">{displayCountries || "—"}</dd>
              </div>
            </dl>
          )}
        </CardContent>
      </Card>

      {/* Linked Contracts */}
      <Card>
        <CardHeader>
          <CardTitle>Linked Contracts ({data.contracts.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {data.contracts.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              No contracts assigned to this market yet.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Contract</TableHead>
                  <TableHead>Hotel</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.contracts.map((cm) => (
                  <TableRow
                    key={cm.contract.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() =>
                      router.push(`/contracting/contracts/${cm.contract.id}`)
                    }
                  >
                    <TableCell>
                      <span className="font-medium">{cm.contract.name}</span>
                      <span className="ml-2 font-mono text-xs text-muted-foreground">
                        {cm.contract.code}
                      </span>
                    </TableCell>
                    <TableCell>{cm.contract.hotel?.name ?? "—"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(new Date(cm.contract.validFrom), "dd MMM yyyy")} —{" "}
                      {format(new Date(cm.contract.validTo), "dd MMM yyyy")}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          (CONTRACT_STATUS_VARIANTS[cm.contract.status] as any) ??
                          "secondary"
                        }
                      >
                        {CONTRACT_STATUS_LABELS[cm.contract.status] ?? cm.contract.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Delete Dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Market</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &ldquo;{data.name}&rdquo;? This
              will also remove it from all assigned contracts. This action cannot
              be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={deleteMutation.isPending}
              onClick={() => deleteMutation.mutate({ id })}
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
