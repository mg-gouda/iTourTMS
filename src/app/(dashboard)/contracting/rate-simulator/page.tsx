"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Calculator, AlertTriangle, CheckCircle, Save } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc";

export default function RateSimulatorPage() {
  const [contractId, setContractId] = useState("");
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [adults, setAdults] = useState(2);
  const [childAges, setChildAges] = useState<number[]>([]);
  const [bookingDate, setBookingDate] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [showOffers, setShowOffers] = useState(true);

  const { data: allContracts } = trpc.contracting.contract.list.useQuery();
  const contracts = (allContracts ?? []).filter(
    (c: { status: string }) => c.status === "PUBLISHED",
  );

  const enabled = !!contractId && !!checkIn && !!checkOut;

  const {
    data: result,
    isLoading,
    refetch,
  } = trpc.contracting.rateVerification.simulate.useQuery(
    {
      contractId,
      checkIn,
      checkOut,
      adults,
      childAges,
      bookingDate,
      showOffers,
    },
    { enabled, retry: false },
  );

  const saveMutation =
    trpc.contracting.rateVerification.saveResult.useMutation({
      onSuccess: () => toast.success("Simulation saved"),
      onError: (e) => toast.error(e.message),
    });

  function handleSave() {
    if (!result) return;
    saveMutation.mutate({
      contractId,
      checkIn,
      checkOut,
      adults,
      childAges,
      bookingDate,
      resultData: {
        nightBreakdown: result.nightBreakdown,
        rateMatrix: result.rateMatrix,
      },
      warnings: result.warnings,
      status: result.status,
    });
  }

  function addChild() {
    setChildAges([...childAges, 5]);
  }

  function removeChild(index: number) {
    setChildAges(childAges.filter((_, i) => i !== index));
  }

  return (
    <div className="animate-fade-in space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Rate Simulator</h1>
        <p className="text-muted-foreground">
          Verify rate calculations for any contract, dates, and guest
          configuration
        </p>
      </div>

      {/* Input Form */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
            <div className="md:col-span-2">
              <Label>Contract</Label>
              <Select value={contractId || "none"} onValueChange={(v) => setContractId(v === "none" ? "" : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select contract..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none" disabled>
                    Select contract
                  </SelectItem>
                  {contracts.map((c: { id: string; code: string; name: string; hotel?: { name: string } }) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.code} — {c.name}
                      {c.hotel?.name ? ` (${c.hotel.name})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Check-in</Label>
              <Input
                type="date"
                value={checkIn}
                onChange={(e) => setCheckIn(e.target.value)}
              />
            </div>
            <div>
              <Label>Check-out</Label>
              <Input
                type="date"
                value={checkOut}
                onChange={(e) => setCheckOut(e.target.value)}
                min={checkIn}
              />
            </div>
            <div>
              <Label>Adults</Label>
              <Input
                type="number"
                min={1}
                max={6}
                value={adults}
                onChange={(e) => setAdults(Number(e.target.value))}
              />
            </div>
            <div>
              <Label>Booking Date</Label>
              <Input
                type="date"
                value={bookingDate}
                onChange={(e) => setBookingDate(e.target.value)}
              />
            </div>
          </div>

          {/* Child ages */}
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Button variant="outline" size="sm" onClick={addChild}>
              + Add Child
            </Button>
            {childAges.map((age, i) => (
              <div key={i} className="flex items-center gap-1">
                <Input
                  type="number"
                  min={0}
                  max={17}
                  value={age}
                  onChange={(e) => {
                    const newAges = [...childAges];
                    newAges[i] = Number(e.target.value);
                    setChildAges(newAges);
                  }}
                  className="w-16"
                />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeChild(i)}
                  className="h-8 w-8 p-0 text-destructive"
                >
                  &times;
                </Button>
              </div>
            ))}
          </div>

          <div className="mt-4 flex items-center gap-4">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={showOffers}
                onChange={(e) => setShowOffers(e.target.checked)}
                className="rounded"
              />
              Show offer eligibility
            </label>
            <Button disabled={!enabled} onClick={() => refetch()}>
              <Calculator className="mr-2 h-4 w-4" />
              Simulate
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Loading */}
      {isLoading && (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      )}

      {/* Results */}
      {result && (
        <div className="space-y-4">
          {/* Header */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    {result.status === "OK" ? (
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    ) : (
                      <AlertTriangle className="h-5 w-5 text-yellow-500" />
                    )}
                    {result.contractCode} — {result.contractName}
                  </CardTitle>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {result.hotelName} | {result.nights} night(s) |{" "}
                    {result.adults} adult(s)
                    {childAges.length > 0 &&
                      ` + ${childAges.length} child(ren)`}{" "}
                    | Rate basis: {result.rateBasis}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSave}
                  disabled={saveMutation.isPending}
                >
                  <Save className="mr-1 h-4 w-4" />
                  Save
                </Button>
              </div>
            </CardHeader>
          </Card>

          {/* Warnings */}
          {result.warnings.length > 0 && (
            <Card className="border-yellow-200 bg-yellow-50">
              <CardContent className="pt-4">
                <h3 className="mb-2 flex items-center gap-2 font-semibold text-yellow-800">
                  <AlertTriangle className="h-4 w-4" />
                  Warnings
                </h3>
                <ul className="space-y-1">
                  {result.warnings.map((w, i) => (
                    <li key={i} className="text-sm text-yellow-700">
                      {w}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Night Breakdown */}
          {result.nightBreakdown && result.nightBreakdown.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  Nightly Breakdown
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-xs text-muted-foreground">
                        <th className="pb-2">Night</th>
                        <th className="pb-2">Date</th>
                        <th className="pb-2">Season</th>
                        <th className="pb-2 text-right">Rate</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.nightBreakdown.map((nb, i) => (
                          <tr key={i} className="border-b last:border-0">
                            <td className="py-1.5">{i + 1}</td>
                            <td className="py-1.5">{nb.date}</td>
                            <td className="py-1.5">
                              {nb.seasonLabel ?? "—"}
                            </td>
                            <td className="py-1.5 text-right font-medium">
                              —
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Rate Matrix */}
          {result.rateMatrix && result.rateMatrix.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Rate Matrix</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-xs text-muted-foreground">
                        <th className="pb-2">Room Type</th>
                        <th className="pb-2">Meal Plan</th>
                        <th className="pb-2 text-right">Total Rate</th>
                        <th className="pb-2 text-right">Avg/Night</th>
                        <th className="pb-2 text-right font-bold">After Offers</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.rateMatrix.map((row, i) => (
                          <tr
                            key={i}
                            className="border-b last:border-0"
                          >
                            <td className="py-1.5">{row.roomTypeName}</td>
                            <td className="py-1.5">{row.mealBasisName}</td>
                            <td className="py-1.5 text-right">
                              {row.totalRate.toFixed(2)}
                            </td>
                            <td className="py-1.5 text-right">
                              {row.avgPerNight.toFixed(2)}
                            </td>
                            <td className="py-1.5 text-right font-bold">
                              {row.totalAfterOffers.toFixed(2)}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Offer Eligibility */}
          {result.offerEligibility && result.offerEligibility.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  Special Offer Eligibility
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {result.offerEligibility.map(
                    (offer: {
                      offerId: string;
                      offerName: string;
                      offerType: string;
                      eligible: boolean;
                      reasons: string[];
                      discountType: string;
                      discountValue: number;
                      combinable: boolean;
                    }) => (
                      <div
                        key={offer.offerId}
                        className={`rounded-lg border p-3 ${
                          offer.eligible
                            ? "border-green-200 bg-green-50"
                            : "border-gray-200"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Badge
                              variant={
                                offer.eligible ? "default" : "secondary"
                              }
                            >
                              {offer.eligible ? "Eligible" : "Not Eligible"}
                            </Badge>
                            <span className="font-medium">
                              {offer.offerName}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              ({offer.offerType})
                            </span>
                          </div>
                          <div className="text-sm">
                            {offer.discountType === "PERCENTAGE"
                              ? `${offer.discountValue}%`
                              : offer.discountValue.toFixed(2)}{" "}
                            off
                            {offer.combinable && (
                              <span className="ml-1 text-xs text-muted-foreground">
                                (combinable)
                              </span>
                            )}
                          </div>
                        </div>
                        <ul className="mt-1 space-y-0.5">
                          {offer.reasons.map((r, j) => (
                            <li
                              key={j}
                              className={`text-xs ${
                                offer.eligible
                                  ? "text-green-700"
                                  : "text-muted-foreground"
                              }`}
                            >
                              {r}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ),
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Saved Results */}
      {contractId && <SavedResults contractId={contractId} />}
    </div>
  );
}

function SavedResults({ contractId }: { contractId: string }) {
  const utils = trpc.useUtils();
  const { data: results } = trpc.contracting.rateVerification.listResults.useQuery({ contractId });
  const deleteMutation = trpc.contracting.rateVerification.deleteResult.useMutation({
    onSuccess: () => {
      toast.success("Result deleted");
      utils.contracting.rateVerification.listResults.invalidate({ contractId });
    },
    onError: (e) => toast.error(e.message),
  });

  if (!results || results.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Saved Simulations</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {results.map((r: { id: string; checkIn: string | Date; checkOut: string | Date; adults: number; children: number; status: string; createdAt: string | Date }) => (
            <div key={r.id} className="flex items-center justify-between rounded-md border p-2 text-sm">
              <div className="flex items-center gap-3">
                <Badge variant={r.status === "OK" ? "default" : "secondary"}>{r.status}</Badge>
                <span>
                  {new Date(r.checkIn).toLocaleDateString()} — {new Date(r.checkOut).toLocaleDateString()}
                </span>
                <span className="text-muted-foreground">
                  {r.adults}A + {r.children}C
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">
                  {new Date(r.createdAt).toLocaleString()}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 text-destructive"
                  onClick={() => deleteMutation.mutate({ id: r.id })}
                >
                  &times;
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
