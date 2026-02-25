"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { Pencil, Plus, Save, Trash2, X } from "lucide-react";
import Link from "next/link";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CONTRACT_STATUS_LABELS, CONTRACT_STATUS_VARIANTS } from "@/lib/constants/contracting";
import { trpc } from "@/lib/trpc";
import { tourOperatorUpdateSchema } from "@/lib/validations/contracting";

type FormValues = z.input<typeof tourOperatorUpdateSchema>;

export default function TourOperatorDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const utils = trpc.useUtils();
  const [editing, setEditing] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [showAssignHotel, setShowAssignHotel] = useState(false);
  const [showAssignContract, setShowAssignContract] = useState(false);
  const [selectedHotelId, setSelectedHotelId] = useState<string | null>(null);
  const [cascadeToContracts, setCascadeToContracts] = useState(true);
  const [selectedContractId, setSelectedContractId] = useState<string | null>(null);
  const [hotelSearch, setHotelSearch] = useState("");
  const [contractSearch, setContractSearch] = useState("");

  const { data: to, isLoading } = trpc.contracting.tourOperator.getById.useQuery(
    { id: params.id },
  );
  const { data: countries } = trpc.setup.getCountries.useQuery();
  const { data: markets } = trpc.contracting.market.list.useQuery();

  const form = useForm<FormValues>({
    resolver: zodResolver(tourOperatorUpdateSchema),
  });

  useEffect(() => {
    if (to) {
      form.reset({
        name: to.name,
        code: to.code,
        contactPerson: to.contactPerson,
        email: to.email,
        phone: to.phone,
        countryId: to.country?.id ?? undefined,
        marketId: to.market?.id ?? undefined,
        active: to.active,
      });
    }
  }, [to, form]);

  const updateMutation = trpc.contracting.tourOperator.update.useMutation({
    onSuccess: () => {
      utils.contracting.tourOperator.getById.invalidate({ id: params.id });
      utils.contracting.tourOperator.list.invalidate();
      setEditing(false);
    },
  });

  const deleteMutation = trpc.contracting.tourOperator.delete.useMutation({
    onSuccess: () => {
      utils.contracting.tourOperator.list.invalidate();
      router.push("/contracting/tour-operators");
    },
  });

  const unassignContractMutation =
    trpc.contracting.tourOperator.unassignFromContract.useMutation({
      onSuccess: () => {
        utils.contracting.tourOperator.getById.invalidate({ id: params.id });
      },
    });

  const unassignHotelMutation =
    trpc.contracting.tourOperator.unassignFromHotel.useMutation({
      onSuccess: () => {
        utils.contracting.tourOperator.getById.invalidate({ id: params.id });
      },
    });

  const { data: allHotels } = trpc.contracting.hotel.list.useQuery(undefined, {
    enabled: showAssignHotel,
  });
  const { data: allContracts } = trpc.contracting.contract.list.useQuery(undefined, {
    enabled: showAssignContract,
  });

  const assignHotelMutation =
    trpc.contracting.tourOperator.assignToHotel.useMutation({
      onSuccess: () => {
        utils.contracting.tourOperator.getById.invalidate({ id: params.id });
        setShowAssignHotel(false);
        setSelectedHotelId(null);
        setHotelSearch("");
        setCascadeToContracts(true);
      },
    });

  const assignContractMutation =
    trpc.contracting.tourOperator.assignToContract.useMutation({
      onSuccess: () => {
        utils.contracting.tourOperator.getById.invalidate({ id: params.id });
        setShowAssignContract(false);
        setSelectedContractId(null);
        setContractSearch("");
      },
    });

  // Already-assigned IDs for filtering out from selection
  const assignedHotelIds = useMemo(
    () => new Set((to?.hotelAssignments ?? []).map((a) => a.hotel.id)),
    [to?.hotelAssignments],
  );
  const assignedContractIds = useMemo(
    () => new Set((to?.contractAssignments ?? []).map((a) => a.contract.id)),
    [to?.contractAssignments],
  );

  const availableHotels = useMemo(() => {
    const list = (allHotels ?? []).filter((h) => !assignedHotelIds.has(h.id));
    const q = hotelSearch.toLowerCase().trim();
    if (!q) return list;
    return list.filter(
      (h) =>
        h.name.toLowerCase().includes(q) ||
        h.code.toLowerCase().includes(q) ||
        (h.city ?? "").toLowerCase().includes(q),
    );
  }, [allHotels, assignedHotelIds, hotelSearch]);

  const availableContracts = useMemo(() => {
    const list = (allContracts ?? []).filter((c) => !assignedContractIds.has(c.id));
    const q = contractSearch.toLowerCase().trim();
    if (!q) return list;
    return list.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.code.toLowerCase().includes(q) ||
        (c.hotel?.name ?? "").toLowerCase().includes(q),
    );
  }, [allContracts, assignedContractIds, contractSearch]);

  function onSubmit(values: FormValues) {
    updateMutation.mutate({ id: params.id, data: values });
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!to) return null;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{to.name}</h1>
          <p className="text-muted-foreground">
            <span className="font-mono">{to.code}</span>
            {to.market && <> &middot; {to.market.name}</>}
            {to.country && <> &middot; {to.country.name}</>}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={to.active ? "default" : "secondary"}>
            {to.active ? "Active" : "Inactive"}
          </Badge>
          {!editing ? (
            <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
              <Pencil className="mr-1 size-3" /> Edit
            </Button>
          ) : (
            <Button variant="ghost" size="sm" onClick={() => setEditing(false)}>
              <X className="mr-1 size-3" /> Cancel
            </Button>
          )}
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setShowDelete(true)}
          >
            <Trash2 className="mr-1 size-3" /> Delete
          </Button>
        </div>
      </div>

      <Tabs defaultValue="info">
        <TabsList>
          <TabsTrigger value="info">Info</TabsTrigger>
          <TabsTrigger value="contracts">
            Contracts ({to.contractAssignments.length})
          </TabsTrigger>
          <TabsTrigger value="hotels">
            Hotels ({to.hotelAssignments.length})
          </TabsTrigger>
        </TabsList>

        {/* ── Info Tab ── */}
        <TabsContent value="info">
          <Card>
            <CardHeader>
              <CardTitle>Tour Operator Details</CardTitle>
            </CardHeader>
            <CardContent>
              {editing ? (
                <Form {...form}>
                  <form
                    onSubmit={form.handleSubmit(onSubmit)}
                    className="space-y-4"
                  >
                    <div className="grid grid-cols-2 gap-4">
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
                    </div>

                    <FormField
                      control={form.control}
                      name="contactPerson"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Contact Person</FormLabel>
                          <FormControl>
                            <Input {...field} value={field.value ?? ""} />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email</FormLabel>
                            <FormControl>
                              <Input {...field} value={field.value ?? ""} />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="phone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Phone</FormLabel>
                            <FormControl>
                              <Input {...field} value={field.value ?? ""} />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
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
                                <SelectTrigger>
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
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="marketId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Market</FormLabel>
                            <Select
                              onValueChange={field.onChange}
                              value={field.value ?? ""}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select market" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {(markets ?? []).map((m) => (
                                  <SelectItem key={m.id} value={m.id}>
                                    {m.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="active"
                      render={({ field }) => (
                        <FormItem className="flex items-center gap-2 space-y-0">
                          <FormControl>
                            <Checkbox
                              checked={field.value ?? true}
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

                    <Button type="submit" disabled={updateMutation.isPending}>
                      <Save className="mr-1 size-3" />
                      {updateMutation.isPending ? "Saving..." : "Save Changes"}
                    </Button>
                  </form>
                </Form>
              ) : (
                <dl className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <dt className="text-muted-foreground">Name</dt>
                    <dd className="font-medium">{to.name}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Code</dt>
                    <dd className="font-mono">{to.code}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Contact Person</dt>
                    <dd>{to.contactPerson || "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Email</dt>
                    <dd>{to.email || "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Phone</dt>
                    <dd>{to.phone || "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Country</dt>
                    <dd>{to.country?.name || "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Market</dt>
                    <dd>{to.market?.name || "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Status</dt>
                    <dd>
                      <Badge variant={to.active ? "default" : "secondary"}>
                        {to.active ? "Active" : "Inactive"}
                      </Badge>
                    </dd>
                  </div>
                </dl>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Contracts Tab ── */}
        <TabsContent value="contracts">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Assigned Contracts</CardTitle>
              <Button size="sm" onClick={() => setShowAssignContract(true)}>
                <Plus className="mr-1 size-3" /> Assign Contract
              </Button>
            </CardHeader>
            <CardContent>
              {to.contractAssignments.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No contracts assigned to this tour operator yet.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Contract</TableHead>
                      <TableHead>Hotel</TableHead>
                      <TableHead>Validity</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Assigned</TableHead>
                      <TableHead className="w-[80px]" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {to.contractAssignments.map((a) => (
                      <TableRow key={a.id}>
                        <TableCell>
                          <Link
                            href={`/contracting/contracts/${a.contract.id}`}
                            className="font-medium hover:underline"
                          >
                            {a.contract.name}
                          </Link>
                          <div className="text-xs text-muted-foreground font-mono">
                            {a.contract.code}
                          </div>
                        </TableCell>
                        <TableCell>{a.contract.hotel.name}</TableCell>
                        <TableCell className="text-sm">
                          {format(new Date(a.contract.validFrom), "dd MMM yyyy")} –{" "}
                          {format(new Date(a.contract.validTo), "dd MMM yyyy")}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              (CONTRACT_STATUS_VARIANTS[
                                a.contract.status as keyof typeof CONTRACT_STATUS_VARIANTS
                              ] ?? "secondary") as "default" | "secondary" | "destructive" | "outline"
                            }
                          >
                            {CONTRACT_STATUS_LABELS[
                              a.contract.status as keyof typeof CONTRACT_STATUS_LABELS
                            ] ?? a.contract.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {format(new Date(a.assignedAt), "dd MMM yyyy")}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              unassignContractMutation.mutate({
                                contractId: a.contract.id,
                                tourOperatorId: to.id,
                              })
                            }
                          >
                            <X className="size-3" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Hotels Tab ── */}
        <TabsContent value="hotels">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Assigned Hotels</CardTitle>
              <Button size="sm" onClick={() => setShowAssignHotel(true)}>
                <Plus className="mr-1 size-3" /> Assign Hotel
              </Button>
            </CardHeader>
            <CardContent>
              {to.hotelAssignments.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No hotels assigned to this tour operator yet.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Hotel</TableHead>
                      <TableHead>Code</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Contracts</TableHead>
                      <TableHead>Assigned</TableHead>
                      <TableHead className="w-[80px]" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {to.hotelAssignments.map((a) => (
                      <TableRow key={a.id}>
                        <TableCell>
                          <Link
                            href={`/contracting/hotels/${a.hotel.id}`}
                            className="font-medium hover:underline"
                          >
                            {a.hotel.name}
                          </Link>
                        </TableCell>
                        <TableCell className="font-mono">{a.hotel.code}</TableCell>
                        <TableCell>
                          {a.hotel.city}
                          {a.hotel.country && `, ${a.hotel.country.name}`}
                        </TableCell>
                        <TableCell>{a.hotel._count.contracts}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {format(new Date(a.assignedAt), "dd MMM yyyy")}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              unassignHotelMutation.mutate({
                                hotelId: a.hotel.id,
                                tourOperatorId: to.id,
                              })
                            }
                          >
                            <X className="size-3" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Delete confirmation */}
      <Dialog open={showDelete} onOpenChange={setShowDelete}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Tour Operator</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &ldquo;{to.name}&rdquo;? This will also
              remove all contract and hotel assignments. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDelete(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={deleteMutation.isPending}
              onClick={() => deleteMutation.mutate({ id: to.id })}
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign Hotel Dialog */}
      <Dialog
        open={showAssignHotel}
        onOpenChange={(open) => {
          setShowAssignHotel(open);
          if (!open) {
            setSelectedHotelId(null);
            setHotelSearch("");
            setCascadeToContracts(true);
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Assign Hotel</DialogTitle>
            <DialogDescription>
              Select a hotel to assign to this tour operator.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              placeholder="Search hotels..."
              value={hotelSearch}
              onChange={(e) => setHotelSearch(e.target.value)}
              className="h-8"
            />
            <div className="max-h-56 overflow-y-auto rounded-md border p-2 space-y-0.5">
              {availableHotels.map((h) => (
                <label
                  key={h.id}
                  className={`flex items-center gap-2 text-sm cursor-pointer rounded px-2 py-1.5 ${
                    selectedHotelId === h.id
                      ? "bg-primary/10 font-medium"
                      : "hover:bg-muted/50"
                  }`}
                >
                  <input
                    type="radio"
                    name="assignHotel"
                    className="accent-primary"
                    checked={selectedHotelId === h.id}
                    onChange={() => setSelectedHotelId(h.id)}
                  />
                  <span>
                    {h.name}{" "}
                    <span className="font-mono text-xs text-muted-foreground">
                      {h.code}
                    </span>
                    {h.city && (
                      <span className="text-xs text-muted-foreground">
                        {" "}— {h.city}
                      </span>
                    )}
                  </span>
                </label>
              ))}
              {availableHotels.length === 0 && (
                <p className="text-xs text-muted-foreground py-3 text-center">
                  {hotelSearch ? "No hotels match your search" : "No unassigned hotels available"}
                </p>
              )}
            </div>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <Checkbox
                checked={cascadeToContracts}
                onCheckedChange={(v) => setCascadeToContracts(!!v)}
              />
              Also assign to published contracts
            </label>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowAssignHotel(false)}
            >
              Cancel
            </Button>
            <Button
              disabled={!selectedHotelId || assignHotelMutation.isPending}
              onClick={() => {
                if (!selectedHotelId) return;
                assignHotelMutation.mutate({
                  hotelId: selectedHotelId,
                  tourOperatorIds: [to.id],
                  cascadeToContracts,
                });
              }}
            >
              {assignHotelMutation.isPending ? "Assigning..." : "Assign"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign Contract Dialog */}
      <Dialog
        open={showAssignContract}
        onOpenChange={(open) => {
          setShowAssignContract(open);
          if (!open) {
            setSelectedContractId(null);
            setContractSearch("");
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Assign Contract</DialogTitle>
            <DialogDescription>
              Select a contract to assign to this tour operator.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              placeholder="Search contracts..."
              value={contractSearch}
              onChange={(e) => setContractSearch(e.target.value)}
              className="h-8"
            />
            <div className="max-h-56 overflow-y-auto rounded-md border p-2 space-y-0.5">
              {availableContracts.map((c) => (
                <label
                  key={c.id}
                  className={`flex items-center gap-2 text-sm cursor-pointer rounded px-2 py-1.5 ${
                    selectedContractId === c.id
                      ? "bg-primary/10 font-medium"
                      : "hover:bg-muted/50"
                  }`}
                >
                  <input
                    type="radio"
                    name="assignContract"
                    className="accent-primary"
                    checked={selectedContractId === c.id}
                    onChange={() => setSelectedContractId(c.id)}
                  />
                  <span>
                    {c.name}{" "}
                    <span className="font-mono text-xs text-muted-foreground">
                      {c.code}
                    </span>
                    {c.hotel?.name && (
                      <span className="text-xs text-muted-foreground">
                        {" "}— {c.hotel.name}
                      </span>
                    )}
                  </span>
                </label>
              ))}
              {availableContracts.length === 0 && (
                <p className="text-xs text-muted-foreground py-3 text-center">
                  {contractSearch ? "No contracts match your search" : "No unassigned contracts available"}
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowAssignContract(false)}
            >
              Cancel
            </Button>
            <Button
              disabled={!selectedContractId || assignContractMutation.isPending}
              onClick={() => {
                if (!selectedContractId) return;
                assignContractMutation.mutate({
                  contractId: selectedContractId,
                  tourOperatorIds: [to.id],
                });
              }}
            >
              {assignContractMutation.isPending ? "Assigning..." : "Assign"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
