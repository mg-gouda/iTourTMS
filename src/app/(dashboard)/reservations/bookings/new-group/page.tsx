"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Loader2, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";

const roomBlockSchema = z.object({
  roomTypeId: z.string().min(1, "Room type is required"),
  mealBasisId: z.string().min(1, "Meal basis is required"),
  adults: z.number().int().min(1),
  children: z.number().int().min(0).optional(),
  quantity: z.number().int().min(1),
});

const groupBookingSchema = z.object({
  groupName: z.string().min(1, "Group name is required"),
  hotelId: z.string().min(1, "Hotel is required"),
  contractId: z.string().optional(),
  tourOperatorId: z.string().optional(),
  currencyId: z.string().min(1, "Currency is required"),
  source: z.enum(["DIRECT", "TOUR_OPERATOR"]).optional(),
  checkIn: z.string().min(1, "Check-in date is required"),
  checkOut: z.string().min(1, "Check-out date is required"),
  leadGuestName: z.string().optional(),
  leadGuestEmail: z.string().email().optional().or(z.literal("")),
  specialRequests: z.string().optional(),
  internalNotes: z.string().optional(),
  rooms: z.array(roomBlockSchema).min(1, "At least one room block is required"),
});

type FormValues = z.infer<typeof groupBookingSchema>;

