"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useParams, useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import type { z } from "zod";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { STAR_RATING_LABELS } from "@/lib/constants/contracting";
import { trpc } from "@/lib/trpc";
import { destinationUpdateSchema } from "@/lib/validations/contracting";

type FormValues = z.input<typeof destinationUpdateSchema>;

export default function DestinationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const utils = trpc.useUtils();
  const [editing, setEditing] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const { data, isLoading } = trpc.contracting.destination.getById.useQuery({ id });
  const { data: countries } = trpc.setup.getCountries.useQuery();

  const form = useForm<FormValues>({
    resolver: zodResolver(destinationUpdateSchema),
  });

  useEffect(() => {
    if (data) {
      form.reset({
        name: data.name,
        code: data.code,
        countryId: data.countryId,
        active: data.active,
      });
    }
  }, [data, form]);

  const updateMutation = trpc.contracting.destination.update.useMutation({
    onSuccess: () => {
      utils.contracting.destination.getById.invalidate({ id });
      utils.contracting.destination.list.invalidate();
      setEditing(false);
    },
  });

  const deleteMutation = trpc.contracting.destination.delete.useMutation({
    onSuccess: () => {
      utils.contracting.destination.list.invalidate();
      router.push("/contracting/destinations");
    },
  });

  if (isLoading) {
    return (
      <div className="py-10 text-center text-muted-foreground">Loading...</div>
    );
  }

  if (!data) {
    return (
      <div className="py-10 text-center text-muted-foreground">
        Destination not found
      </div>
    );
  }

  function onSubmit(values: FormValues) {
    updateMutation.mutate({ id, data: values });
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{data.name}</h1>
          <p className="text-muted-foreground">
            <span className="font-mono">{data.code}</span> —{" "}
            {data.country?.name}
          </p>
        </div>
        <div className="flex gap-2">
          <Badge variant={data.active ? "default" : "secondary"}>
            {data.active ? "Active" : "Inactive"}
          </Badge>
          {!editing && (
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

      {/* Edit Form */}
      {editing ? (
        <Card>
          <CardHeader>
            <CardTitle>Edit Destination</CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-4"
              >
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input {...field} />
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
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="countryId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Country</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value ?? ""}
                      >
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select country" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {(countries ?? []).map((c) => (
                            <SelectItem key={c.id} value={c.id}>
                              {c.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="active"
                  render={({ field }) => (
                    <FormItem className="flex items-center gap-2 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <FormLabel>Active</FormLabel>
                    </FormItem>
                  )}
                />

                {updateMutation.error && (
                  <p className="text-sm text-destructive">
                    {updateMutation.error.message}
                  </p>
                )}

                <div className="flex gap-2">
                  <Button type="submit" disabled={updateMutation.isPending}>
                    {updateMutation.isPending ? "Saving..." : "Save"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setEditing(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      ) : (
        /* Read-only details */
        <Card>
          <CardHeader>
            <CardTitle>Details</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <dt className="text-muted-foreground">Name</dt>
                <dd className="font-medium">{data.name}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Code</dt>
                <dd className="font-mono">{data.code}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Country</dt>
                <dd>{data.country?.name ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Hotels</dt>
                <dd>{data.hotels?.length ?? 0}</dd>
              </div>
            </dl>
          </CardContent>
        </Card>
      )}

      {/* Cities */}
      <CitiesSection destinationId={id} cities={data.cities ?? []} />

      {/* Zones */}
      <ZonesSection cities={data.cities ?? []} />

      {/* Linked Hotels */}
      {data.hotels && data.hotels.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Hotels in this Destination</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>Star Rating</TableHead>
                  <TableHead>City</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.hotels.map((h) => (
                  <TableRow
                    key={h.id}
                    className="cursor-pointer"
                    onClick={() => router.push(`/contracting/hotels/${h.id}`)}
                  >
                    <TableCell className="font-medium">{h.name}</TableCell>
                    <TableCell className="font-mono">{h.code}</TableCell>
                    <TableCell>
                      {STAR_RATING_LABELS[h.starRating] ?? h.starRating}
                    </TableCell>
                    <TableCell>{h.cityRel?.name ?? h.city}</TableCell>
                    <TableCell>
                      <Badge
                        variant={h.active ? "default" : "secondary"}
                      >
                        {h.active ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Delete Dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Destination</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;{data.name}&quot;? This
              action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {deleteMutation.error && (
            <p className="text-sm text-destructive">
              {deleteMutation.error.message}
            </p>
          )}
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

// ---------------------------------------------------------------------------
// Cities Section — Inline Editable Grid
// ---------------------------------------------------------------------------

type CityRow = {
  id?: string;
  code: string;
  name: string;
  active: boolean;
  isNew: boolean;
};

function CitiesSection({
  destinationId,
  cities,
}: {
  destinationId: string;
  cities: { id: string; name: string; code: string; active: boolean }[];
}) {
  const utils = trpc.useUtils();
  const invalidate = useCallback(
    () => utils.contracting.destination.getById.invalidate({ id: destinationId }),
    [utils, destinationId],
  );

  // Local rows state — initialized from server data + one empty new row
  const [rows, setRows] = useState<CityRow[]>(() => [
    ...cities.map((c) => ({ ...c, isNew: false })),
    { code: "", name: "", active: true, isNew: true },
  ]);

  // Sync from server when cities prop changes (after create/update/delete)
  useEffect(() => {
    setRows([
      ...cities.map((c) => ({ ...c, isNew: false })),
      { code: "", name: "", active: true, isNew: true },
    ]);
  }, [cities]);

  // Refs for focusing inputs
  const codeRefs = useRef<(HTMLInputElement | null)[]>([]);
  const nameRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [error, setError] = useState<string | null>(null);

  const createMutation = trpc.contracting.destination.createCity.useMutation({
    onSuccess: () => invalidate(),
    onError: (err) => setError(err.message),
  });

  const updateMutation = trpc.contracting.destination.updateCity.useMutation({
    onSuccess: () => invalidate(),
    onError: (err) => setError(err.message),
  });

  const deleteMutation = trpc.contracting.destination.deleteCity.useMutation({
    onSuccess: () => invalidate(),
    onError: (err) => setError(err.message),
  });

  function updateRow(index: number, field: keyof CityRow, value: string | boolean) {
    setRows((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  }

  function saveRow(index: number) {
    const row = rows[index];
    if (!row) return;
    const code = row.code.trim().toUpperCase();
    const name = row.name.trim();
    if (!code || !name) return;
    setError(null);

    if (row.isNew) {
      createMutation.mutate({
        destinationId,
        code,
        name,
        active: row.active,
      });
    } else if (row.id) {
      updateMutation.mutate({
        id: row.id,
        data: { code, name, active: row.active },
      });
    }
  }

  function addNewRow() {
    setRows((prev) => {
      // Only add if last row is not already empty
      const last = prev[prev.length - 1];
      if (last && last.isNew && !last.code && !last.name) return prev;
      return [...prev, { code: "", name: "", active: true, isNew: true }];
    });
  }

  function handleKeyDown(
    e: React.KeyboardEvent<HTMLInputElement>,
    rowIndex: number,
    field: "code" | "name",
  ) {
    if (e.key === "Enter") {
      e.preventDefault();
      saveRow(rowIndex);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      const nextIndex = rowIndex + 1;
      if (nextIndex >= rows.length) {
        // Add new row and focus it
        addNewRow();
        requestAnimationFrame(() => {
          codeRefs.current[nextIndex]?.focus();
        });
      } else {
        (field === "code" ? codeRefs : nameRefs).current[nextIndex]?.focus();
      }
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      const prevIndex = rowIndex - 1;
      if (prevIndex >= 0) {
        (field === "code" ? codeRefs : nameRefs).current[prevIndex]?.focus();
      }
    } else if (e.key === "Escape") {
      const row = rows[rowIndex];
      if (row.isNew && !row.code && !row.name) {
        // Remove empty new row (keep at least one)
        if (rows.filter((r) => r.isNew).length > 1) {
          setRows((prev) => prev.filter((_, i) => i !== rowIndex));
        }
      }
    }
  }

  function handleBlur(rowIndex: number) {
    const row = rows[rowIndex];
    if (!row || row.isNew) return;
    // Auto-save existing rows on blur
    const code = row.code.trim().toUpperCase();
    const name = row.name.trim();
    if (!code || !name) return;
    // Check if changed from original
    const orig = cities.find((c) => c.id === row.id);
    if (orig && (orig.code !== code || orig.name !== name || orig.active !== row.active)) {
      saveRow(rowIndex);
    }
  }

  const savedCount = rows.filter((r) => !r.isNew).length;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Cities ({savedCount})</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[100px]">Code</TableHead>
              <TableHead>Name</TableHead>
              <TableHead className="w-[80px]">Active</TableHead>
              <TableHead className="w-[50px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row, i) => (
              <TableRow
                key={row.id ?? `new-${i}`}
                className={row.isNew ? "bg-muted/30" : undefined}
              >
                <TableCell className="p-1">
                  <Input
                    ref={(el) => { codeRefs.current[i] = el; }}
                    value={row.code}
                    onChange={(e) =>
                      updateRow(i, "code", e.target.value.toUpperCase().slice(0, 3))
                    }
                    onKeyDown={(e) => handleKeyDown(e, i, "code")}
                    onBlur={() => handleBlur(i)}
                    placeholder="ABC"
                    className="h-8 font-mono uppercase"
                    maxLength={3}
                  />
                </TableCell>
                <TableCell className="p-1">
                  <Input
                    ref={(el) => { nameRefs.current[i] = el; }}
                    value={row.name}
                    onChange={(e) => updateRow(i, "name", e.target.value)}
                    onKeyDown={(e) => handleKeyDown(e, i, "name")}
                    onBlur={() => handleBlur(i)}
                    placeholder={row.isNew ? "Type city name and press Enter..." : ""}
                    className="h-8"
                  />
                </TableCell>
                <TableCell className="p-1 text-center">
                  <Checkbox
                    checked={row.active}
                    onCheckedChange={(checked) => {
                      updateRow(i, "active", !!checked);
                      if (!row.isNew && row.id) {
                        updateMutation.mutate({
                          id: row.id,
                          data: {
                            code: row.code.trim().toUpperCase(),
                            name: row.name.trim(),
                            active: !!checked,
                          },
                        });
                      }
                    }}
                  />
                </TableCell>
                <TableCell className="p-1">
                  {!row.isNew && row.id && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      disabled={deleteMutation.isPending}
                      onClick={() => deleteMutation.mutate({ id: row.id! })}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        <p className="mt-2 text-xs text-muted-foreground">
          Press Enter to save a row. Arrow Down on the last row adds a new line.
        </p>

        {error && (
          <p className="mt-2 text-sm text-destructive">{error}</p>
        )}
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Zones Section — Per-City Zone Management
// ---------------------------------------------------------------------------

type ZoneRow = {
  id?: string;
  code: string;
  name: string;
  active: boolean;
  isNew: boolean;
};

function ZonesSection({
  cities,
}: {
  cities: { id: string; name: string; code: string; active: boolean }[];
}) {
  const [selectedCityId, setSelectedCityId] = useState<string | null>(null);

  if (cities.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Zones</CardTitle>
        <CardDescription>
          Select a city to manage its zones. Zones are used in hotel code generation.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {cities.map((city) => (
            <Button
              key={city.id}
              variant={selectedCityId === city.id ? "default" : "outline"}
              size="sm"
              onClick={() =>
                setSelectedCityId(
                  selectedCityId === city.id ? null : city.id,
                )
              }
            >
              {city.code} — {city.name}
            </Button>
          ))}
        </div>

        {selectedCityId && (
          <ZoneCityGrid cityId={selectedCityId} />
        )}
      </CardContent>
    </Card>
  );
}

function ZoneCityGrid({ cityId }: { cityId: string }) {
  const utils = trpc.useUtils();
  const { data: zonesRaw } = trpc.contracting.destination.listZones.useQuery(
    { cityId },
  );
  const zones = zonesRaw ?? [];

  const invalidate = useCallback(() => {
    utils.contracting.destination.listZones.invalidate({ cityId });
  }, [utils, cityId]);

  const [rows, setRows] = useState<ZoneRow[]>([]);

  useEffect(() => {
    if (!zonesRaw) return;
    setRows([
      ...zonesRaw.map((z) => ({
        id: z.id,
        code: z.code,
        name: z.name,
        active: z.active,
        isNew: false,
      })),
      { code: "", name: "", active: true, isNew: true },
    ]);
  }, [zonesRaw]);

  const codeRefs = useRef<(HTMLInputElement | null)[]>([]);
  const nameRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [error, setError] = useState<string | null>(null);

  const createMutation = trpc.contracting.destination.createZone.useMutation({
    onSuccess: () => invalidate(),
    onError: (err) => setError(err.message),
  });

  const updateMutation = trpc.contracting.destination.updateZone.useMutation({
    onSuccess: () => invalidate(),
    onError: (err) => setError(err.message),
  });

  const deleteMutation = trpc.contracting.destination.deleteZone.useMutation({
    onSuccess: () => invalidate(),
    onError: (err) => setError(err.message),
  });

  function updateRow(index: number, field: keyof ZoneRow, value: string | boolean) {
    setRows((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  }

  function saveRow(index: number) {
    const row = rows[index];
    if (!row) return;
    const code = row.code.trim().toUpperCase();
    const name = row.name.trim();
    if (!code || !name) return;
    setError(null);

    if (row.isNew) {
      createMutation.mutate({ cityId, code, name, active: row.active });
    } else if (row.id) {
      updateMutation.mutate({ id: row.id, data: { code, name, active: row.active } });
    }
  }

  function handleKeyDown(
    e: React.KeyboardEvent<HTMLInputElement>,
    rowIndex: number,
    field: "code" | "name",
  ) {
    if (e.key === "Enter") {
      e.preventDefault();
      saveRow(rowIndex);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      const nextIndex = rowIndex + 1;
      if (nextIndex >= rows.length) {
        setRows((prev) => {
          const last = prev[prev.length - 1];
          if (last && last.isNew && !last.code && !last.name) return prev;
          return [...prev, { code: "", name: "", active: true, isNew: true }];
        });
        requestAnimationFrame(() => {
          codeRefs.current[nextIndex]?.focus();
        });
      } else {
        (field === "code" ? codeRefs : nameRefs).current[nextIndex]?.focus();
      }
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      const prevIndex = rowIndex - 1;
      if (prevIndex >= 0) {
        (field === "code" ? codeRefs : nameRefs).current[prevIndex]?.focus();
      }
    }
  }

  function handleBlur(rowIndex: number) {
    const row = rows[rowIndex];
    if (!row || row.isNew) return;
    const code = row.code.trim().toUpperCase();
    const name = row.name.trim();
    if (!code || !name) return;
    const orig = zones.find((z) => z.id === row.id);
    if (orig && (orig.code !== code || orig.name !== name || orig.active !== row.active)) {
      saveRow(rowIndex);
    }
  }

  const savedCount = rows.filter((r) => !r.isNew).length;

  return (
    <div>
      <p className="mb-2 text-sm font-medium">
        Zones ({savedCount})
      </p>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[80px]">Code</TableHead>
            <TableHead>Name</TableHead>
            <TableHead className="w-[80px]">Active</TableHead>
            <TableHead className="w-[50px]" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row, i) => (
            <TableRow
              key={row.id ?? `new-${i}`}
              className={row.isNew ? "bg-muted/30" : undefined}
            >
              <TableCell className="p-1">
                <Input
                  ref={(el) => { codeRefs.current[i] = el; }}
                  value={row.code}
                  onChange={(e) =>
                    updateRow(i, "code", e.target.value.toUpperCase().slice(0, 1))
                  }
                  onKeyDown={(e) => handleKeyDown(e, i, "code")}
                  onBlur={() => handleBlur(i)}
                  placeholder="A"
                  className="h-8 font-mono uppercase"
                  maxLength={1}
                />
              </TableCell>
              <TableCell className="p-1">
                <Input
                  ref={(el) => { nameRefs.current[i] = el; }}
                  value={row.name}
                  onChange={(e) => updateRow(i, "name", e.target.value)}
                  onKeyDown={(e) => handleKeyDown(e, i, "name")}
                  onBlur={() => handleBlur(i)}
                  placeholder={row.isNew ? "Type zone name and press Enter..." : ""}
                  className="h-8"
                />
              </TableCell>
              <TableCell className="p-1 text-center">
                <Checkbox
                  checked={row.active}
                  onCheckedChange={(checked) => {
                    updateRow(i, "active", !!checked);
                    if (!row.isNew && row.id) {
                      updateMutation.mutate({
                        id: row.id,
                        data: {
                          code: row.code.trim().toUpperCase(),
                          name: row.name.trim(),
                          active: !!checked,
                        },
                      });
                    }
                  }}
                />
              </TableCell>
              <TableCell className="p-1">
                {!row.isNew && row.id && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    disabled={deleteMutation.isPending}
                    onClick={() => deleteMutation.mutate({ id: row.id! })}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <p className="mt-2 text-xs text-muted-foreground">
        Code must be a single uppercase letter. Press Enter to save.
      </p>

      {error && (
        <p className="mt-2 text-sm text-destructive">{error}</p>
      )}
    </div>
  );
}
