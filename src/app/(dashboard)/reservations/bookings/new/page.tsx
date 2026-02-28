"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { AlertTriangle, Loader2, PlaneLanding, PlaneTakeoff, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import type { z } from "zod";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Combobox } from "@/components/ui/combobox";
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
import { Textarea } from "@/components/ui/textarea";
import { GUEST_TITLE_OPTIONS } from "@/lib/constants/reservations";
import { trpc } from "@/lib/trpc";
import { bookingCreateSchema } from "@/lib/validations/reservations";

type FormValues = z.input<typeof bookingCreateSchema>;

const PARTNER_STATUS_OPTIONS = [
  { value: "NEW_BOOKING", label: "New Booking" },
  { value: "SENT", label: "Sent" },
  { value: "CONFIRMED", label: "Confirmed" },
  { value: "REGRET", label: "Regret" },
  { value: "STOP_SALE", label: "Stop Sale" },
  { value: "CANCELLED", label: "Cancelled" },
] as const;

const PAYMENT_METHOD_OPTIONS = [
  { value: "CASH", label: "Cash" },
  { value: "VOUCHER", label: "Voucher" },
] as const;

export default function NewBookingPage() {
  const router = useRouter();
  const utils = trpc.useUtils();

  const form = useForm<FormValues>({
    resolver: zodResolver(bookingCreateSchema),
    defaultValues: {
      hotelId: "",
      contractId: "",
      marketId: "",
      tourOperatorId: "",
      externalRef: "",
      checkIn: "",
      checkOut: "",
      currencyId: "",
      source: "TOUR_OPERATOR",
      manualRate: false,
      htlBookingStatus: "NEW_BOOKING",
      toBookingStatus: "NEW_BOOKING",
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
      roomOccupancy: undefined,
      noOfRooms: 1,
      adults: 2,
      children: 0,
      infants: 0,
      guestNames: [],
      childDob1: "",
      childDob2: "",
      hotelPaymentMethod: undefined,
      paymentOptionDate: "",
      specialRequests: "",
      internalNotes: "",
      bookingNotes: "",
      meetAssistVisa: false,
      leadGuestName: "",
      leadGuestEmail: "",
      leadGuestPhone: "",
      rooms: [
        {
          roomTypeId: "",
          mealBasisId: "",
          adults: 2,
          children: 0,
          infants: 0,
          extraBed: false,
          roomGuests: [
            { title: "", name: "" },
            { title: "", name: "" },
          ],
        },
      ],
    },
  });

  const { fields: roomFields, append: appendRoom, remove: removeRoom } = useFieldArray({
    control: form.control,
    name: "rooms",
  });

  // Watched fields
  const marketId = form.watch("marketId");
  const hotelId = form.watch("hotelId");
  const tourOperatorId = form.watch("tourOperatorId");
  const checkIn = form.watch("checkIn");
  const checkOut = form.watch("checkOut");
  const hotelPaymentMethod = form.watch("hotelPaymentMethod");
  const rooms = form.watch("rooms");

  // Auto-resize roomGuests when adults/children change per room
  useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      if (!name) return;
      const match = name.match(/^rooms\.(\d+)\.(adults|children)$/);
      if (!match) return;
      const ri = parseInt(match[1]!);
      const room = value.rooms?.[ri];
      if (!room) return;
      const expected = (room.adults ?? 0) + (room.children ?? 0);
      const current = room.roomGuests?.length ?? 0;
      if (expected === current) return;
      const existing = (room.roomGuests ?? []) as { title?: string; name?: string; dob?: string }[];
      if (expected > current) {
        form.setValue(`rooms.${ri}.roomGuests`, [
          ...existing,
          ...Array(expected - current).fill(null).map(() => ({ title: "", name: "", dob: "" })),
        ]);
      } else {
        form.setValue(`rooms.${ri}.roomGuests`, existing.slice(0, expected));
      }
    });
    return () => subscription.unsubscribe();
  }, [form]);

  // ── Data fetches ──
  const { data: hotels } = trpc.contracting.hotel.list.useQuery();
  const { data: tourOperators } = trpc.contracting.tourOperator.list.useQuery();
  const { data: markets } = trpc.contracting.market.list.useQuery();

  const { data: hotelRoomTypes } = trpc.contracting.roomType.list.useQuery(
    { hotelId: hotelId! },
    { enabled: !!hotelId },
  );
  const { data: hotelMealBases } = trpc.contracting.mealBasis.list.useQuery(
    { hotelId: hotelId! },
    { enabled: !!hotelId },
  );

  const { data: contracts } = trpc.contracting.contract.list.useQuery(
    undefined,
    { enabled: !!hotelId },
  );

  // Auto-resolve contract
  const matchedContract = useMemo(() => {
    if (!hotelId || !checkIn) return null;
    const ciDate = new Date(checkIn);
    return (
      (contracts ?? []).find(
        (c) =>
          c.hotelId === hotelId &&
          c.status === "PUBLISHED" &&
          new Date(c.validFrom) <= ciDate &&
          new Date(c.validTo) >= ciDate &&
          (!marketId || c.markets.some((m) => m.marketId === marketId)),
      ) ?? null
    );
  }, [contracts, hotelId, checkIn, marketId]);

  const contractId = matchedContract?.id ?? null;

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

  const selectedContract = contractDetail ?? matchedContract;

  // Auto-set currency from contract
  useEffect(() => {
    if (selectedContract?.baseCurrency?.id) {
      form.setValue("currencyId", selectedContract.baseCurrency.id);
    }
  }, [selectedContract, form]);

  // Calculate rates preview
  const canCalcRates = !!(
    contractId &&
    hotelId &&
    checkIn &&
    checkOut &&
    checkOut > checkIn &&
    rooms.length > 0 &&
    rooms.every((r) => r.roomTypeId && r.mealBasisId)
  );

  const rateCalcInput = useMemo(
    () =>
      canCalcRates
        ? {
            contractId: contractId!,
            hotelId,
            tourOperatorId: tourOperatorId || undefined,
            checkIn,
            checkOut,
            bookingDate: new Date().toISOString().slice(0, 10),
            rooms: rooms.map((r) => ({
              roomTypeId: r.roomTypeId,
              mealBasisId: r.mealBasisId,
              adults: r.adults,
              children: [],
              extraBed: r.extraBed,
            })),
          }
        : null,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [canCalcRates, contractId, hotelId, tourOperatorId, checkIn, checkOut, JSON.stringify(rooms)],
  );

  const {
    data: ratePreview,
    isLoading: ratesLoading,
  } = trpc.reservations.booking.calculateRates.useQuery(rateCalcInput!, {
    enabled: !!rateCalcInput,
  });

  // Derived values
  const nights =
    checkIn && checkOut && checkOut > checkIn
      ? Math.ceil(
          (new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 86_400_000,
        )
      : 0;

  const costDisplay = ratePreview
    ? ratePreview.buyingTotal.toFixed(2)
    : "—";
  const sellingDisplay = ratePreview
    ? ratePreview.sellingTotal.toFixed(2)
    : "—";
  const plDisplay = ratePreview
    ? (ratePreview.sellingTotal - ratePreview.buyingTotal).toFixed(2)
    : "—";
  const currencyCode = selectedContract?.baseCurrency?.code ?? "";

  // Stop-sale check
  const canCheckStopSales = !!(hotelId && checkIn && checkOut && checkOut > checkIn);
  const { data: stopSales } = trpc.reservations.booking.checkStopSales.useQuery(
    { hotelId: hotelId!, checkIn, checkOut },
    { enabled: canCheckStopSales },
  );

  // Stop-sale warning dialog state
  const [stopSaleOpen, setStopSaleOpen] = useState(false);
  const [stopSaleStep, setStopSaleStep] = useState<1 | 2>(1);
  const pendingSubmitRef = useRef<FormValues | null>(null);

  // Mutation
  const createMutation = trpc.reservations.booking.create.useMutation({
    onSuccess: (data) => {
      utils.reservations.booking.list.invalidate();
      router.push(`/reservations/bookings/${data.id}`);
    },
  });

  const preparePayload = useCallback(
    (values: FormValues) => {
      const clean = { ...values };
      if (!clean.contractId) clean.contractId = null;
      if (!clean.marketId) clean.marketId = null;
      if (!clean.tourOperatorId) clean.tourOperatorId = null;
      if (!clean.specialRequests) clean.specialRequests = null;
      if (!clean.internalNotes) clean.internalNotes = null;
      if (!clean.bookingNotes) clean.bookingNotes = null;
      if (!clean.leadGuestName) clean.leadGuestName = null;
      if (!clean.leadGuestEmail) clean.leadGuestEmail = null;
      if (!clean.leadGuestPhone) clean.leadGuestPhone = null;
      if (!clean.arrivalFlightNo) clean.arrivalFlightNo = null;
      if (!clean.arrivalTime) clean.arrivalTime = null;
      if (!clean.arrivalOriginApt) clean.arrivalOriginApt = null;
      if (!clean.arrivalDestApt) clean.arrivalDestApt = null;
      if (!clean.arrivalTerminal) clean.arrivalTerminal = null;
      if (!clean.departFlightNo) clean.departFlightNo = null;
      if (!clean.departTime) clean.departTime = null;
      if (!clean.departOriginApt) clean.departOriginApt = null;
      if (!clean.departDestApt) clean.departDestApt = null;
      if (!clean.departTerminal) clean.departTerminal = null;
      if (!clean.childDob1) clean.childDob1 = null;
      if (!clean.childDob2) clean.childDob2 = null;
      if (!clean.paymentOptionDate) clean.paymentOptionDate = null;
      if (!clean.currencyId && selectedContract?.baseCurrency?.id) {
        clean.currencyId = selectedContract.baseCurrency.id;
      }

      // Auto-set source based on T/O
      if (clean.tourOperatorId) {
        clean.source = "TOUR_OPERATOR";
      } else {
        clean.source = "DIRECT";
      }

      // Sync shared mealBasisId to all rooms
      const sharedMealBasisId = clean.rooms[0]?.mealBasisId ?? "";
      clean.rooms.forEach((r) => {
        r.mealBasisId = sharedMealBasisId;
      });

      // Derive booking-level fields from rooms
      clean.noOfRooms = clean.rooms.length;
      clean.adults = clean.rooms.reduce((s, r) => s + (r.adults ?? 2), 0);
      clean.children = clean.rooms.reduce((s, r) => s + (r.children ?? 0), 0);
      clean.infants = clean.rooms.reduce((s, r) => s + (r.infants ?? 0), 0);

      // Build structured guestNames from roomGuests
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const allGuests: any[] = [];
      clean.rooms.forEach((r, ri) => {
        const ad = r.adults ?? 2;
        (r.roomGuests ?? []).forEach((g, gi) => {
          if (g.name) {
            allGuests.push({
              title: g.title || undefined,
              name: g.name,
              dob: g.dob || undefined,
              roomIndex: ri + 1,
              type: gi < ad ? "ADULT" : "CHILD",
            });
          }
        });
      });
      clean.guestNames = allGuests;

      // Set lead guest from first guest
      if (allGuests.length > 0) {
        const lead = allGuests[0];
        clean.leadGuestName = lead.title ? `${lead.title} ${lead.name}` : lead.name;
      }

      return clean;
    },
    [selectedContract],
  );

  function onSubmit(values: FormValues) {
    const clean = preparePayload(values);

    // If stop sales exist, show warning first
    if (stopSales && stopSales.length > 0) {
      pendingSubmitRef.current = clean;
      setStopSaleStep(1);
      setStopSaleOpen(true);
      return;
    }

    createMutation.mutate(clean);
  }

  function handleStopSaleProceed() {
    // Step 1 → Step 2: show approval notice
    setStopSaleStep(2);
  }

  function handleStopSaleConfirm() {
    setStopSaleOpen(false);
    if (pendingSubmitRef.current) {
      pendingSubmitRef.current.stopSaleOverride = true;
      createMutation.mutate(pendingSubmitRef.current);
      pendingSubmitRef.current = null;
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 animate-fade-in pb-10">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">New Booking</h1>
          <p className="text-sm text-muted-foreground">
            Create a new reservation
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => router.push("/reservations/bookings")}
        >
          Cancel
        </Button>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* ── Section 1: Booking Info & Status ── */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-base">Booking Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                {/* BKG Date — auto captured, read-only */}
                <FormItem>
                  <FormLabel>BKG Date</FormLabel>
                  <Input
                    value={format(new Date(), "dd MMM yyyy")}
                    disabled
                    className="bg-muted"
                  />
                </FormItem>

                {/* HTL BKG Status */}
                <FormField
                  control={form.control}
                  name="htlBookingStatus"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>HTL BKG Status</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {PARTNER_STATUS_OPTIONS.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />

                {/* T/O BKG Status */}
                <FormField
                  control={form.control}
                  name="toBookingStatus"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>T/O BKG Status</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {PARTNER_STATUS_OPTIONS.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />

                {/* T/O BKG Ref */}
                <FormField
                  control={form.control}
                  name="externalRef"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>T/O BKG Ref *</FormLabel>
                      <FormControl>
                        <Input placeholder="TO-12345" {...field} value={field.value ?? ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                {/* Market */}
                <FormField
                  control={form.control}
                  name="marketId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Market</FormLabel>
                      <FormControl>
                        <Combobox
                          options={(markets ?? [])
                            .filter((m) => m.active)
                            .map((m) => ({
                              value: m.id,
                              label: `${m.name} (${m.code})`,
                            }))}
                          value={field.value || ""}
                          onValueChange={field.onChange}
                          placeholder="Select market"
                          searchPlaceholder="Search markets..."
                          emptyMessage="No markets found."
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Tour Operator */}
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
                            .map((t) => ({
                              value: t.id,
                              label: `${t.name} (${t.code})`,
                            }))}
                          value={field.value || ""}
                          onValueChange={field.onChange}
                          placeholder="Select T/O"
                          searchPlaceholder="Search tour operators..."
                          emptyMessage="No tour operators found."
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Hotel Name */}
                <FormField
                  control={form.control}
                  name="hotelId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Hotel Name *</FormLabel>
                      <FormControl>
                        <Combobox
                          options={(hotels ?? [])
                            .filter((h) => h.active)
                            .map((h) => ({
                              value: h.id,
                              label: `${h.name} (${h.code})`,
                            }))}
                          value={field.value}
                          onValueChange={field.onChange}
                          placeholder="Select hotel"
                          searchPlaceholder="Search hotels..."
                          emptyMessage="No hotels found."
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Contract status */}
              {hotelId && checkIn && checkOut > checkIn && (
                <div className="text-xs">
                  {matchedContract ? (
                    <span className="text-green-600">
                      Contract: {matchedContract.name} ({matchedContract.code}) —{" "}
                      {format(new Date(matchedContract.validFrom), "dd MMM yyyy")} to{" "}
                      {format(new Date(matchedContract.validTo), "dd MMM yyyy")}
                    </span>
                  ) : (
                    <span className="text-destructive">
                      No published contract covers these dates.
                    </span>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* ── Section 2: Arrival Flight ── */}
          <Card>
            <CardHeader className="pb-4">
              <div className="flex items-center gap-2">
                <PlaneLanding className="size-4 text-green-600" />
                <CardTitle className="text-base">Arrival</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-6">
                <FormField
                  control={form.control}
                  name="checkIn"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Arrival Date *</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="arrivalFlightNo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Flight No</FormLabel>
                      <FormControl>
                        <Input placeholder="MS-804" {...field} value={field.value ?? ""} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="arrivalTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Time</FormLabel>
                      <FormControl>
                        <Input type="time" lang="en-GB" {...field} value={field.value ?? ""} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="arrivalOriginApt"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Origin Airport</FormLabel>
                      <FormControl>
                        <Input placeholder="LHR" {...field} value={field.value ?? ""} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="arrivalDestApt"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Dest. Airport</FormLabel>
                      <FormControl>
                        <Input placeholder="HRG" {...field} value={field.value ?? ""} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="arrivalTerminal"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Terminal</FormLabel>
                      <FormControl>
                        <Input placeholder="T1" {...field} value={field.value ?? ""} />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* ── Section 3: Departure Flight ── */}
          <Card>
            <CardHeader className="pb-4">
              <div className="flex items-center gap-2">
                <PlaneTakeoff className="size-4 text-blue-600" />
                <CardTitle className="text-base">Departure</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-6">
                <FormField
                  control={form.control}
                  name="checkOut"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Departure Date *</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="departFlightNo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Flight No</FormLabel>
                      <FormControl>
                        <Input placeholder="MS-805" {...field} value={field.value ?? ""} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="departTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Time</FormLabel>
                      <FormControl>
                        <Input type="time" lang="en-GB" {...field} value={field.value ?? ""} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="departOriginApt"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Origin Airport</FormLabel>
                      <FormControl>
                        <Input placeholder="HRG" {...field} value={field.value ?? ""} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="departDestApt"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Dest. Airport</FormLabel>
                      <FormControl>
                        <Input placeholder="LHR" {...field} value={field.value ?? ""} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="departTerminal"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Terminal</FormLabel>
                      <FormControl>
                        <Input placeholder="T1" {...field} value={field.value ?? ""} />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>

              {/* Nights display */}
              {nights > 0 && (
                <div className="mt-3">
                  <Badge variant="outline" className="font-mono text-sm">
                    {nights} Night{nights !== 1 ? "s" : ""}
                  </Badge>
                </div>
              )}
            </CardContent>
          </Card>

          {/* ── Section 4: Rooms ── */}
          <Card>
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Rooms</CardTitle>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    appendRoom({
                      roomTypeId: rooms[0]?.roomTypeId ?? "",
                      mealBasisId: rooms[0]?.mealBasisId ?? "",
                      adults: 2,
                      children: 0,
                      infants: 0,
                      extraBed: false,
                      roomGuests: [
                        { title: "", name: "" },
                        { title: "", name: "" },
                      ],
                    })
                  }
                >
                  <Plus className="mr-1 size-3.5" />
                  Add Room
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Shared Meal Basis */}
              <FormField
                control={form.control}
                name="rooms.0.mealBasisId"
                render={({ field }) => (
                  <FormItem className="max-w-xs">
                    <FormLabel>Meal Basis *</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                      disabled={!hotelId}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder={hotelId ? "Select meal basis" : "Select hotel first"} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {availableMealBases.map((mb) => (
                          <SelectItem
                            key={mb.mealBasisId ?? mb.id}
                            value={mb.mealBasisId ?? mb.id}
                          >
                            {mb.mealBasis?.name ?? mb.name ?? "Meal"} (
                            {mb.mealBasis?.mealCode ?? mb.mealCode ?? ""})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Room Cards */}
              {roomFields.map((field, roomIndex) => {
                const roomAdults = form.watch(`rooms.${roomIndex}.adults`) ?? 2;
                const roomChildren = form.watch(`rooms.${roomIndex}.children`) ?? 0;
                const guestCount = roomAdults + roomChildren;

                return (
                  <Card key={field.id} className="border-dashed">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm font-medium">
                          Room {roomIndex + 1}
                        </CardTitle>
                        {roomFields.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeRoom(roomIndex)}
                          >
                            <Trash2 className="size-3.5 text-destructive" />
                          </Button>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
                        {/* Room Type */}
                        <FormField
                          control={form.control}
                          name={`rooms.${roomIndex}.roomTypeId`}
                          render={({ field: f }) => (
                            <FormItem>
                              <FormLabel>Room Type *</FormLabel>
                              <Select
                                onValueChange={f.onChange}
                                value={f.value}
                                disabled={!hotelId}
                              >
                                <FormControl>
                                  <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Select" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {availableRoomTypes.map((rt) => (
                                    <SelectItem
                                      key={rt.roomTypeId ?? rt.id}
                                      value={rt.roomTypeId ?? rt.id}
                                    >
                                      {rt.roomType?.name ?? rt.name ?? "Room"}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        {/* AD */}
                        <FormField
                          control={form.control}
                          name={`rooms.${roomIndex}.adults`}
                          render={({ field: f }) => (
                            <FormItem>
                              <FormLabel>AD</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  min={1}
                                  max={6}
                                  {...f}
                                  onChange={(e) => f.onChange(parseInt(e.target.value) || 1)}
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                        {/* CH */}
                        <FormField
                          control={form.control}
                          name={`rooms.${roomIndex}.children`}
                          render={({ field: f }) => (
                            <FormItem>
                              <FormLabel>CH</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  min={0}
                                  max={4}
                                  {...f}
                                  onChange={(e) => f.onChange(parseInt(e.target.value) || 0)}
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                        {/* INF */}
                        <FormField
                          control={form.control}
                          name={`rooms.${roomIndex}.infants`}
                          render={({ field: f }) => (
                            <FormItem>
                              <FormLabel>INF</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  min={0}
                                  max={2}
                                  {...f}
                                  onChange={(e) => f.onChange(parseInt(e.target.value) || 0)}
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                      </div>

                      {/* Guest rows */}
                      {guestCount > 0 && (
                        <div className="space-y-2 pt-2 border-t">
                          {Array.from({ length: guestCount }).map((_, gi) => {
                            const isChild = gi >= roomAdults;
                            const label = isChild
                              ? `CH${gi - roomAdults + 1}`
                              : `AD${gi + 1}`;

                            return (
                              <div key={gi} className="flex items-center gap-2">
                                <span className="w-8 text-xs text-muted-foreground font-mono shrink-0">
                                  {label}
                                </span>
                                <FormField
                                  control={form.control}
                                  name={`rooms.${roomIndex}.roomGuests.${gi}.title`}
                                  render={({ field: f }) => (
                                    <FormItem className="w-24 shrink-0">
                                      <Select
                                        onValueChange={f.onChange}
                                        value={f.value ?? ""}
                                      >
                                        <FormControl>
                                          <SelectTrigger className="w-full h-9 text-xs">
                                            <SelectValue placeholder="Title" />
                                          </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                          {GUEST_TITLE_OPTIONS.map((opt) => (
                                            <SelectItem key={opt.value} value={opt.value}>
                                              {opt.label}
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                    </FormItem>
                                  )}
                                />
                                <FormField
                                  control={form.control}
                                  name={`rooms.${roomIndex}.roomGuests.${gi}.name`}
                                  render={({ field: f }) => (
                                    <FormItem className="flex-1">
                                      <FormControl>
                                        <Input
                                          className="h-9"
                                          placeholder={
                                            isChild
                                              ? `Child ${gi - roomAdults + 1} name`
                                              : `Adult ${gi + 1} name`
                                          }
                                          {...f}
                                          value={f.value ?? ""}
                                        />
                                      </FormControl>
                                    </FormItem>
                                  )}
                                />
                                {isChild && (
                                  <FormField
                                    control={form.control}
                                    name={`rooms.${roomIndex}.roomGuests.${gi}.dob`}
                                    render={({ field: f }) => (
                                      <FormItem className="w-36 shrink-0">
                                        <FormControl>
                                          <Input
                                            type="date"
                                            className="h-9"
                                            placeholder="DOB"
                                            {...f}
                                            value={f.value ?? ""}
                                          />
                                        </FormControl>
                                      </FormItem>
                                    )}
                                  />
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </CardContent>
          </Card>

          {/* ── Section 5: Rates & Payment ── */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-base">Rates & Payment</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Rate display */}
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
                <FormItem>
                  <FormLabel>Cost</FormLabel>
                  <div className="flex h-9 items-center rounded-md border bg-muted px-3 text-sm font-mono">
                    {ratesLoading ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <>{costDisplay} {currencyCode}</>
                    )}
                  </div>
                </FormItem>
                <FormItem>
                  <FormLabel>Selling</FormLabel>
                  <div className="flex h-9 items-center rounded-md border bg-muted px-3 text-sm font-mono">
                    {ratesLoading ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <>{sellingDisplay} {currencyCode}</>
                    )}
                  </div>
                </FormItem>
                <FormItem>
                  <FormLabel>P/L</FormLabel>
                  <div className={`flex h-9 items-center rounded-md border bg-muted px-3 text-sm font-mono ${
                    ratePreview && ratePreview.sellingTotal - ratePreview.buyingTotal < 0
                      ? "text-destructive"
                      : ratePreview && ratePreview.sellingTotal - ratePreview.buyingTotal > 0
                        ? "text-green-600"
                        : ""
                  }`}>
                    {ratesLoading ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <>{plDisplay} {currencyCode}</>
                    )}
                  </div>
                </FormItem>

                {/* Payment Method */}
                <FormField
                  control={form.control}
                  name="hotelPaymentMethod"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Payment Method</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value ?? ""}
                      >
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {PAYMENT_METHOD_OPTIONS.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />

                {/* Payment Option Date — only shown when method is CASH */}
                {hotelPaymentMethod === "CASH" && (
                  <FormField
                    control={form.control}
                    name="paymentOptionDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>P. Option Date</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} value={field.value ?? ""} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                )}
              </div>

              {ratePreview?.markupRuleName && (
                <p className="text-xs text-muted-foreground">
                  Markup: {ratePreview.markupRuleName} —{" "}
                  {ratePreview.markupType === "PERCENTAGE"
                    ? `${ratePreview.markupValue}%`
                    : `${ratePreview.markupValue} / night`}{" "}
                  = {ratePreview.markupAmount.toFixed(2)}
                </p>
              )}

              {/* Offer eligibility feedback */}
              {(ratePreview?.rooms?.[0]?.breakdown?.offerDiscounts?.length ?? 0) > 0 && (
                <div className="space-y-1 pt-1">
                  <p className="text-xs font-medium text-muted-foreground">Special Offers:</p>
                  {ratePreview!.rooms[0]!.breakdown.offerDiscounts.map(
                    (od: { offerName: string; discount: number; description: string }, i: number) => (
                      <p key={i} className={`text-xs ${od.discount > 0 ? "text-green-600" : "text-muted-foreground"}`}>
                        {od.discount > 0 ? "\u2713" : "\u2717"}{" "}
                        {od.offerName}: {od.description}
                        {od.discount > 0 && ` — saved ${od.discount.toFixed(2)}`}
                      </p>
                    ),
                  )}
                </div>
              )}

              {(ratePreview?.warnings?.length ?? 0) > 0 && (
                <div className="space-y-1 pt-1">
                  {ratePreview!.warnings.map((w: string, i: number) => (
                    <p key={i} className="text-xs text-amber-600">
                      {w}
                    </p>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* ── Section 6: Remarks & Notes ── */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-base">Remarks & Notes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="internalNotes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Internal Remarks</FormLabel>
                      <FormControl>
                        <Textarea
                          rows={3}
                          placeholder="Internal team notes..."
                          {...field}
                          value={field.value ?? ""}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="specialRequests"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Special Requests</FormLabel>
                      <FormControl>
                        <Textarea
                          rows={3}
                          placeholder="Guest special requests..."
                          {...field}
                          value={field.value ?? ""}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="bookingNotes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Booking Notes</FormLabel>
                    <FormControl>
                      <Textarea
                        rows={2}
                        placeholder="Additional booking notes..."
                        {...field}
                        value={field.value ?? ""}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              {/* Meet, Assist & Visa */}
              <FormField
                control={form.control}
                name="meetAssistVisa"
                render={({ field }) => (
                  <FormItem className="flex items-center gap-3 rounded-md border p-3">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div>
                      <FormLabel className="text-sm font-medium cursor-pointer">
                        Meet, Assist & Visa
                      </FormLabel>
                      <p className="text-xs text-muted-foreground">
                        Check if meet, assist and visa services are required for this booking
                      </p>
                    </div>
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* ── Submit ── */}
          <div className="flex items-center justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push("/reservations/bookings")}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Booking"
              )}
            </Button>
          </div>

          {createMutation.error && (
            <p className="text-sm text-destructive">
              {createMutation.error.message}
            </p>
          )}
        </form>
      </Form>

      {/* Stop-Sale Warning Dialog (2-step) */}
      <Dialog open={stopSaleOpen} onOpenChange={(open) => {
        if (!open) {
          setStopSaleOpen(false);
          pendingSubmitRef.current = null;
        }
      }}>
        <DialogContent>
          {stopSaleStep === 1 ? (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-amber-600">
                  <AlertTriangle className="size-5" />
                  Stop Sale Warning
                </DialogTitle>
                <DialogDescription>
                  The selected dates overlap with one or more stop sale periods
                  for this hotel.
                </DialogDescription>
              </DialogHeader>
              <div className="max-h-[240px] overflow-y-auto space-y-2">
                {(stopSales ?? []).map((ss) => (
                  <div
                    key={ss.id}
                    className="rounded-md border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30 p-3 text-sm"
                  >
                    <p className="font-medium">{ss.roomTypeName}</p>
                    <p className="text-muted-foreground">
                      {format(new Date(ss.dateFrom), "dd MMM yyyy")} &mdash;{" "}
                      {format(new Date(ss.dateTo), "dd MMM yyyy")}
                    </p>
                    {ss.reason && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        {ss.reason}
                      </p>
                    )}
                  </div>
                ))}
              </div>
              <DialogFooter className="gap-2 sm:gap-0">
                <Button
                  variant="outline"
                  onClick={() => {
                    setStopSaleOpen(false);
                    pendingSubmitRef.current = null;
                  }}
                >
                  Cancel
                </Button>
                <Button variant="default" onClick={handleStopSaleProceed}>
                  Book Anyway
                </Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-amber-600">
                  <AlertTriangle className="size-5" />
                  Manager Approval Required
                </DialogTitle>
                <DialogDescription>
                  This booking will be created with <strong>Pending Approval</strong> status.
                  It will not count as sold in materialization reports and cannot
                  be sent to the hotel until a reservations manager approves it.
                  A notification will be sent to the manager.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter className="gap-2 sm:gap-0">
                <Button
                  variant="outline"
                  onClick={() => {
                    setStopSaleOpen(false);
                    pendingSubmitRef.current = null;
                  }}
                >
                  Cancel
                </Button>
                <Button
                  variant="default"
                  onClick={handleStopSaleConfirm}
                  disabled={createMutation.isPending}
                >
                  {createMutation.isPending ? (
                    <Loader2 className="mr-2 size-4 animate-spin" />
                  ) : null}
                  Confirm & Request Approval
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
