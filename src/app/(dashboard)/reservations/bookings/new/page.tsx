"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import type { z } from "zod";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Combobox } from "@/components/ui/combobox";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { bookingCreateSchema } from "@/lib/validations/reservations";

type FormValues = z.input<typeof bookingCreateSchema>;

const STEPS = [
  "Hotel",
  "Tour Operator",
  "Dates",
  "Rooms",
  "Guest Info",
  "Review",
] as const;

export default function NewBookingPage() {
  const router = useRouter();
  const utils = trpc.useUtils();
  const [step, setStep] = useState(0);

  const form = useForm<FormValues>({
    resolver: step === STEPS.length - 1 ? zodResolver(bookingCreateSchema) : undefined,
    defaultValues: {
      hotelId: "",
      contractId: "",
      tourOperatorId: "",
      checkIn: "",
      checkOut: "",
      currencyId: "",
      source: "DIRECT",
      manualRate: false,
      specialRequests: "",
      internalNotes: "",
      externalRef: "",
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
        },
      ],
    },
  });

  const { fields: roomFields, append: appendRoom, remove: removeRoom } = useFieldArray({
    control: form.control,
    name: "rooms",
  });

  // Watched fields
  const hotelId = form.watch("hotelId");
  const tourOperatorId = form.watch("tourOperatorId");
  const checkIn = form.watch("checkIn");
  const checkOut = form.watch("checkOut");
  const rooms = form.watch("rooms");

  // ── Data fetches ──
  const { data: hotels } = trpc.contracting.hotel.list.useQuery();

  const { data: tourOperators } = trpc.contracting.tourOperator.list.useQuery(
    undefined,
    { enabled: step >= 1 },
  );

  const { data: contracts } = trpc.contracting.contract.list.useQuery(
    undefined,
    { enabled: !!hotelId },
  );

  // Auto-resolve contract: find published contract for hotel that covers the check-in date
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

  const contractId = matchedContract?.id ?? null;

  // Sync contractId into form whenever it changes
  useEffect(() => {
    form.setValue("contractId", contractId ?? "");
  }, [contractId, form]);

  // Fetch full contract detail when one is matched
  const { data: contractDetail } = trpc.contracting.contract.getById.useQuery(
    { id: contractId! },
    { enabled: !!contractId },
  );

  // Room types & meal bases from contract detail
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const contractRoomTypes: any[] = useMemo(
    () => contractDetail?.roomTypes ?? [],
    [contractDetail],
  );

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const contractMealBases: any[] = useMemo(
    () => contractDetail?.mealBases ?? [],
    [contractDetail],
  );

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
    error: ratesError,
  } = trpc.reservations.booking.calculateRates.useQuery(rateCalcInput!, {
    enabled: !!rateCalcInput && step >= 3,
  });

  // Mutation
  const createMutation = trpc.reservations.booking.create.useMutation({
    onSuccess: (data) => {
      utils.reservations.booking.list.invalidate();
      router.push(`/reservations/bookings/${data.id}`);
    },
  });

  // Step validation
  function canProceed(): boolean {
    switch (step) {
      case 0:
        return !!hotelId;
      case 1:
        return true; // TO is optional
      case 2:
        return !!(checkIn && checkOut && checkOut > checkIn && contractId);
      case 3:
        return rooms.length > 0 && rooms.every((r) => r.roomTypeId && r.mealBasisId);
      case 4:
        return true; // Guest info optional at creation
      default:
        return true;
    }
  }

  function handleNext() {
    if (step < STEPS.length - 1) setStep(step + 1);
  }

  function handleBack() {
    if (step > 0) setStep(step - 1);
  }

  function handleSubmit() {
    const values = form.getValues();
    const clean = { ...values };
    if (!clean.contractId) clean.contractId = null;
    if (!clean.tourOperatorId) clean.tourOperatorId = null;
    if (!clean.specialRequests) clean.specialRequests = null;
    if (!clean.internalNotes) clean.internalNotes = null;
    if (!clean.externalRef) clean.externalRef = null;
    if (!clean.leadGuestName) clean.leadGuestName = null;
    if (!clean.leadGuestEmail) clean.leadGuestEmail = null;
    if (!clean.leadGuestPhone) clean.leadGuestPhone = null;
    if (!clean.currencyId && selectedContract?.baseCurrency?.id) {
      clean.currencyId = selectedContract.baseCurrency.id;
    }
    createMutation.mutate(clean);
  }

  // Selected hotel object
  const selectedHotel = useMemo(
    () => (hotels ?? []).find((h) => h.id === hotelId),
    [hotels, hotelId],
  );

  const selectedTO = useMemo(
    () => (tourOperators ?? []).find((t) => t.id === tourOperatorId),
    [tourOperators, tourOperatorId],
  );

  const nights = checkIn && checkOut && checkOut > checkIn
    ? Math.ceil(
        (new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 86_400_000,
      )
    : 0;

  return (
    <div className="mx-auto max-w-4xl space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">New Booking</h1>
        <p className="text-muted-foreground">
          Create a reservation step by step
        </p>
      </div>

      {/* Step Indicator */}
      <div className="flex items-center gap-1">
        {STEPS.map((label, i) => (
          <div key={label} className="flex items-center">
            <button
              type="button"
              onClick={() => i < step && setStep(i)}
              className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                i === step
                  ? "bg-primary text-primary-foreground"
                  : i < step
                    ? "bg-primary/10 text-primary cursor-pointer hover:bg-primary/20"
                    : "bg-muted text-muted-foreground"
              }`}
            >
              <span className="font-mono">{i + 1}</span>
              <span className="hidden sm:inline">{label}</span>
            </button>
            {i < STEPS.length - 1 && (
              <ChevronRight className="mx-1 size-3 text-muted-foreground" />
            )}
          </div>
        ))}
      </div>

      <Form {...form}>
        <form onSubmit={(e) => e.preventDefault()} className="space-y-6">
          {/* Step 0: Hotel Selection */}
          {step === 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Select Hotel</CardTitle>
              </CardHeader>
              <CardContent>
                <FormField
                  control={form.control}
                  name="hotelId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Hotel *</FormLabel>
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
                          placeholder="Choose a hotel"
                          searchPlaceholder="Search hotels..."
                          emptyMessage="No hotels found."
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {selectedHotel && (
                  <div className="mt-4 rounded bg-muted/50 p-3 text-sm">
                    <p className="font-medium">{selectedHotel.name}</p>
                    <p className="text-muted-foreground">
                      {selectedHotel.code}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Step 1: Tour Operator */}
          {step === 1 && (
            <Card>
              <CardHeader>
                <CardTitle>Tour Operator (Optional)</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="tourOperatorId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tour Operator</FormLabel>
                      <Select
                        onValueChange={(v) => field.onChange(v === "__direct__" ? "" : v)}
                        value={field.value || "__direct__"}
                      >
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Direct booking (no TO)" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="__direct__">Direct Booking</SelectItem>
                          {(tourOperators ?? [])
                            .filter((t) => t.active)
                            .map((t) => (
                              <SelectItem key={t.id} value={t.id}>
                                {t.name} ({t.code})
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
                  name="source"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Booking Source</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="DIRECT">Direct</SelectItem>
                          <SelectItem value="TOUR_OPERATOR">Tour Operator</SelectItem>
                          <SelectItem value="API">API</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
          )}

          {/* Step 2: Dates */}
          {step === 2 && (
            <Card>
              <CardHeader>
                <CardTitle>Stay Dates</CardTitle>
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

                {nights > 0 && (
                  <p className="text-sm text-muted-foreground">
                    {nights} night{nights !== 1 ? "s" : ""}
                  </p>
                )}

                {checkIn && checkOut && checkOut > checkIn && (
                  <div className="rounded-md border p-3 text-sm">
                    {matchedContract ? (
                      <div className="space-y-1">
                        <p className="font-medium text-green-600">Contract matched</p>
                        <p>
                          {matchedContract.name} ({matchedContract.code}) —{" "}
                          {format(new Date(matchedContract.validFrom), "dd MMM yyyy")} to{" "}
                          {format(new Date(matchedContract.validTo), "dd MMM yyyy")}
                        </p>
                      </div>
                    ) : (
                      <p className="text-destructive">
                        No published contract covers these dates for the selected hotel.
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Step 3: Rooms */}
          {step === 3 && (
            <div className="space-y-4">
              {roomFields.map((field, index) => (
                <Card key={field.id}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">Room {index + 1}</CardTitle>
                      {roomFields.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => removeRoom(index)}
                        >
                          Remove
                        </Button>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name={`rooms.${index}.roomTypeId`}
                        render={({ field: f }) => (
                          <FormItem>
                            <FormLabel>Room Type *</FormLabel>
                            <Select onValueChange={f.onChange} value={f.value}>
                              <FormControl>
                                <SelectTrigger className="w-full">
                                  <SelectValue placeholder="Select room type" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {contractRoomTypes.map((rt) => (
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
                      <FormField
                        control={form.control}
                        name={`rooms.${index}.mealBasisId`}
                        render={({ field: f }) => (
                          <FormItem>
                            <FormLabel>Meal Basis *</FormLabel>
                            <Select onValueChange={f.onChange} value={f.value}>
                              <FormControl>
                                <SelectTrigger className="w-full">
                                  <SelectValue placeholder="Select meal" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {contractMealBases.map((mb) => (
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
                    </div>

                    <div className="grid grid-cols-4 gap-4">
                      <FormField
                        control={form.control}
                        name={`rooms.${index}.adults`}
                        render={({ field: f }) => (
                          <FormItem>
                            <FormLabel>Adults</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                min={1}
                                max={6}
                                {...f}
                                onChange={(e) =>
                                  f.onChange(parseInt(e.target.value) || 1)
                                }
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name={`rooms.${index}.children`}
                        render={({ field: f }) => (
                          <FormItem>
                            <FormLabel>Children</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                min={0}
                                max={4}
                                {...f}
                                onChange={(e) =>
                                  f.onChange(parseInt(e.target.value) || 0)
                                }
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name={`rooms.${index}.infants`}
                        render={({ field: f }) => (
                          <FormItem>
                            <FormLabel>Infants</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                min={0}
                                max={2}
                                {...f}
                                onChange={(e) =>
                                  f.onChange(parseInt(e.target.value) || 0)
                                }
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name={`rooms.${index}.extraBed`}
                        render={({ field: f }) => (
                          <FormItem className="flex items-end gap-2 pb-2">
                            <FormControl>
                              <Checkbox
                                checked={f.value}
                                onCheckedChange={f.onChange}
                              />
                            </FormControl>
                            <FormLabel>Extra Bed</FormLabel>
                          </FormItem>
                        )}
                      />
                    </div>

                  </CardContent>
                </Card>
              ))}

              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  appendRoom({
                    roomTypeId: "",
                    mealBasisId: "",
                    adults: 2,
                    children: 0,
                    infants: 0,
                    extraBed: false,
                  })
                }
              >
                + Add Room
              </Button>

              {/* Rate Preview */}
              {canCalcRates && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Rate Preview</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {ratesLoading ? (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Loader2 className="size-4 animate-spin" />
                        Calculating rates...
                      </div>
                    ) : ratesError ? (
                      <p className="text-sm text-destructive">
                        {ratesError.message}
                      </p>
                    ) : ratePreview ? (
                      <div className="space-y-2 text-sm">
                        {ratePreview.rooms.map((r, i) => (
                          <div
                            key={i}
                            className="flex justify-between rounded bg-muted/50 p-2"
                          >
                            <span>Room {r.roomIndex}</span>
                            <span className="font-mono">
                              Buy: {r.buyingTotal.toFixed(2)} | Sell:{" "}
                              {r.sellingTotal.toFixed(2)}
                            </span>
                          </div>
                        ))}
                        <div className="flex justify-between font-medium border-t pt-2">
                          <span>Totals</span>
                          <span className="font-mono">
                            Buy: {ratePreview.buyingTotal.toFixed(2)} | Sell:{" "}
                            {ratePreview.sellingTotal.toFixed(2)}
                          </span>
                        </div>
                        {ratePreview.markupRuleName ? (
                          <p className="text-xs text-muted-foreground">
                            Markup: {ratePreview.markupRuleName} —{" "}
                            {ratePreview.markupType === "PERCENTAGE"
                              ? `${ratePreview.markupValue}%`
                              : `${ratePreview.markupValue} / night`}{" "}
                            = {ratePreview.markupAmount.toFixed(2)}
                          </p>
                        ) : (
                          <p className="text-xs text-amber-600">
                            No markup rule matched — selling = buying
                          </p>
                        )}
                      </div>
                    ) : null}
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* Step 4: Guest Info */}
          {step === 4 && (
            <Card>
              <CardHeader>
                <CardTitle>Lead Guest Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="leadGuestName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Guest Name</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="John Doe"
                            {...field}
                            value={field.value ?? ""}
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
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input
                            type="email"
                            placeholder="guest@example.com"
                            {...field}
                            value={field.value ?? ""}
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
                    name="leadGuestPhone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="+1 234 567 890"
                            {...field}
                            value={field.value ?? ""}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="externalRef"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>External Reference</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="TO booking ref"
                            {...field}
                            value={field.value ?? ""}
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
                          rows={3}
                          placeholder="Any special requirements..."
                          {...field}
                          value={field.value ?? ""}
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
                          rows={2}
                          placeholder="Internal team notes..."
                          {...field}
                          value={field.value ?? ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
          )}

          {/* Step 5: Review */}
          {step === 5 && (
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Booking Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <InfoRow label="Hotel" value={selectedHotel?.name ?? "—"} />
                  <InfoRow
                    label="Tour Operator"
                    value={selectedTO?.name ?? "Direct Booking"}
                  />
                  <InfoRow
                    label="Contract"
                    value={
                      selectedContract
                        ? `${selectedContract.name} (${selectedContract.code})`
                        : "—"
                    }
                  />
                  <InfoRow label="Check-in" value={checkIn ? format(new Date(checkIn), "dd MMM yyyy") : "—"} />
                  <InfoRow label="Check-out" value={checkOut ? format(new Date(checkOut), "dd MMM yyyy") : "—"} />
                  <InfoRow label="Nights" value={String(nights)} />
                  <InfoRow label="Rooms" value={String(rooms.length)} />
                  <InfoRow
                    label="Lead Guest"
                    value={form.getValues("leadGuestName") || "—"}
                  />

                  {ratePreview && (
                    <>
                      <div className="my-2 border-t" />
                      <InfoRow
                        label="Buying Total"
                        value={ratePreview.buyingTotal.toFixed(2)}
                      />
                      <InfoRow
                        label="Selling Total"
                        value={ratePreview.sellingTotal.toFixed(2)}
                      />
                      <InfoRow
                        label="Margin"
                        value={(
                          ratePreview.sellingTotal - ratePreview.buyingTotal
                        ).toFixed(2)}
                      />
                    </>
                  )}

                </CardContent>
              </Card>
            </div>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={step === 0 ? () => router.push("/reservations/bookings") : handleBack}
            >
              <ChevronLeft className="mr-1 size-4" />
              {step === 0 ? "Cancel" : "Back"}
            </Button>

            {step < STEPS.length - 1 ? (
              <Button
                type="button"
                onClick={handleNext}
                disabled={!canProceed()}
              >
                Next
                <ChevronRight className="ml-1 size-4" />
              </Button>
            ) : (
              <Button
                type="button"
                onClick={handleSubmit}
                disabled={createMutation.isPending}
              >
                {createMutation.isPending ? "Creating..." : "Create Booking"}
              </Button>
            )}
          </div>

          {createMutation.error && (
            <p className="text-sm text-destructive">
              {createMutation.error.message}
            </p>
          )}
        </form>
      </Form>
    </div>
  );
}

function InfoRow({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value ?? "—"}</span>
    </div>
  );
}
