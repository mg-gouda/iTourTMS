"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { ArrowLeft, Loader2, PlaneLanding, PlaneTakeoff } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import type { z } from "zod";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Combobox } from "@/components/ui/combobox";
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
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  BOOKING_STATUS_LABELS,
  BOOKING_STATUS_VARIANTS,
} from "@/lib/constants/reservations";
import { trpc } from "@/lib/trpc";
import { bookingAmendSchema } from "@/lib/validations/reservations";

type FormValues = z.input<typeof bookingAmendSchema>;

const PARTNER_STATUS_OPTIONS = [
  { value: "SENT", label: "Sent" },
  { value: "CONFIRMED", label: "Confirmed" },
  { value: "REGRET", label: "Regret" },
  { value: "STOP_SALE", label: "Stop Sale" },
  { value: "CANCELLED", label: "Cancelled" },
] as const;

const ROOM_OCCUPANCY_OPTIONS = [
  { value: "SINGLE", label: "Single" },
  { value: "DOUBLE", label: "Double" },
  { value: "TRIPLE", label: "Triple" },
  { value: "FAMILY", label: "Family" },
] as const;

const PAYMENT_METHOD_OPTIONS = [
  { value: "CASH", label: "Cash" },
  { value: "VOUCHER", label: "Voucher" },
] as const;

