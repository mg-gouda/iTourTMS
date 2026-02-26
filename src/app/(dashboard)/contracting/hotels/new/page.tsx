"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import type { z } from "zod";

import { GooglePlacesAutocomplete } from "@/components/shared/google-places-autocomplete";
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
import { STAR_RATING_LABELS } from "@/lib/constants/contracting";
import { trpc } from "@/lib/trpc";
import { hotelCreateSchema } from "@/lib/validations/contracting";

type FormValues = z.input<typeof hotelCreateSchema>;

const STAR_OPTIONS = Object.entries(STAR_RATING_LABELS) as [string, string][];

export default function NewHotelPage() {
  const router = useRouter();
  const utils = trpc.useUtils();
  const { data: countries } = trpc.setup.getCountries.useQuery();
  const { data: destinations } = trpc.contracting.destination.list.useQuery();
  const { data: amenities } = trpc.contracting.hotel.listAmenities.useQuery();
  const { data: googlePlacesApiKey } = trpc.settings.getGooglePlacesKey.useQuery();

  const form = useForm<FormValues>({
    resolver: zodResolver(hotelCreateSchema),
    defaultValues: {
      name: "",
      code: "",
      starRating: "THREE",
      chainName: "",
      giataId: "",
      description: "",
      address: "",
      city: "",
      cityId: "",
      zoneId: "",
      stateId: "",
      countryId: "",
      destinationId: "",
      phone: "",
      email: "",
      website: "",
      reservationEmail: "",
      contactPerson: "",
      checkInTime: "14:00",
      checkOutTime: "12:00",
      active: true,
      amenityIds: [],
    },
  });

  const selectedCountryId = form.watch("countryId");
  const selectedDestinationId = form.watch("destinationId");
  const selectedCityId = form.watch("cityId");
  const selectedZoneId = form.watch("zoneId");

  // Filter destinations by selected country
  const filteredDestinations = (destinations ?? []).filter(
    (d) => d.countryId === selectedCountryId,
  );

  const { data: cities } = trpc.contracting.destination.listCities.useQuery(
    { destinationId: selectedDestinationId! },
    { enabled: !!selectedDestinationId },
  );

  const { data: zones } = trpc.contracting.destination.listZones.useQuery(
    { cityId: selectedCityId! },
    { enabled: !!selectedCityId },
  );

  const { data: nextCode } = trpc.contracting.hotel.getNextHotelCode.useQuery(
    { zoneId: selectedZoneId! },
    { enabled: !!selectedZoneId },
  );

  // Auto-fill code when zone is selected
  useEffect(() => {
    if (nextCode && selectedZoneId) {
      form.setValue("code", nextCode);
    }
  }, [nextCode, selectedZoneId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Reset destination + city + zone when country changes
  useEffect(() => {
    form.setValue("destinationId", "");
    form.setValue("cityId", null);
    form.setValue("zoneId", null);
  }, [selectedCountryId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Reset city + zone when destination changes
  useEffect(() => {
    form.setValue("cityId", null);
    form.setValue("zoneId", null);
  }, [selectedDestinationId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Reset zone when city changes
  useEffect(() => {
    form.setValue("zoneId", null);
  }, [selectedCityId]); // eslint-disable-line react-hooks/exhaustive-deps

  const createMutation = trpc.contracting.hotel.create.useMutation({
    onSuccess: (data) => {
      utils.contracting.hotel.list.invalidate();
      router.push(`/contracting/hotels/${data.id}`);
    },
  });

  function onSubmit(values: FormValues) {
    // Clean empty strings to nullish
    const clean = { ...values };
    if (!clean.stateId) clean.stateId = null;
    if (!clean.destinationId) clean.destinationId = null;
    if (!clean.cityId) clean.cityId = null;
    if (!clean.zoneId) clean.zoneId = null;
    if (!clean.chainName) clean.chainName = null;
    if (!clean.email) clean.email = null;
    if (!clean.reservationEmail) clean.reservationEmail = null;
    createMutation.mutate(clean);
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">New Hotel</h1>
        <p className="text-muted-foreground">
          Add a new hotel to the contracting system
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          {/* Basic Info */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Basic Information</h2>
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Hotel Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Grand Seaside Resort" {...field} />
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
                      <Input
                        placeholder={selectedZoneId ? "Auto-generated" : "GSR"}
                        {...field}
                        readOnly={!!selectedZoneId}
                        className={selectedZoneId ? "bg-muted font-mono" : ""}
                      />
                    </FormControl>
                    {selectedZoneId && (
                      <p className="text-xs text-muted-foreground">
                        Auto-generated from zone selection
                      </p>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="starRating"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Star Rating</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value ?? "THREE"}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {STAR_OPTIONS.map(([value, label]) => (
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
                name="chainName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Chain Name</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Marriott, Hilton..."
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
                name="giataId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>GIATA ID</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g. 12345"
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

          {/* Location */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Location</h2>
            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Address</FormLabel>
                  <FormControl>
                    {googlePlacesApiKey ? (
                      <GooglePlacesAutocomplete
                        apiKey={googlePlacesApiKey}
                        value={field.value ?? ""}
                        onChange={(val) => field.onChange(val)}
                        onSelect={(address, lat, lng) => {
                          field.onChange(address);
                          form.setValue("latitude", lat);
                          form.setValue("longitude", lng);
                        }}
                      />
                    ) : (
                      <Input {...field} value={field.value ?? ""} />
                    )}
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
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
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="destinationId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Destination</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value ?? ""}
                      disabled={!selectedCountryId}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue
                            placeholder={
                              selectedCountryId
                                ? "Select destination"
                                : "Select country first"
                            }
                          />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {filteredDestinations.map((d) => (
                          <SelectItem key={d.id} value={d.id}>
                            {d.name} ({d.code})
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
                name="cityId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>City</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value ?? ""}
                      disabled={!selectedDestinationId}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue
                            placeholder={
                              selectedDestinationId
                                ? "Select city"
                                : "Select destination first"
                            }
                          />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {(cities ?? []).map((c) => (
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
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="zoneId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Zone</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value ?? ""}
                      disabled={!selectedCityId}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue
                            placeholder={
                              selectedCityId
                                ? "Select zone (optional)"
                                : "Select city first"
                            }
                          />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {(zones ?? []).map((z) => (
                          <SelectItem key={z.id} value={z.id}>
                            {z.code} — {z.name}
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

          {/* Contact */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Contact</h2>
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value ?? ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
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
                name="website"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Website</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value ?? ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="reservationEmail"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Reservation Email</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
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
              name="contactPerson"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Contact Person</FormLabel>
                  <FormControl>
                    <Input {...field} value={field.value ?? ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Operations */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Operations</h2>
            <div className="grid grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="checkInTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Check-in Time</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="checkOutTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Check-out Time</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="totalRooms"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Total Rooms</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
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

          {/* Amenities */}
          {amenities && amenities.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold">Amenities</h2>
              <div className="grid grid-cols-3 gap-2">
                {amenities.map((a) => {
                  const selected = form.watch("amenityIds") ?? [];
                  return (
                    <label
                      key={a.id}
                      className="flex items-center gap-2 text-sm"
                    >
                      <Checkbox
                        checked={selected.includes(a.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            form.setValue("amenityIds", [...selected, a.id]);
                          } else {
                            form.setValue(
                              "amenityIds",
                              selected.filter((id) => id !== a.id),
                            );
                          }
                        }}
                      />
                      {a.name}
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          {/* Description */}
          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Description</FormLabel>
                <FormControl>
                  <Textarea
                    rows={4}
                    placeholder="Hotel description..."
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

          {createMutation.error && (
            <p className="text-sm text-destructive">
              {createMutation.error.message}
            </p>
          )}

          <div className="flex gap-2">
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? "Creating..." : "Create Hotel"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push("/contracting/hotels")}
            >
              Cancel
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
