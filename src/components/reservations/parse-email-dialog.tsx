"use client";

import { AlertTriangle, Loader2, Upload } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

/**
 * Reads a tour operator's email into candidate booking fields. The result only
 * pre-fills the form — nothing is saved until the agent submits the booking.
 */
export function ParseEmailDialog({
  open,
  onOpenChange,
  onApply,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onApply: (resolved: any) => void;
}) {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [result, setResult] = useState<any>(null);

  async function send(body: BodyInit, headers?: HeadersInit) {
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/reservations/parse-email", { method: "POST", body, headers });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Parsing failed");
        return;
      }
      setResult(data);
    } catch {
      toast.error("Parsing failed");
    } finally {
      setLoading(false);
    }
  }

  function reset() {
    setText("");
    setResult(null);
  }

  const confidenceOf = (field: string) => {
    const c = result?.parsed?.confidence?.[field];
    return typeof c === "number" ? c : null;
  };

  const rows: { label: string; value: string | null; field: string; matched?: boolean }[] = result
    ? [
        { label: "Email type", value: result.parsed.emailType, field: "emailType" },
        { label: "Hotel", value: result.hotel?.name ?? result.parsed.hotelName, field: "hotelName", matched: !!result.hotel },
        { label: "Tour operator", value: result.tourOperator?.name ?? result.parsed.tourOperatorName, field: "tourOperatorName", matched: !!result.tourOperator },
        { label: "Market", value: result.market?.name ?? result.parsed.marketName, field: "marketName", matched: !!result.market },
        { label: "Room type", value: result.roomType?.name ?? result.parsed.roomTypeName, field: "roomTypeName", matched: !!result.roomType },
        { label: "Meal basis", value: result.mealBasis?.name ?? result.parsed.mealBasis, field: "mealBasis", matched: !!result.mealBasis },
        { label: "T/O ref", value: result.parsed.externalRef, field: "externalRef" },
        { label: "Check-in", value: result.parsed.checkIn, field: "checkIn" },
        { label: "Check-out", value: result.parsed.checkOut, field: "checkOut" },
        { label: "Rooms", value: result.parsed.noOfRooms?.toString() ?? null, field: "noOfRooms" },
        {
          label: "Pax",
          value: `${result.parsed.adults ?? 0} ad / ${result.parsed.children ?? 0} ch / ${result.parsed.infants ?? 0} inf`,
          field: "adults",
        },
        { label: "Guests", value: (result.parsed.guestNames ?? []).join(", ") || null, field: "guestNames" },
        { label: "Arrival flight", value: result.parsed.arrivalFlightNo, field: "arrivalFlightNo" },
        { label: "Departure flight", value: result.parsed.departFlightNo, field: "departFlightNo" },
      ].filter((r) => r.value)
    : [];

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) reset();
        onOpenChange(v);
      }}
    >
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Parse booking email</DialogTitle>
          <DialogDescription>
            Paste the operator&apos;s email or upload the .eml file. Every field comes back
            editable — nothing is saved until you submit the booking.
          </DialogDescription>
        </DialogHeader>

        {!result ? (
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Email text</Label>
              <Textarea
                rows={10}
                placeholder="Paste the booking email here..."
                value={text}
                onChange={(e) => setText(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                id="parse-email-file"
                type="file"
                accept=".eml,.txt,.msg,message/rfc822,text/plain"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const fd = new FormData();
                  fd.append("file", file);
                  void send(fd);
                  e.target.value = "";
                }}
              />
              <Button variant="outline" size="sm" asChild>
                <label htmlFor="parse-email-file" className="cursor-pointer">
                  <Upload className="mr-1 size-4" /> Upload .eml
                </label>
              </Button>
              <span className="text-xs text-muted-foreground">or paste above</span>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {result.unmatched.length > 0 && (
              <div className="flex gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
                <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600" />
                <div>
                  <p className="font-medium">Pick these manually</p>
                  <p className="text-muted-foreground">{result.unmatched.join(" · ")}</p>
                </div>
              </div>
            )}

            <div className="max-h-[45vh] overflow-y-auto rounded-md border">
              <table className="w-full text-sm">
                <tbody>
                  {rows.map((r) => {
                    const conf = confidenceOf(r.field);
                    return (
                      <tr key={r.label} className="border-b last:border-b-0">
                        <td className="w-40 px-3 py-1.5 text-muted-foreground">{r.label}</td>
                        <td className="px-3 py-1.5">{r.value}</td>
                        <td className="w-28 px-3 py-1.5 text-right">
                          {r.matched === false && <Badge variant="outline">no match</Badge>}
                          {conf !== null && conf < 0.6 && (
                            <Badge variant="secondary" className="ml-1">low</Badge>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <DialogFooter>
          {result ? (
            <>
              <Button variant="outline" onClick={reset}>Parse another</Button>
              <Button onClick={() => onApply(result)}>Fill the form</Button>
            </>
          ) : (
            <Button
              disabled={loading || text.trim().length < 20}
              onClick={() =>
                send(JSON.stringify({ text }), { "Content-Type": "application/json" })
              }
            >
              {loading ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
              {loading ? "Reading..." : "Parse"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