export default function AmendBookingPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const utils = trpc.useUtils();

  const { data: booking, isLoading } = trpc.reservations.booking.getById.useQuery({ id });

  const form = useForm<FormValues>({
    resolver: zodResolver(bookingAmendSchema),
    defaultValues: {
      htlBookingStatus: undefined,
      toBookingStatus: undefined,
      tourOperatorId: "",
      externalRef: "",
      hotelId: "",
      contractId: "",
      roomTypeId: "",
      mealBasisId: "",
      roomOccupancy: undefined,
      noOfRooms: 1,
      adults: 2,
      children: 0,
      infants: 0,
      checkIn: "",
      checkOut: "",
      arrivalFlightNo: "",
      arrivalTime: "",
      arrivalOriginApt: "",
      arrivalDestApt: "",
      arrivalTerminal: "",
      departFlightNo: "",
      departTime: "",
      departOriginApt: "",
      departDestApt: "",
      departTerminal: "",
      guestNames: [],
      childDob1: "",
      childDob2: "",
      hotelPaymentMethod: undefined,
      paymentOptionDate: "",
      specialRequests: "",
      internalNotes: "",
      bookingNotes: "",
      meetAssistVisa: false,
      amendmentReason: "",
    },
  });

  // Populate form when booking loads
  useEffect(() => {
    if (!booking) return;
    const guestNames = (booking.guestNames as string[] | null) ?? [];
    form.reset({
      htlBookingStatus: (booking.htlBookingStatus as FormValues["htlBookingStatus"]) ?? undefined,
      toBookingStatus: (booking.toBookingStatus as FormValues["toBookingStatus"]) ?? undefined,
      tourOperatorId: booking.tourOperatorId ?? "",
      externalRef: booking.externalRef ?? "",
      hotelId: booking.hotelId,
      contractId: booking.contractId ?? "",
      roomTypeId: booking.rooms[0]?.roomType?.id ?? "",
      mealBasisId: booking.rooms[0]?.mealBasis?.id ?? "",
      roomOccupancy: (booking.roomOccupancy as FormValues["roomOccupancy"]) ?? undefined,
      noOfRooms: booking.noOfRooms ?? 1,
      adults: booking.adults ?? booking.rooms[0]?.adults ?? 2,
      children: booking.children ?? booking.rooms[0]?.children ?? 0,
      infants: booking.infants ?? booking.rooms[0]?.infants ?? 0,
      checkIn: new Date(booking.checkIn).toISOString().slice(0, 10),
      checkOut: new Date(booking.checkOut).toISOString().slice(0, 10),
      arrivalFlightNo: booking.arrivalFlightNo ?? "",
      arrivalTime: booking.arrivalTime ?? "",
      arrivalOriginApt: booking.arrivalOriginApt ?? "",
      arrivalDestApt: booking.arrivalDestApt ?? "",
      arrivalTerminal: booking.arrivalTerminal ?? "",
      departFlightNo: booking.departFlightNo ?? "",
      departTime: booking.departTime ?? "",
      departOriginApt: booking.departOriginApt ?? "",
      departDestApt: booking.departDestApt ?? "",
      departTerminal: booking.departTerminal ?? "",
      guestNames,
      childDob1: booking.childDob1 ? new Date(booking.childDob1).toISOString().slice(0, 10) : "",
      childDob2: booking.childDob2 ? new Date(booking.childDob2).toISOString().slice(0, 10) : "",
      hotelPaymentMethod: (booking.hotelPaymentMethod as FormValues["hotelPaymentMethod"]) ?? undefined,
      paymentOptionDate: booking.paymentOptionDate
        ? new Date(booking.paymentOptionDate).toISOString().slice(0, 10)
        : "",
      specialRequests: booking.specialRequests ?? "",
      internalNotes: booking.internalNotes ?? "",
      bookingNotes: booking.bookingNotes ?? "",
      meetAssistVisa: booking.meetAssistVisa ?? false,
      amendmentReason: "",
    });
  }, [booking, form]);

  // Watched fields
  const hotelId = form.watch("hotelId") ?? booking?.hotelId ?? "";
  const checkIn = form.watch("checkIn") ?? "";
  const checkOut = form.watch("checkOut") ?? "";
  const adultsCount = form.watch("adults") ?? 2;
  const childrenCount = form.watch("children") ?? 0;
  const hotelPaymentMethod = form.watch("hotelPaymentMethod");

  const guestRowCount = adultsCount + childrenCount;

  // Manage guest names array size
  useEffect(() => {
    const current = form.getValues("guestNames") ?? [];
    if (guestRowCount > current.length) {
      form.setValue("guestNames", [...current, ...Array(guestRowCount - current.length).fill("")]);
    } else if (guestRowCount < current.length) {
      form.setValue("guestNames", current.slice(0, guestRowCount));
    }
  }, [guestRowCount, form]);

  // Data fetches
  const { data: hotels } = trpc.contracting.hotel.list.useQuery();
  const { data: tourOperators } = trpc.contracting.tourOperator.list.useQuery();
  const { data: hotelRoomTypes } = trpc.contracting.roomType.list.useQuery(
    { hotelId: hotelId! },
    { enabled: !!hotelId },
  );
  const { data: hotelMealBases } = trpc.contracting.mealBasis.list.useQuery(
    { hotelId: hotelId! },
    { enabled: !!hotelId },
  );

  // Contract match
  const { data: contracts } = trpc.contracting.contract.list.useQuery(undefined, { enabled: !!hotelId });

  const matchedContract = useMemo(() => {
    if (!hotelId || !checkIn) return null;
    const ciDate = new Date(checkIn);
    return (
      (contracts ?? []).find(
        (c) =>
          c.hotelId === hotelId &&
          c.status === "PUBLISHED" &&
          new Date(c.validFrom) <= ciDate &&
          new Date(c.validTo) >= ciDate,
      ) ?? null
    );
  }, [contracts, hotelId, checkIn]);

  const contractId = matchedContract?.id ?? booking?.contractId ?? null;

  useEffect(() => {
    form.setValue("contractId", contractId ?? "");
  }, [contractId, form]);

  const { data: contractDetail } = trpc.contracting.contract.getById.useQuery(
    { id: contractId! },
    { enabled: !!contractId },
  );

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const availableRoomTypes: any[] = useMemo(() => {
    if (contractDetail?.roomTypes?.length) return contractDetail.roomTypes;
    if (hotelRoomTypes?.length) return hotelRoomTypes.map((rt) => ({ roomTypeId: rt.id, roomType: rt }));
    return [];
  }, [contractDetail, hotelRoomTypes]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const availableMealBases: any[] = useMemo(() => {
    if (contractDetail?.mealBases?.length) return contractDetail.mealBases;
    if (hotelMealBases?.length) return hotelMealBases.map((mb) => ({ mealBasisId: mb.id, mealBasis: mb }));
    return [];
  }, [contractDetail, hotelMealBases]);

  // Nights
  const nights =
    checkIn && checkOut && checkOut > checkIn
      ? Math.ceil((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 86_400_000)
      : booking?.nights ?? 0;

  // Mutation
  const amendMutation = trpc.reservations.booking.amend.useMutation({
    onSuccess: () => {
      utils.reservations.booking.getById.invalidate({ id });
      utils.reservations.booking.list.invalidate();
      toast.success("Booking amended successfully");
      router.push(`/reservations/bookings/${id}`);
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  function onSubmit(values: FormValues) {
    const clean = { ...values };
    // Clean empty strings to null for optional fields
    for (const key of [
      "arrivalFlightNo", "arrivalTime", "arrivalOriginApt", "arrivalDestApt", "arrivalTerminal",
      "departFlightNo", "departTime", "departOriginApt", "departDestApt", "departTerminal",
      "childDob1", "childDob2", "paymentOptionDate", "specialRequests", "internalNotes",
      "bookingNotes", "externalRef",
    ] as const) {
      if (!clean[key]) (clean as Record<string, unknown>)[key] = null;
    }
    amendMutation.mutate({ id, data: clean });
  }

  if (isLoading) {
    return (
      <div className="mx-auto max-w-6xl space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!booking) return null;

  const isBlocked = ["CANCELLED", "CHECKED_OUT"].includes(booking.status);

  return (
    <div className="mx-auto max-w-6xl space-y-6 animate-fade-in pb-10">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href={`/reservations/bookings/${id}`}>
            <ArrowLeft className="size-4" />
          </Link>
        </Button>
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight">
              Amend Booking
            </h1>
            <code className="text-lg font-mono text-muted-foreground">{booking.code}</code>
            <Badge
              variant={
                (BOOKING_STATUS_VARIANTS[booking.status] as
                  | "default" | "secondary" | "outline" | "destructive") ?? "secondary"
              }
            >
              {BOOKING_STATUS_LABELS[booking.status] ?? booking.status}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Modify booking details. Rates will be recalculated if dates or room change.
          </p>
        </div>
      </div>

      {isBlocked ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            This booking cannot be amended because it is {booking.status.toLowerCase().replace("_", " ")}.
          </CardContent>
        </Card>
      ) : (
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* ── Section 1: Booking Info & Status ── */}
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-base">Booking Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                  <FormItem>
                    <FormLabel>BKG Date</FormLabel>
                    <Input
                      value={format(new Date(booking.createdAt), "dd MMM yyyy")}
                      disabled
                      className="bg-muted"
                    />
                  </FormItem>

                  <FormField
                    control={form.control}
                    name="htlBookingStatus"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>HTL BKG Status</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value ?? ""}>
                          <FormControl>
                            <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {PARTNER_STATUS_OPTIONS.map((opt) => (
                              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="toBookingStatus"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>T/O BKG Status</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value ?? ""}>
                          <FormControl>
                            <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {PARTNER_STATUS_OPTIONS.map((opt) => (
                              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="externalRef"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>T/O BKG Ref</FormLabel>
                        <FormControl>
                          <Input {...field} value={field.value ?? ""} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                  <FormField
                    control={form.control}
                    name="tourOperatorId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tour Operator</FormLabel>
                        <FormControl>
                          <Combobox
                            options={(tourOperators ?? [])
                              .filter((t) => t.active)
                              .map((t) => ({ value: t.id, label: `${t.name} (${t.code})` }))}
                            value={field.value || ""}
                            onValueChange={field.onChange}
                            placeholder="Select T/O"
                            searchPlaceholder="Search tour operators..."
                            emptyMessage="No tour operators found."
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="hotelId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Hotel Name</FormLabel>
                        <FormControl>
                          <Combobox
                            options={(hotels ?? [])
                              .filter((h) => h.active)
                              .map((h) => ({ value: h.id, label: `${h.name} (${h.code})` }))}
                            value={field.value || ""}
                            onValueChange={field.onChange}
                            placeholder="Select hotel"
                            searchPlaceholder="Search hotels..."
                            emptyMessage="No hotels found."
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="roomTypeId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Room Type</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value ?? ""} disabled={!hotelId}>
                          <FormControl>
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Select room type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {availableRoomTypes.map((rt) => (
                              <SelectItem key={rt.roomTypeId ?? rt.id} value={rt.roomTypeId ?? rt.id}>
                                {rt.roomType?.name ?? rt.name ?? "Room"}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>

            {/* ── Section 2: Arrival ── */}
            <Card>
              <CardHeader className="pb-4">
                <div className="flex items-center gap-2">
                  <PlaneLanding className="size-4 text-green-600" />
                  <CardTitle className="text-base">Arrival</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-6">
                  <FormField control={form.control} name="checkIn" render={({ field }) => (
                    <FormItem><FormLabel>Arrival Date</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="arrivalFlightNo" render={({ field }) => (
                    <FormItem><FormLabel>Flight No</FormLabel><FormControl><Input {...field} value={field.value ?? ""} /></FormControl></FormItem>
                  )} />
                  <FormField control={form.control} name="arrivalTime" render={({ field }) => (
                    <FormItem><FormLabel>Time</FormLabel><FormControl><Input type="time" {...field} value={field.value ?? ""} /></FormControl></FormItem>
                  )} />
                  <FormField control={form.control} name="arrivalOriginApt" render={({ field }) => (
                    <FormItem><FormLabel>Origin Airport</FormLabel><FormControl><Input {...field} value={field.value ?? ""} /></FormControl></FormItem>
                  )} />
                  <FormField control={form.control} name="arrivalDestApt" render={({ field }) => (
                    <FormItem><FormLabel>Dest. Airport</FormLabel><FormControl><Input {...field} value={field.value ?? ""} /></FormControl></FormItem>
                  )} />
                  <FormField control={form.control} name="arrivalTerminal" render={({ field }) => (
                    <FormItem><FormLabel>Terminal</FormLabel><FormControl><Input {...field} value={field.value ?? ""} /></FormControl></FormItem>
                  )} />
                </div>
              </CardContent>
            </Card>

            {/* ── Section 3: Departure ── */}
            <Card>
              <CardHeader className="pb-4">
                <div className="flex items-center gap-2">
                  <PlaneTakeoff className="size-4 text-blue-600" />
                  <CardTitle className="text-base">Departure</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-6">
                  <FormField control={form.control} name="checkOut" render={({ field }) => (
                    <FormItem><FormLabel>Departure Date</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="departFlightNo" render={({ field }) => (
                    <FormItem><FormLabel>Flight No</FormLabel><FormControl><Input {...field} value={field.value ?? ""} /></FormControl></FormItem>
                  )} />
                  <FormField control={form.control} name="departTime" render={({ field }) => (
                    <FormItem><FormLabel>Time</FormLabel><FormControl><Input type="time" {...field} value={field.value ?? ""} /></FormControl></FormItem>
                  )} />
                  <FormField control={form.control} name="departOriginApt" render={({ field }) => (
                    <FormItem><FormLabel>Origin Airport</FormLabel><FormControl><Input {...field} value={field.value ?? ""} /></FormControl></FormItem>
                  )} />
                  <FormField control={form.control} name="departDestApt" render={({ field }) => (
                    <FormItem><FormLabel>Dest. Airport</FormLabel><FormControl><Input {...field} value={field.value ?? ""} /></FormControl></FormItem>
                  )} />
                  <FormField control={form.control} name="departTerminal" render={({ field }) => (
                    <FormItem><FormLabel>Terminal</FormLabel><FormControl><Input {...field} value={field.value ?? ""} /></FormControl></FormItem>
                  )} />
                </div>
                {nights > 0 && (
                  <div className="mt-3">
                    <Badge variant="outline" className="font-mono text-sm">{nights} Night{nights !== 1 ? "s" : ""}</Badge>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* ── Section 4: Room & Occupancy ── */}
            <Card>
              <CardHeader className="pb-4"><CardTitle className="text-base">Room & Occupancy</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-6">
                  <FormField control={form.control} name="roomOccupancy" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Room Occupancy</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value ?? ""}>
                        <FormControl><SelectTrigger className="w-full"><SelectValue placeholder="Select" /></SelectTrigger></FormControl>
                        <SelectContent>
                          {ROOM_OCCUPANCY_OPTIONS.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="noOfRooms" render={({ field }) => (
                    <FormItem><FormLabel>No of Rooms</FormLabel><FormControl>
                      <Input type="number" min={1} {...field} onChange={(e) => field.onChange(parseInt(e.target.value) || 1)} />
                    </FormControl></FormItem>
                  )} />
                  <FormField control={form.control} name="adults" render={({ field }) => (
                    <FormItem><FormLabel>AD</FormLabel><FormControl>
                      <Input type="number" min={1} max={10} {...field} onChange={(e) => field.onChange(parseInt(e.target.value) || 1)} />
                    </FormControl></FormItem>
                  )} />
                  <FormField control={form.control} name="children" render={({ field }) => (
                    <FormItem><FormLabel>CH</FormLabel><FormControl>
                      <Input type="number" min={0} max={6} {...field} onChange={(e) => field.onChange(parseInt(e.target.value) || 0)} />
                    </FormControl></FormItem>
                  )} />
                  <FormField control={form.control} name="infants" render={({ field }) => (
                    <FormItem><FormLabel>INF</FormLabel><FormControl>
                      <Input type="number" min={0} max={4} {...field} onChange={(e) => field.onChange(parseInt(e.target.value) || 0)} />
                    </FormControl></FormItem>
                  )} />
                  <FormField control={form.control} name="mealBasisId" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Meal Basis</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value ?? ""} disabled={!hotelId}>
                        <FormControl><SelectTrigger className="w-full"><SelectValue placeholder="Select meal" /></SelectTrigger></FormControl>
                        <SelectContent>
                          {availableMealBases.map((mb) => (
                            <SelectItem key={mb.mealBasisId ?? mb.id} value={mb.mealBasisId ?? mb.id}>
                              {mb.mealBasis?.name ?? mb.name ?? "Meal"} ({mb.mealBasis?.mealCode ?? mb.mealCode ?? ""})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )} />
                </div>
              </CardContent>
            </Card>

            {/* ── Section 5: Guest Names ── */}
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-base">
                  Guest Names
                  {guestRowCount > 0 && (
                    <span className="ml-2 text-xs font-normal text-muted-foreground">
                      ({adultsCount} Adult{adultsCount !== 1 ? "s" : ""}{childrenCount > 0 ? ` + ${childrenCount} Child${childrenCount !== 1 ? "ren" : ""}` : ""})
                    </span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {Array.from({ length: guestRowCount }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <span className="w-8 text-xs text-muted-foreground font-mono">
                      {i < adultsCount ? `AD${i + 1}` : `CH${i - adultsCount + 1}`}
                    </span>
                    <FormField
                      control={form.control}
                      name={`guestNames.${i}`}
                      render={({ field }) => (
                        <FormItem className="flex-1">
                          <FormControl>
                            <Input
                              placeholder={i < adultsCount ? `Adult ${i + 1} full name` : `Child ${i - adultsCount + 1} full name`}
                              {...field}
                              value={field.value ?? ""}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                ))}
                {guestRowCount === 0 && (
                  <p className="text-sm text-muted-foreground">Set Adults and Children above to add guest rows.</p>
                )}
                {childrenCount > 0 && (
                  <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
                    <FormField control={form.control} name="childDob1" render={({ field }) => (
                      <FormItem><FormLabel>1st CHD DOB</FormLabel><FormControl><Input type="date" {...field} value={field.value ?? ""} /></FormControl></FormItem>
                    )} />
                    {childrenCount >= 2 && (
                      <FormField control={form.control} name="childDob2" render={({ field }) => (
                        <FormItem><FormLabel>2nd CHD DOB</FormLabel><FormControl><Input type="date" {...field} value={field.value ?? ""} /></FormControl></FormItem>
                      )} />
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* ── Section 6: Payment ── */}
            <Card>
              <CardHeader className="pb-4"><CardTitle className="text-base">Payment</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                  <FormField control={form.control} name="hotelPaymentMethod" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Payment Method</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value ?? ""}>
                        <FormControl><SelectTrigger className="w-full"><SelectValue placeholder="Select" /></SelectTrigger></FormControl>
                        <SelectContent>
                          {PAYMENT_METHOD_OPTIONS.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )} />
                  {hotelPaymentMethod === "CASH" && (
                    <FormField control={form.control} name="paymentOptionDate" render={({ field }) => (
                      <FormItem><FormLabel>P. Option Date</FormLabel><FormControl><Input type="date" {...field} value={field.value ?? ""} /></FormControl></FormItem>
                    )} />
                  )}
                </div>
              </CardContent>
            </Card>

            {/* ── Section 7: Remarks & Notes ── */}
            <Card>
              <CardHeader className="pb-4"><CardTitle className="text-base">Remarks & Notes</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <FormField control={form.control} name="internalNotes" render={({ field }) => (
                    <FormItem><FormLabel>Internal Remarks</FormLabel><FormControl>
                      <Textarea rows={3} placeholder="Internal team notes..." {...field} value={field.value ?? ""} />
                    </FormControl></FormItem>
                  )} />
                  <FormField control={form.control} name="specialRequests" render={({ field }) => (
                    <FormItem><FormLabel>Special Requests</FormLabel><FormControl>
                      <Textarea rows={3} placeholder="Guest special requests..." {...field} value={field.value ?? ""} />
                    </FormControl></FormItem>
                  )} />
                </div>
                <FormField control={form.control} name="bookingNotes" render={({ field }) => (
                  <FormItem><FormLabel>Booking Notes</FormLabel><FormControl>
                    <Textarea rows={2} placeholder="Additional booking notes..." {...field} value={field.value ?? ""} />
                  </FormControl></FormItem>
                )} />
                <FormField control={form.control} name="meetAssistVisa" render={({ field }) => (
                  <FormItem className="flex items-center gap-3 rounded-md border p-3">
                    <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                    <div>
                      <FormLabel className="text-sm font-medium cursor-pointer">Meet, Assist & Visa</FormLabel>
                      <p className="text-xs text-muted-foreground">Check if meet, assist and visa services are required</p>
                    </div>
                  </FormItem>
                )} />
              </CardContent>
            </Card>

            {/* ── Amendment Reason ── */}
            <Card>
              <CardHeader className="pb-4"><CardTitle className="text-base">Amendment Reason</CardTitle></CardHeader>
              <CardContent>
                <FormField control={form.control} name="amendmentReason" render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Textarea rows={2} placeholder="Describe the reason for this amendment..." {...field} value={field.value ?? ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </CardContent>
            </Card>

            {/* ── Submit ── */}
            <div className="flex items-center justify-end gap-3">
              <Button type="button" variant="outline" asChild>
                <Link href={`/reservations/bookings/${id}`}>Cancel</Link>
              </Button>
              <Button type="submit" disabled={amendMutation.isPending}>
                {amendMutation.isPending ? (
                  <><Loader2 className="mr-2 size-4 animate-spin" />Saving...</>
                ) : (
                  "Save Amendment"
                )}
              </Button>
            </div>

            {amendMutation.error && (
              <p className="text-sm text-destructive">{amendMutation.error.message}</p>
            )}
          </form>
        </Form>
      )}
    </div>
  );
}
