"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";

interface BookingLike {
  id: string;
  leadGuestFirstName: string | null;
  leadGuestLastName: string | null;
  leadGuestEmail: string | null;
  leadGuestPhone: string | null;
  partnerReference: string | null;
  specialRequests: string | null;
  arrivalFlightNo: string | null;
  arrivalTime: string | null;
  arrivalOriginApt: string | null;
  arrivalDestApt: string | null;
  departFlightNo: string | null;
  departTime: string | null;
  departOriginApt: string | null;
  departDestApt: string | null;
}

/**
 * The edits that cost nothing: who is travelling, what they are flying on,
 * what they have asked for. No re-price, no allotment, no approval.
 */
export function BookingDetailsForm({
  booking,
  editable,
  onSaved,
}: {
  booking: BookingLike;
  editable: boolean;
  onSaved: () => void;
}) {
  const [form, setForm] = useState(booking);

  useEffect(() => setForm(booking), [booking]);

  const save = trpc.partner.booking.updateDetails.useMutation({
    onSuccess: () => {
      toast.success("Details saved.");
      onSaved();
    },
    onError: (e) => toast.error(e.message),
  });

  const set = (patch: Partial<BookingLike>) => setForm((prev) => ({ ...prev, ...patch }));
  const text = (v: string | null) => v ?? "";

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Lead guest</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label className="text-xs">First name</Label>
            <Input
              value={text(form.leadGuestFirstName)}
              disabled={!editable}
              onChange={(e) => set({ leadGuestFirstName: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Last name</Label>
            <Input
              value={text(form.leadGuestLastName)}
              disabled={!editable}
              onChange={(e) => set({ leadGuestLastName: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Email</Label>
            <Input
              type="email"
              value={text(form.leadGuestEmail)}
              disabled={!editable}
              onChange={(e) => set({ leadGuestEmail: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Phone</Label>
            <Input
              value={text(form.leadGuestPhone)}
              disabled={!editable}
              onChange={(e) => set({ leadGuestPhone: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Your reference</Label>
            <Input
              value={text(form.partnerReference)}
              disabled={!editable}
              onChange={(e) => set({ partnerReference: e.target.value })}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Flights</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {(
            [
              { label: "Arrival", no: "arrivalFlightNo", time: "arrivalTime", from: "arrivalOriginApt", to: "arrivalDestApt" },
              { label: "Departure", no: "departFlightNo", time: "departTime", from: "departOriginApt", to: "departDestApt" },
            ] as const
          ).map((leg) => (
            <div key={leg.label} className="grid gap-3 sm:grid-cols-4">
              <div className="space-y-1.5">
                <Label className="text-xs">{leg.label} flight</Label>
                <Input
                  value={text(form[leg.no])}
                  disabled={!editable}
                  onChange={(e) => set({ [leg.no]: e.target.value } as Partial<BookingLike>)}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Time</Label>
                <Input
                  placeholder="14:35"
                  value={text(form[leg.time])}
                  disabled={!editable}
                  onChange={(e) => set({ [leg.time]: e.target.value } as Partial<BookingLike>)}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">From</Label>
                <Input
                  value={text(form[leg.from])}
                  disabled={!editable}
                  onChange={(e) => set({ [leg.from]: e.target.value } as Partial<BookingLike>)}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">To</Label>
                <Input
                  value={text(form[leg.to])}
                  disabled={!editable}
                  onChange={(e) => set({ [leg.to]: e.target.value } as Partial<BookingLike>)}
                />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Special requests</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            rows={3}
            value={text(form.specialRequests)}
            disabled={!editable}
            placeholder="Anything the hotel should know. Requests are not guaranteed."
            onChange={(e) => set({ specialRequests: e.target.value })}
          />
        </CardContent>
      </Card>

      {editable && (
        <div className="flex justify-end">
          <Button
            disabled={save.isPending}
            onClick={() =>
              save.mutate({
                id: booking.id,
                leadGuestFirstName: form.leadGuestFirstName ?? undefined,
                leadGuestLastName: form.leadGuestLastName ?? undefined,
                leadGuestEmail: form.leadGuestEmail || undefined,
                leadGuestPhone: form.leadGuestPhone ?? undefined,
                partnerReference: form.partnerReference ?? undefined,
                specialRequests: form.specialRequests ?? undefined,
                arrival: {
                  flightNo: form.arrivalFlightNo ?? undefined,
                  time: form.arrivalTime ?? undefined,
                  originApt: form.arrivalOriginApt ?? undefined,
                  destApt: form.arrivalDestApt ?? undefined,
                },
                departure: {
                  flightNo: form.departFlightNo ?? undefined,
                  time: form.departTime ?? undefined,
                  originApt: form.departOriginApt ?? undefined,
                  destApt: form.departDestApt ?? undefined,
                },
              })
            }
          >
            {save.isPending ? "Saving..." : "Save details"}
          </Button>
        </div>
      )}
    </div>
  );
}
