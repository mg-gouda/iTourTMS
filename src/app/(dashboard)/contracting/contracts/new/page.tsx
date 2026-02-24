"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import type { z } from "zod";

import { Button } from "@/components/ui/button";
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
import { Textarea } from "@/components/ui/textarea";
import { RATE_BASIS_LABELS } from "@/lib/constants/contracting";
import { trpc } from "@/lib/trpc";
import { contractCreateSchema } from "@/lib/validations/contracting";

type FormValues = z.input<typeof contractCreateSchema>;

const RATE_BASIS_OPTIONS = Object.entries(RATE_BASIS_LABELS) as [
  string,
  string,
][];

export default function NewContractPage() {
  const router = useRouter();
  const utils = trpc.useUtils();

  const { data: hotels } = trpc.contracting.hotel.list.useQuery();
  const { data: currencies } = trpc.setup.getCurrencies.useQuery();
  const { data: markets } = trpc.contracting.market.list.useQuery();

  const form = useForm<FormValues>({
    resolver: zodResolver(contractCreateSchema),
    defaultValues: {
      name: "",
      code: "",
      season: "",
      hotelId: "",
      marketIds: [],
      validFrom: "",
      validTo: "",
      travelFrom: "",
      travelTo: "",
      rateBasis: "PER_PERSON",
      baseCurrencyId: "",
      baseRoomTypeId: "",
      baseMealBasisId: "",
      minimumStay: 1,
      maximumStay: null,
      terms: "",
      internalNotes: "",
      hotelNotes: "",
    },
  });

  const selectedHotelId = form.watch("hotelId");

  // Load hotel details when a hotel is selected (for room types + meal basis)
  const { data: hotelDetail } = trpc.contracting.hotel.getById.useQuery(
    { id: selectedHotelId },
    { enabled: !!selectedHotelId },
  );

  // Auto-generate contract code: {HotelCode}/{Season}/{MarketCodes}
  function regenerateCode(hotelId?: string, season?: string | null, marketIds?: string[]) {
    const hotel = (hotels ?? []).find((h) => h.id === (hotelId ?? form.getValues("hotelId")));
    const hotelCode = hotel?.code ?? "";
    const seasonVal = season ?? form.getValues("season") ?? "";
    const mIds = marketIds ?? form.getValues("marketIds") ?? [];
    const marketCodes = (markets ?? [])
      .filter((m) => mIds.includes(m.id))
      .map((m) => m.code)
      .join("-");
    const parts = [hotelCode, seasonVal, marketCodes].filter(Boolean);
    form.setValue("code", parts.join("/"));
  }

  const createMutation = trpc.contracting.contract.create.useMutation({
    onSuccess: (data) => {
      utils.contracting.contract.list.invalidate();
      router.push(`/contracting/contracts/${data.id}`);
    },
  });

  function onSubmit(values: FormValues) {
    const clean = { ...values };
    if (!clean.season) clean.season = null;
    if (!clean.travelFrom) clean.travelFrom = null;
    if (!clean.travelTo) clean.travelTo = null;
    if (!clean.maximumStay) clean.maximumStay = null;
    if (!clean.terms) clean.terms = null;
    if (!clean.internalNotes) clean.internalNotes = null;
    if (!clean.hotelNotes) clean.hotelNotes = null;
    createMutation.mutate(clean);
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">New Contract</h1>
        <p className="text-muted-foreground">
          Create a new hotel contract with seasons and rates
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          {/* Hotel Selection */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Hotel</h2>
            <FormField
              control={form.control}
              name="hotelId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Select Hotel</FormLabel>
                  <Select
                    onValueChange={(val) => {
                      field.onChange(val);
                      // Auto-set contract name to hotel name
                      const hotel = (hotels ?? []).find((h) => h.id === val);
                      if (hotel) form.setValue("name", hotel.name);
                      // Reset dependent fields
                      form.setValue("baseRoomTypeId", "");
                      form.setValue("baseMealBasisId", "");
                      regenerateCode(val);
                    }}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select a hotel" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {(hotels ?? []).map((h) => (
                        <SelectItem key={h.id} value={h.id}>
                          {h.name} ({h.code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Contract Details */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Contract Details</h2>
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contract Name</FormLabel>
                    <FormControl>
                      <Input {...field} readOnly className="bg-muted" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="season"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Season</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Summer 2026"
                        {...field}
                        value={field.value ?? ""}
                        onChange={(e) => {
                          field.onChange(e.target.value);
                          regenerateCode(undefined, e.target.value);
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="marketIds"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Market Validity</FormLabel>
                  <div className="rounded-md border p-3">
                    {(markets ?? []).length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        No markets defined. Add markets in Settings &gt; Contracting.
                      </p>
                    ) : (
                      <div className="flex flex-wrap gap-4">
                        {(markets ?? []).filter((m) => m.active).map((m) => (
                          <label key={m.id} className="flex items-center gap-2 text-sm">
                            <Checkbox
                              checked={field.value?.includes(m.id)}
                              onCheckedChange={(checked) => {
                                const current = field.value ?? [];
                                const updated = checked
                                  ? [...current, m.id]
                                  : current.filter((id: string) => id !== m.id);
                                field.onChange(updated);
                                regenerateCode(undefined, undefined, updated);
                              }}
                            />
                            {m.name} ({m.code})
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
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
                    <Input {...field} readOnly className="bg-muted" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-4 gap-4">
              <FormField
                control={form.control}
                name="validFrom"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Booking From</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="validTo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Booking To</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="travelFrom"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Travel From</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} value={field.value ?? ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="travelTo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Travel To</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} value={field.value ?? ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="rateBasis"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Rate Basis</FormLabel>
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
                        {RATE_BASIS_OPTIONS.map(([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {label}
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
                name="baseCurrencyId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Currency</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select currency" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {(currencies ?? []).map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.code} — {c.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-2">
                <FormField
                  control={form.control}
                  name="minimumStay"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Min Stay</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={1}
                          {...field}
                          onChange={(e) =>
                            field.onChange(Number(e.target.value) || 1)
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="maximumStay"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Max Stay</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={1}
                          {...field}
                          value={field.value ?? ""}
                          onChange={(e) =>
                            field.onChange(
                              e.target.value ? Number(e.target.value) : null,
                            )
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
          </div>

          {/* Base Assignments */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Base Assignments</h2>
            <p className="text-sm text-muted-foreground">
              Select the base room type and meal basis for this contract. These
              will be automatically assigned.
            </p>
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="baseRoomTypeId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Base Room Type</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                      disabled={!selectedHotelId}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue
                            placeholder={
                              selectedHotelId
                                ? "Select room type"
                                : "Select a hotel first"
                            }
                          />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {(hotelDetail?.roomTypes ?? []).map((rt) => (
                          <SelectItem key={rt.id} value={rt.id}>
                            {rt.name} ({rt.code})
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
                name="baseMealBasisId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Base Meal Basis</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                      disabled={!selectedHotelId}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue
                            placeholder={
                              selectedHotelId
                                ? "Select meal basis"
                                : "Select a hotel first"
                            }
                          />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {(hotelDetail?.mealBasis ?? []).map((mb) => (
                          <SelectItem key={mb.id} value={mb.id}>
                            {mb.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>

          {/* Terms & Notes */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Terms & Notes</h2>
            <FormField
              control={form.control}
              name="terms"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Terms & Conditions</FormLabel>
                  <FormControl>
                    <Textarea
                      rows={3}
                      placeholder="Contract terms..."
                      {...field}
                      value={field.value ?? ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="internalNotes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Internal Notes</FormLabel>
                    <FormControl>
                      <Textarea
                        rows={3}
                        placeholder="Internal notes..."
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
                name="hotelNotes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Hotel Notes</FormLabel>
                    <FormControl>
                      <Textarea
                        rows={3}
                        placeholder="Notes for the hotel..."
                        {...field}
                        value={field.value ?? ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>

          {createMutation.error && (
            <p className="text-sm text-destructive">
              {createMutation.error.message}
            </p>
          )}

          <div className="flex gap-2">
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? "Creating..." : "Create Contract"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push("/contracting/contracts")}
            >
              Cancel
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