export default function NewGroupBookingPage() {
  const router = useRouter();

  const { data: hotels } = trpc.contracting.hotel.list.useQuery();
  const { data: contracts } = trpc.contracting.contract.list.useQuery();
  const { data: tourOperators } = trpc.b2bPortal.tourOperator.list.useQuery();

  const createGroup = trpc.reservations.booking.createGroup.useMutation({
    onSuccess: (data) => {
      toast.success("Group booking created successfully");
      router.push(`/reservations/bookings/${data.id}`);
    },
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(groupBookingSchema),
    defaultValues: {
      groupName: "",
      hotelId: "",
      contractId: "",
      tourOperatorId: "",
      currencyId: "USD",
      source: "DIRECT",
      checkIn: "",
      checkOut: "",
      leadGuestName: "",
      leadGuestEmail: "",
      specialRequests: "",
      internalNotes: "",
      rooms: [
        {
          roomTypeId: "",
          mealBasisId: "",
          adults: 2,
          children: 0,
          quantity: 1,
        },
      ],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "rooms",
  });

  const watchedRooms = form.watch("rooms");
  const selectedHotelId = form.watch("hotelId");

  const filteredContracts = useMemo(() => {
    if (!contracts) return [];
    if (!selectedHotelId) return contracts;
    return contracts.filter(
      (c: { hotelId?: string }) => c.hotelId === selectedHotelId,
    );
  }, [contracts, selectedHotelId]);

  const summary = useMemo(() => {
    let totalRooms = 0;
    let totalAdults = 0;
    let totalChildren = 0;
    for (const room of watchedRooms ?? []) {
      const qty = room.quantity || 1;
      totalRooms += qty;
      totalAdults += (room.adults || 2) * qty;
      totalChildren += (room.children || 0) * qty;
    }
    return { totalRooms, totalAdults, totalChildren };
  }, [watchedRooms]);

  function onSubmit(values: FormValues) {
    createGroup.mutate({
      ...values,
      contractId: values.contractId || undefined,
      tourOperatorId: values.tourOperatorId || undefined,
      leadGuestName: values.leadGuestName || undefined,
      leadGuestEmail: values.leadGuestEmail || undefined,
      specialRequests: values.specialRequests || undefined,
      internalNotes: values.internalNotes || undefined,
      rooms: values.rooms.map((r) => ({
        ...r,
        children: r.children ?? 0,
      })),
    });
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push("/reservations/bookings")}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Create Group Booking
          </h1>
          <p className="text-muted-foreground">
            Book multiple rooms for a group in one go
          </p>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Card 1: Group Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Group Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="groupName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Group Name *</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Smith Wedding Party" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="hotelId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Hotel *</FormLabel>
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select hotel" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {(hotels ?? []).map((h) => (
                            <SelectItem key={h.id} value={h.id}>
                              {h.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="contractId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contract</FormLabel>
                      <Select
                        value={field.value ?? ""}
                        onValueChange={(v) =>
                          field.onChange(v === "__none__" ? "" : v)
                        }
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select contract (optional)" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="__none__">None</SelectItem>
                          {filteredContracts.map(
                            (c: { id: string; code?: string; name?: string }) => (
                              <SelectItem key={c.id} value={c.id}>
                                {c.code ?? c.name ?? c.id}
                              </SelectItem>
                            ),
                          )}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="tourOperatorId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tour Operator</FormLabel>
                      <Select
                        value={field.value ?? ""}
                        onValueChange={(v) =>
                          field.onChange(v === "__none__" ? "" : v)
                        }
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select tour operator (optional)" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="__none__">None</SelectItem>
                          {(tourOperators ?? []).map(
                            (t: { id: string; name: string }) => (
                              <SelectItem key={t.id} value={t.id}>
                                {t.name}
                              </SelectItem>
                            ),
                          )}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="currencyId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Currency *</FormLabel>
                      <FormControl>
                        <Input placeholder="USD" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="source"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Source</FormLabel>
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="DIRECT">Direct</SelectItem>
                          <SelectItem value="TOUR_OPERATOR">
                            Tour Operator
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* Card 2: Stay Details */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Stay Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="checkIn"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Check-in *</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="checkOut"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Check-out *</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="leadGuestName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Lead Guest Name</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Full name of lead guest"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="leadGuestEmail"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Lead Guest Email</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="email@example.com"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="specialRequests"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Special Requests</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Any special requests for the group..."
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="internalNotes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Internal Notes</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Notes visible only to staff..."
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Card 3: Room Allocation */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Room Allocation</CardTitle>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    append({
                      roomTypeId: "",
                      mealBasisId: "",
                      adults: 2,
                      children: 0,
                      quantity: 1,
                    })
                  }
                >
                  <Plus className="mr-1 h-3 w-3" />
                  Add Room Type
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {fields.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No room blocks added. Click &quot;Add Room Type&quot; to start.
                </p>
              ) : (
                <div className="space-y-3">
                  {fields.map((field, index) => (
                    <div
                      key={field.id}
                      className="grid grid-cols-[1fr_1fr_80px_80px_80px_40px] gap-3 items-end rounded-md border p-3"
                    >
                      <FormField
                        control={form.control}
                        name={`rooms.${index}.roomTypeId`}
                        render={({ field }) => (
                          <FormItem>
                            {index === 0 && (
                              <FormLabel className="text-xs">
                                Room Type ID
                              </FormLabel>
                            )}
                            <FormControl>
                              <Input
                                placeholder="Room type ID"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name={`rooms.${index}.mealBasisId`}
                        render={({ field }) => (
                          <FormItem>
                            {index === 0 && (
                              <FormLabel className="text-xs">
                                Meal Basis ID
                              </FormLabel>
                            )}
                            <FormControl>
                              <Input
                                placeholder="Meal basis ID"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name={`rooms.${index}.adults`}
                        render={({ field }) => (
                          <FormItem>
                            {index === 0 && (
                              <FormLabel className="text-xs">Adults</FormLabel>
                            )}
                            <FormControl>
                              <Input
                                type="number"
                                min={1}
                                {...field}
                                onChange={(e) =>
                                  field.onChange(Number(e.target.value))
                                }
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name={`rooms.${index}.children`}
                        render={({ field }) => (
                          <FormItem>
                            {index === 0 && (
                              <FormLabel className="text-xs">
                                Children
                              </FormLabel>
                            )}
                            <FormControl>
                              <Input
                                type="number"
                                min={0}
                                {...field}
                                value={field.value ?? 0}
                                onChange={(e) =>
                                  field.onChange(Number(e.target.value))
                                }
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name={`rooms.${index}.quantity`}
                        render={({ field }) => (
                          <FormItem>
                            {index === 0 && (
                              <FormLabel className="text-xs">Qty</FormLabel>
                            )}
                            <FormControl>
                              <Input
                                type="number"
                                min={1}
                                {...field}
                                onChange={(e) =>
                                  field.onChange(Number(e.target.value))
                                }
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <div className={index === 0 ? "mt-5" : ""}>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9 text-destructive"
                          onClick={() => remove(index)}
                          disabled={fields.length === 1}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Summary */}
              <div className="rounded-md bg-muted/50 px-4 py-3 text-sm">
                Total rooms: <strong>{summary.totalRooms}</strong>, Total
                guests:{" "}
                <strong>
                  {summary.totalAdults} adult{summary.totalAdults !== 1 && "s"}
                </strong>
                ,{" "}
                <strong>
                  {summary.totalChildren} child
                  {summary.totalChildren !== 1 && "ren"}
                </strong>
              </div>
            </CardContent>
          </Card>

          {/* Footer */}
          {createGroup.error && (
            <p className="text-sm text-destructive">
              {createGroup.error.message}
            </p>
          )}

          <div className="flex gap-2">
            <Button type="submit" disabled={createGroup.isPending}>
              {createGroup.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Create Group Booking
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push("/reservations/bookings")}
            >
              Cancel
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
