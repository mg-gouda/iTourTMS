"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import type { z } from "zod";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  STAR_RATING_LABELS,
  MEAL_CODE_LABELS,
  CHILD_AGE_CATEGORY_LABELS,
  CONTRACT_STATUS_LABELS,
  CONTRACT_STATUS_VARIANTS,
} from "@/lib/constants/contracting";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  roomTypeCreateSchema,
  roomTypeUpdateSchema,
  childPolicyCreateSchema,
  mealBasisCreateSchema,
  hotelImageCreateSchema,
} from "@/lib/validations/contracting";

// ============================================================================
// Main Page
// ============================================================================

function HotelTourOperatorsTab({ hotelId }: { hotelId: string }) {
  const utils = trpc.useUtils();
  const [assignOpen, setAssignOpen] = useState(false);
  const [selectedTOs, setSelectedTOs] = useState<string[]>([]);
  const [cascade, setCascade] = useState(true);

  const { data: assignments, isLoading } =
    trpc.contracting.tourOperator.listByHotel.useQuery({ hotelId });

  const { data: allTOs } = trpc.contracting.tourOperator.list.useQuery(
    undefined,
    { enabled: assignOpen },
  );

  const assignedIds = new Set((assignments ?? []).map((a) => a.tourOperatorId));
  const availableTOs = (allTOs ?? []).filter(
    (to) => to.active && !assignedIds.has(to.id),
  );

  const assignMutation = trpc.contracting.tourOperator.assignToHotel.useMutation({
    onSuccess: (result) => {
      utils.contracting.tourOperator.listByHotel.invalidate({ hotelId });
      setAssignOpen(false);
      setSelectedTOs([]);
      toast.success(
        `Assigned ${result.hotelAssigned} TO(s)${result.contractAssignments > 0 ? `, cascaded to ${result.contractAssignments} contract assignment(s)` : ""}`,
      );
    },
  });

  const unassignMutation = trpc.contracting.tourOperator.unassignFromHotel.useMutation({
    onSuccess: () => {
      utils.contracting.tourOperator.listByHotel.invalidate({ hotelId });
      toast.success("Tour operator unassigned");
    },
  });

  if (isLoading) {
    return <div className="py-8 text-center text-muted-foreground">Loading...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {assignments?.length ?? 0} tour operator(s) assigned
        </p>
        <Button size="sm" onClick={() => setAssignOpen(true)}>
          Add Tour Operator
        </Button>
      </div>

      {(assignments?.length ?? 0) === 0 ? (
        <div className="py-8 text-center text-muted-foreground">
          No tour operators assigned to this hotel.
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Code</TableHead>
              <TableHead>Country</TableHead>
              <TableHead>Market</TableHead>
              <TableHead>Assigned</TableHead>
              <TableHead className="w-[60px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {(assignments ?? []).map((a) => (
              <TableRow key={a.id}>
                <TableCell className="font-medium">{a.tourOperator.name}</TableCell>
                <TableCell className="font-mono">{a.tourOperator.code}</TableCell>
                <TableCell>{a.tourOperator.country?.name ?? "—"}</TableCell>
                <TableCell>{a.tourOperator.market?.name ?? "—"}</TableCell>
                <TableCell className="text-muted-foreground">
                  {format(new Date(a.assignedAt), "dd MMM yyyy")}
                </TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-destructive hover:text-destructive"
                    onClick={() =>
                      unassignMutation.mutate({
                        hotelId,
                        tourOperatorId: a.tourOperatorId,
                      })
                    }
                  >
                    ✕
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {/* Assign Dialog */}
      <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Assign Tour Operators</DialogTitle>
            <DialogDescription>
              Select tour operators to assign to this hotel.
            </DialogDescription>
          </DialogHeader>

          {availableTOs.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              All active tour operators are already assigned.
            </p>
          ) : (
            <div className="max-h-[300px] space-y-2 overflow-y-auto">
              {availableTOs.map((to) => (
                <label
                  key={to.id}
                  className="flex items-center gap-2 rounded p-2 hover:bg-muted/50 cursor-pointer"
                >
                  <Checkbox
                    checked={selectedTOs.includes(to.id)}
                    onCheckedChange={(checked) => {
                      setSelectedTOs((prev) =>
                        checked ? [...prev, to.id] : prev.filter((id) => id !== to.id),
                      );
                    }}
                  />
                  <span className="text-sm font-medium">{to.name}</span>
                  <span className="text-xs text-muted-foreground font-mono">{to.code}</span>
                </label>
              ))}
            </div>
          )}

          <div className="flex items-center gap-2">
            <Checkbox
              id="cascade"
              checked={cascade}
              onCheckedChange={(v) => setCascade(!!v)}
            />
            <label htmlFor="cascade" className="text-sm">
              Also assign to published contracts
            </label>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={selectedTOs.length === 0 || assignMutation.isPending}
              onClick={() =>
                assignMutation.mutate({
                  hotelId,
                  tourOperatorIds: selectedTOs,
                  cascadeToContracts: cascade,
                })
              }
            >
              Assign ({selectedTOs.length})
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function HotelDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const utils = trpc.useUtils();
  const [deleteOpen, setDeleteOpen] = useState(false);

  const { data: hotel, isLoading } = trpc.contracting.hotel.getById.useQuery({ id });

  const deleteMutation = trpc.contracting.hotel.delete.useMutation({
    onSuccess: () => {
      utils.contracting.hotel.list.invalidate();
      router.push("/contracting/hotels");
    },
  });

  if (isLoading) {
    return <div className="py-10 text-center text-muted-foreground">Loading...</div>;
  }
  if (!hotel) {
    return <div className="py-10 text-center text-muted-foreground">Hotel not found</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight">{hotel.name}</h1>
            <Badge variant="outline">
              {STAR_RATING_LABELS[hotel.starRating] ?? hotel.starRating}
            </Badge>
            <Badge variant={hotel.active ? "default" : "secondary"}>
              {hotel.active ? "Active" : "Inactive"}
            </Badge>
          </div>
          <p className="text-muted-foreground">
            <span className="font-mono">{hotel.code}</span> — {hotel.cityRel?.name ?? hotel.city},{" "}
            {hotel.country?.name}
            {hotel.destination ? ` (${hotel.destination.name})` : ""}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => router.push(`/contracting/hotels/${id}/edit`)}
          >
            Edit
          </Button>
          <Button variant="destructive" onClick={() => setDeleteOpen(true)}>
            Delete
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="rooms">
            Room Types ({hotel.roomTypes?.length ?? 0})
          </TabsTrigger>
          <TabsTrigger value="children">
            Children Policy ({hotel.childrenPolicies?.length ?? 0})
          </TabsTrigger>
          <TabsTrigger value="meals">
            Meal Basis ({hotel.mealBasis?.length ?? 0})
          </TabsTrigger>
          <TabsTrigger value="gallery">
            Gallery ({hotel.images?.length ?? 0})
          </TabsTrigger>
          <TabsTrigger value="tour-operators">Tour Operators</TabsTrigger>
          <TabsTrigger value="contracts">Contracts</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4">
          <OverviewTab hotel={hotel} />
        </TabsContent>

        <TabsContent value="rooms" className="mt-4">
          <RoomTypesTab hotelId={id} roomTypes={hotel.roomTypes ?? []} />
        </TabsContent>

        <TabsContent value="children" className="mt-4">
          <ChildrenPolicyTab
            hotelId={id}
            policies={hotel.childrenPolicies ?? []}
          />
        </TabsContent>

        <TabsContent value="meals" className="mt-4">
          <MealBasisTab hotelId={id} meals={hotel.mealBasis ?? []} />
        </TabsContent>

        <TabsContent value="gallery" className="mt-4">
          <GalleryTab hotelId={id} images={hotel.images ?? []} />
        </TabsContent>

        <TabsContent value="tour-operators" className="mt-4">
          <HotelTourOperatorsTab hotelId={id} />
        </TabsContent>

        <TabsContent value="contracts" className="mt-4">
          <HotelContractsTab hotelId={id} />
        </TabsContent>
      </Tabs>

      {/* Delete Dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Hotel</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;{hotel.name}&quot;? This
              will also remove all room types, policies, and images.
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

// ============================================================================
// Overview Tab
// ============================================================================

function OverviewTab({ hotel }: { hotel: any }) {
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Details</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="space-y-3 text-sm">
            <Row label="Chain" value={hotel.chainName} />
            <Row label="Star Rating" value={STAR_RATING_LABELS[hotel.starRating]} />
            <Row label="Total Rooms" value={hotel.totalRooms} />
            <Row label="Check-in" value={hotel.checkInTime} />
            <Row label="Check-out" value={hotel.checkOutTime} />
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Location</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="space-y-3 text-sm">
            <Row label="Address" value={hotel.address} />
            <Row label="City" value={hotel.cityRel ? `${hotel.cityRel.code} — ${hotel.cityRel.name}` : hotel.city} />
            <Row label="State" value={hotel.state?.name} />
            <Row label="Country" value={hotel.country?.name} />
            <Row label="Destination" value={hotel.destination?.name} />
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Contact</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="space-y-3 text-sm">
            <Row label="Phone" value={hotel.phone} />
            <Row label="Email" value={hotel.email} />
            <Row label="Website" value={hotel.website} />
            <Row label="Reservation Email" value={hotel.reservationEmail} />
            <Row label="Contact Person" value={hotel.contactPerson} />
          </dl>
        </CardContent>
      </Card>

      {hotel.amenities?.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Amenities</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {hotel.amenities.map((a: any) => (
                <Badge key={a.id} variant="secondary">
                  {a.name}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {hotel.description && (
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Description</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap text-sm">{hotel.description}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: any }) {
  return (
    <div className="flex justify-between">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium">{value ?? "—"}</dd>
    </div>
  );
}

// ============================================================================
// Room Types Tab
// ============================================================================

function RoomTypesTab({
  hotelId,
  roomTypes,
}: {
  hotelId: string;
  roomTypes: any[];
}) {
  const utils = trpc.useUtils();
  const [addOpen, setAddOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const form = useForm<z.input<typeof roomTypeCreateSchema>>({
    resolver: zodResolver(roomTypeCreateSchema),
    defaultValues: {
      hotelId,
      name: "",
      code: "",
      minAdults: 1,
      standardAdults: 2,
      maxAdults: 2,
      maxChildren: 1,
      maxInfants: 1,
      maxOccupancy: 3,
      extraBedAvailable: false,
      maxExtraBeds: 0,
      active: true,
    },
  });

  const editForm = useForm<z.input<typeof roomTypeUpdateSchema>>({
    resolver: zodResolver(roomTypeUpdateSchema),
  });

  const createMutation = trpc.contracting.roomType.create.useMutation({
    onSuccess: () => {
      utils.contracting.hotel.getById.invalidate({ id: hotelId });
      setAddOpen(false);
      form.reset();
    },
  });

  const updateMutation = trpc.contracting.roomType.update.useMutation({
    onSuccess: () => {
      utils.contracting.hotel.getById.invalidate({ id: hotelId });
      setEditingId(null);
    },
  });

  const deleteMutation = trpc.contracting.roomType.delete.useMutation({
    onSuccess: () => utils.contracting.hotel.getById.invalidate({ id: hotelId }),
  });

  function openEdit(rt: any) {
    editForm.reset({
      name: rt.name,
      code: rt.code,
      description: rt.description ?? undefined,
      minAdults: rt.minAdults,
      standardAdults: rt.standardAdults,
      maxAdults: rt.maxAdults,
      maxChildren: rt.maxChildren,
      maxInfants: rt.maxInfants,
      maxOccupancy: rt.maxOccupancy,
      extraBedAvailable: rt.extraBedAvailable,
      maxExtraBeds: rt.maxExtraBeds,
      roomSize: rt.roomSize ?? undefined,
      bedConfiguration: rt.bedConfiguration ?? undefined,
      active: rt.active,
    });
    setEditingId(rt.id);
  }

  function openCopy(rt: any) {
    form.reset({
      hotelId,
      name: `${rt.name} (Copy)`,
      code: `${rt.code}-CPY`,
      description: rt.description ?? undefined,
      minAdults: rt.minAdults,
      standardAdults: rt.standardAdults,
      maxAdults: rt.maxAdults,
      maxChildren: rt.maxChildren,
      maxInfants: rt.maxInfants,
      maxOccupancy: rt.maxOccupancy,
      extraBedAvailable: rt.extraBedAvailable,
      maxExtraBeds: rt.maxExtraBeds,
      roomSize: rt.roomSize ?? undefined,
      bedConfiguration: rt.bedConfiguration ?? undefined,
      active: rt.active,
    });
    setAddOpen(true);
  }




  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setAddOpen(true)}>Add Room Type</Button>
      </div>

      {roomTypes.length === 0 ? (
        <div className="py-8 text-center text-muted-foreground">
          No room types yet. Add one to get started.
        </div>
      ) : (
        <div className="space-y-2">
          {roomTypes.map((rt) => (
            <Card key={rt.id}>
              <CardHeader
                className="cursor-pointer"
                onClick={() =>
                  setExpandedId(expandedId === rt.id ? null : rt.id)
                }
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <CardTitle className="text-base">{rt.name}</CardTitle>
                    <span className="font-mono text-sm text-muted-foreground">
                      {rt.code}
                    </span>
                    <Badge variant={rt.active ? "default" : "secondary"}>
                      {rt.active ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span>
                      Max: {rt.maxAdults}A/{rt.maxChildren}C/{rt.maxInfants}I
                    </span>
                    <span>{rt.occupancyTable?.length ?? 0} occupancies</span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        openEdit(rt);
                      }}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        openCopy(rt);
                      }}
                    >
                      Copy
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteMutation.mutate({ id: rt.id, hotelId });
                      }}
                    >
                      Remove
                    </Button>
                  </div>
                </div>
              </CardHeader>
              {expandedId === rt.id && (
                <CardContent>
                  <div className="space-y-3">
                    <h4 className="text-sm font-medium">Occupancy Table</h4>
                    {rt.occupancyTable && rt.occupancyTable.length > 0 ? (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Adults</TableHead>
                            <TableHead>Children</TableHead>
                            <TableHead>Infants</TableHead>
                            <TableHead>Default</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {rt.occupancyTable.map((occ: any) => (
                            <TableRow key={occ.id}>
                              <TableCell>{occ.adults}</TableCell>
                              <TableCell>{occ.children}</TableCell>
                              <TableCell>{occ.infants}</TableCell>
                              <TableCell>
                                {occ.isDefault ? "Yes" : "—"}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        No occupancy combinations defined.
                      </p>
                    )}
                    {rt.description && (
                      <p className="text-sm text-muted-foreground">
                        {rt.description}
                      </p>
                    )}
                    <div className="flex gap-4 text-sm text-muted-foreground">
                      {rt.roomSize && <span>Size: {rt.roomSize} m²</span>}
                      {rt.bedConfiguration && (
                        <span>Bed: {rt.bedConfiguration}</span>
                      )}
                      {rt.extraBedAvailable && (
                        <span>Extra beds: up to {rt.maxExtraBeds}</span>
                      )}
                    </div>
                  </div>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Add Room Type Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add Room Type</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit((v) => createMutation.mutate(v))}
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
                        <Input placeholder="Standard Double" {...field} />
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
                        <Input placeholder="STD" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="flex items-end gap-4">
                <div className="grid flex-1 grid-cols-5 gap-4">
                  <FormField
                    control={form.control}
                    name="minAdults"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Min Adults</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            {...field}
                            onChange={(e) => field.onChange(Number(e.target.value))}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="standardAdults"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Std Adults</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            {...field}
                            onChange={(e) => field.onChange(Number(e.target.value))}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="maxAdults"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Max Adults</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            {...field}
                            onChange={(e) => {
                              const val = Number(e.target.value);
                              field.onChange(val);
                              form.setValue("maxOccupancy", val + (form.getValues("maxChildren") || 0));
                            }}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="maxChildren"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Max Children</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            {...field}
                            onChange={(e) => {
                              const val = Number(e.target.value);
                              field.onChange(val);
                              form.setValue("maxOccupancy", (form.getValues("maxAdults") || 0) + val);
                            }}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="maxOccupancy"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Max Total</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            {...field}
                            readOnly
                            className="bg-muted"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="maxInfants"
                  render={({ field }) => (
                    <FormItem className="flex items-center gap-2 pb-2">
                      <FormControl>
                        <Checkbox
                          checked={(field.value ?? 0) > 0}
                          onCheckedChange={(checked) => field.onChange(checked ? 1 : 0)}
                        />
                      </FormControl>
                      <FormLabel className="!mt-0 whitespace-nowrap">Inf Allow</FormLabel>
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        rows={2}
                        {...field}
                        value={field.value ?? ""}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              {createMutation.error && (
                <p className="text-sm text-destructive">
                  {createMutation.error.message}
                </p>
              )}
              <DialogFooter>
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending ? "Adding..." : "Add Room Type"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Edit Room Type Dialog */}
      <Dialog open={!!editingId} onOpenChange={(open) => { if (!open) setEditingId(null); }}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Room Type</DialogTitle>
          </DialogHeader>
          <Form {...editForm}>
            <form
              onSubmit={editForm.handleSubmit((v) =>
                updateMutation.mutate({ id: editingId!, hotelId, data: v })
              )}
              className="space-y-4"
            >
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={editForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Standard Double" {...field} value={field.value ?? ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Code</FormLabel>
                      <FormControl>
                        <Input placeholder="STD" {...field} value={field.value ?? ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="flex items-end gap-4">
                <div className="grid flex-1 grid-cols-5 gap-4">
                  <FormField
                    control={editForm.control}
                    name="minAdults"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Min Adults</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            {...field}
                            value={field.value ?? ""}
                            onChange={(e) => field.onChange(Number(e.target.value))}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={editForm.control}
                    name="standardAdults"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Std Adults</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            {...field}
                            value={field.value ?? ""}
                            onChange={(e) => field.onChange(Number(e.target.value))}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={editForm.control}
                    name="maxAdults"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Max Adults</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            {...field}
                            value={field.value ?? ""}
                            onChange={(e) => {
                              const val = Number(e.target.value);
                              field.onChange(val);
                              editForm.setValue("maxOccupancy", val + (editForm.getValues("maxChildren") || 0));
                            }}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={editForm.control}
                    name="maxChildren"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Max Children</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            {...field}
                            value={field.value ?? ""}
                            onChange={(e) => {
                              const val = Number(e.target.value);
                              field.onChange(val);
                              editForm.setValue("maxOccupancy", (editForm.getValues("maxAdults") || 0) + val);
                            }}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={editForm.control}
                    name="maxOccupancy"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Max Total</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            {...field}
                            value={field.value ?? ""}
                            readOnly
                            className="bg-muted"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={editForm.control}
                  name="maxInfants"
                  render={({ field }) => (
                    <FormItem className="flex items-center gap-2 pb-2">
                      <FormControl>
                        <Checkbox
                          checked={(field.value ?? 0) > 0}
                          onCheckedChange={(checked) => field.onChange(checked ? 1 : 0)}
                        />
                      </FormControl>
                      <FormLabel className="!mt-0 whitespace-nowrap">Inf Allow</FormLabel>
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={editForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        rows={2}
                        {...field}
                        value={field.value ?? ""}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              <div className="flex items-center gap-2">
                <FormField
                  control={editForm.control}
                  name="active"
                  render={({ field }) => (
                    <FormItem className="flex items-center gap-2">
                      <FormControl>
                        <Checkbox
                          checked={field.value ?? true}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <FormLabel className="!mt-0">Active</FormLabel>
                    </FormItem>
                  )}
                />
              </div>
              {updateMutation.error && (
                <p className="text-sm text-destructive">
                  {updateMutation.error.message}
                </p>
              )}
              <DialogFooter>
                <Button type="submit" disabled={updateMutation.isPending}>
                  {updateMutation.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ============================================================================
// Children Policy Tab
// ============================================================================

function ChildrenPolicyTab({
  hotelId,
  policies,
}: {
  hotelId: string;
  policies: any[];
}) {
  const utils = trpc.useUtils();
  const [addOpen, setAddOpen] = useState(false);

  const form = useForm<z.input<typeof childPolicyCreateSchema>>({
    resolver: zodResolver(childPolicyCreateSchema),
    defaultValues: {
      hotelId,
      category: "CHILD",
      ageFrom: 0,
      ageTo: 11,
      label: "",
      freeInSharing: false,
      maxFreePerRoom: 0,
      extraBedAllowed: true,
      mealsIncluded: false,
    },
  });

  const createPolicyMutation = trpc.contracting.childPolicy.create.useMutation({
    onSuccess: () => {
      utils.contracting.hotel.getById.invalidate({ id: hotelId });
      setAddOpen(false);
      form.reset();
    },
  });

  const deleteMutation = trpc.contracting.childPolicy.delete.useMutation({
    onSuccess: () => utils.contracting.hotel.getById.invalidate({ id: hotelId }),
  });

  const categories = ["INFANT", "CHILD", "TEEN"] as const;

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setAddOpen(true)}>Add Policy</Button>
      </div>

      {policies.length === 0 ? (
        <div className="py-8 text-center text-muted-foreground">
          No child policies defined. Add policies for each age category.
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-3">
          {policies.map((p) => (
            <Card key={p.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">
                    {CHILD_AGE_CATEGORY_LABELS[p.category] ?? p.category}
                  </CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      deleteMutation.mutate({ id: p.id, hotelId })
                    }
                  >
                    Remove
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <dl className="space-y-2 text-sm">
                  <Row label="Label" value={p.label} />
                  <Row label="Age Range" value={`${p.ageFrom} – ${p.ageTo}`} />
                  <Row label="Free in Sharing" value={p.freeInSharing ? "Yes" : "No"} />
                  <Row label="Max Free/Room" value={p.maxFreePerRoom} />
                  <Row label="Extra Bed" value={p.extraBedAllowed ? "Allowed" : "Not Allowed"} />
                  <Row label="Meals Included" value={p.mealsIncluded ? "Yes" : "No"} />
                  {p.notes && <Row label="Notes" value={p.notes} />}
                </dl>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add/Edit Policy Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Child Policy</DialogTitle>
            <DialogDescription>
              Define age ranges and rules for a child age category. Multiple
              policies per category are allowed.
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit((v) => createPolicyMutation.mutate(v))}
              className="space-y-4"
            >
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {categories.map((c) => (
                          <SelectItem key={c} value={c}>
                            {CHILD_AGE_CATEGORY_LABELS[c]}
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
                name="label"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Label</FormLabel>
                    <FormControl>
                      <Input placeholder="Child (3-11 years)" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="ageFrom"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Age From</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          {...field}
                          onChange={(e) => field.onChange(Number(e.target.value))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="ageTo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Age To</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          {...field}
                          onChange={(e) => field.onChange(Number(e.target.value))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="freeInSharing"
                  render={({ field }) => (
                    <FormItem className="flex items-center gap-2 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <FormLabel>Free in Sharing</FormLabel>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="maxFreePerRoom"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Max Free/Room</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          {...field}
                          onChange={(e) => field.onChange(Number(e.target.value))}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="extraBedAllowed"
                  render={({ field }) => (
                    <FormItem className="flex items-center gap-2 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <FormLabel>Extra Bed Allowed</FormLabel>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="mealsIncluded"
                  render={({ field }) => (
                    <FormItem className="flex items-center gap-2 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <FormLabel>Meals Included</FormLabel>
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Textarea
                        rows={2}
                        {...field}
                        value={field.value ?? ""}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              {createPolicyMutation.error && (
                <p className="text-sm text-destructive">
                  {createPolicyMutation.error.message}
                </p>
              )}
              <DialogFooter>
                <Button type="submit" disabled={createPolicyMutation.isPending}>
                  {createPolicyMutation.isPending ? "Saving..." : "Save Policy"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ============================================================================
// Meal Basis Tab
// ============================================================================

function MealBasisTab({
  hotelId,
  meals,
}: {
  hotelId: string;
  meals: any[];
}) {
  const utils = trpc.useUtils();
  const [addOpen, setAddOpen] = useState(false);

  const form = useForm<z.input<typeof mealBasisCreateSchema>>({
    resolver: zodResolver(mealBasisCreateSchema),
    defaultValues: {
      hotelId,
      mealCode: "BB",
      name: "",
      description: "",
      isDefault: false,
      active: true,
    },
  });

  const createMutation = trpc.contracting.mealBasis.create.useMutation({
    onSuccess: () => {
      utils.contracting.hotel.getById.invalidate({ id: hotelId });
      setAddOpen(false);
      form.reset();
    },
  });

  const deleteMutation = trpc.contracting.mealBasis.delete.useMutation({
    onSuccess: () => utils.contracting.hotel.getById.invalidate({ id: hotelId }),
  });

  const mealOptions = Object.entries(MEAL_CODE_LABELS) as [string, string][];

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setAddOpen(true)}>Add Meal Basis</Button>
      </div>

      {meals.length === 0 ? (
        <div className="py-8 text-center text-muted-foreground">
          No meal basis options defined.
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Code</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Default</TableHead>
              <TableHead>Status</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {meals.map((m) => (
              <TableRow key={m.id}>
                <TableCell>
                  <Badge variant="outline">
                    {MEAL_CODE_LABELS[m.mealCode] ?? m.mealCode}
                  </Badge>
                </TableCell>
                <TableCell className="font-medium">{m.name}</TableCell>
                <TableCell className="text-muted-foreground">
                  {m.description ?? "—"}
                </TableCell>
                <TableCell>{m.isDefault ? "Yes" : "—"}</TableCell>
                <TableCell>
                  <Badge variant={m.active ? "default" : "secondary"}>
                    {m.active ? "Active" : "Inactive"}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      deleteMutation.mutate({ id: m.id, hotelId })
                    }
                  >
                    Remove
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {/* Add Meal Basis Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Meal Basis</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit((v) => createMutation.mutate(v))}
              className="space-y-4"
            >
              <FormField
                control={form.control}
                name="mealCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Meal Plan</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {mealOptions.map(([code, label]) => (
                          <SelectItem key={code} value={code}>
                            {code} — {label}
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
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Display Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Bed & Breakfast" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Optional description"
                        {...field}
                        value={field.value ?? ""}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="isDefault"
                render={({ field }) => (
                  <FormItem className="flex items-center gap-2 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <FormLabel>Default Meal Plan</FormLabel>
                  </FormItem>
                )}
              />
              {createMutation.error && (
                <p className="text-sm text-destructive">
                  {createMutation.error.message}
                </p>
              )}
              <DialogFooter>
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending ? "Adding..." : "Add Meal Basis"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ============================================================================
// Contracts Tab
// ============================================================================

function HotelContractsTab({ hotelId }: { hotelId: string }) {
  const router = useRouter();
  const { data: contracts, isLoading } =
    trpc.contracting.contract.list.useQuery();

  // Filter to this hotel's contracts
  const hotelContracts = (contracts ?? []).filter(
    (c) => c.hotelId === hotelId,
  );

  if (isLoading) {
    return (
      <div className="py-8 text-center text-muted-foreground">Loading...</div>
    );
  }

  if (hotelContracts.length === 0) {
    return (
      <div className="py-8 text-center text-muted-foreground">
        No contracts for this hotel yet.
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Code</TableHead>
          <TableHead>Period</TableHead>
          <TableHead>Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {hotelContracts.map((c) => (
          <TableRow
            key={c.id}
            className="cursor-pointer"
            onClick={() => router.push(`/contracting/contracts/${c.id}`)}
          >
            <TableCell className="font-medium">{c.name}</TableCell>
            <TableCell className="font-mono">{c.code}</TableCell>
            <TableCell>
              {format(new Date(c.validFrom), "dd MMM yyyy")} —{" "}
              {format(new Date(c.validTo), "dd MMM yyyy")}
            </TableCell>
            <TableCell>
              <Badge
                variant={
                  (CONTRACT_STATUS_VARIANTS[c.status] as
                    | "default"
                    | "secondary"
                    | "outline"
                    | "destructive") ?? "secondary"
                }
              >
                {CONTRACT_STATUS_LABELS[c.status] ?? c.status}
              </Badge>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

// ============================================================================
// Gallery Tab
// ============================================================================

function GalleryTab({
  hotelId,
  images,
}: {
  hotelId: string;
  images: any[];
}) {
  const utils = trpc.useUtils();
  const [addOpen, setAddOpen] = useState(false);

  const form = useForm<z.input<typeof hotelImageCreateSchema>>({
    resolver: zodResolver(hotelImageCreateSchema),
    defaultValues: { hotelId, url: "", caption: "", sortOrder: 0, isPrimary: false },
  });

  const addMutation = trpc.contracting.hotel.addImage.useMutation({
    onSuccess: () => {
      utils.contracting.hotel.getById.invalidate({ id: hotelId });
      setAddOpen(false);
      form.reset();
    },
  });

  const deleteMutation = trpc.contracting.hotel.deleteImage.useMutation({
    onSuccess: () => utils.contracting.hotel.getById.invalidate({ id: hotelId }),
  });

  const setPrimaryMutation = trpc.contracting.hotel.updateImage.useMutation({
    onSuccess: () => utils.contracting.hotel.getById.invalidate({ id: hotelId }),
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setAddOpen(true)}>Add Image</Button>
      </div>

      {images.length === 0 ? (
        <div className="py-8 text-center text-muted-foreground">
          No images yet. Add image URLs to build the gallery.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {images.map((img) => (
            <Card key={img.id} className="overflow-hidden">
              <div className="relative aspect-video bg-muted">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={img.url}
                  alt={img.caption ?? "Hotel image"}
                  className="h-full w-full object-cover"
                />
                {img.isPrimary && (
                  <Badge className="absolute left-2 top-2">Primary</Badge>
                )}
              </div>
              <CardContent className="p-3">
                <p className="truncate text-sm">
                  {img.caption || "No caption"}
                </p>
                <div className="mt-2 flex gap-1">
                  {!img.isPrimary && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setPrimaryMutation.mutate({
                          id: img.id,
                          hotelId,
                          isPrimary: true,
                        })
                      }
                    >
                      Set Primary
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      deleteMutation.mutate({ id: img.id, hotelId })
                    }
                  >
                    Remove
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add Image Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Image</DialogTitle>
            <DialogDescription>
              Enter a URL for the hotel image.
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit((v) => addMutation.mutate(v))}
              className="space-y-4"
            >
              <FormField
                control={form.control}
                name="url"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Image URL</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="https://example.com/image.jpg"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="caption"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Caption</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Hotel lobby"
                        {...field}
                        value={field.value ?? ""}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="isPrimary"
                render={({ field }) => (
                  <FormItem className="flex items-center gap-2 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <FormLabel>Set as Primary Image</FormLabel>
                  </FormItem>
                )}
              />
              {addMutation.error && (
                <p className="text-sm text-destructive">
                  {addMutation.error.message}
                </p>
              )}
              <DialogFooter>
                <Button type="submit" disabled={addMutation.isPending}>
                  {addMutation.isPending ? "Adding..." : "Add Image"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
