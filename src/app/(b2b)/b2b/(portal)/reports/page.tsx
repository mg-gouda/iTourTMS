"use client";

import { Download, FileSpreadsheet } from "lucide-react";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  PARTNER_BOOKING_STATUS_LABELS,
  PARTNER_BOOKING_STATUS_VARIANTS,
} from "@/lib/constants/b2b-portal";
import { exportReportToExcel } from "@/lib/export/report-excel";
import { exportReportToPdf } from "@/lib/export/report-pdf";
import { trpc } from "@/lib/trpc";

const yearStart = () => `${new Date().getFullYear()}-01-01`;
const today = () => new Date().toISOString().slice(0, 10);

const date = (d: Date | string | null) =>
  d ? new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—";

const n2 = (v: number | string | { toString(): string }) =>
  Number(v).toLocaleString("en", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/**
 * The four reports the plan asks for, on demand only — nothing is scheduled or
 * emailed, so a partner pulls a number when they need it rather than drowning
 * in reports nobody opens.
 */
export default function PartnerReportsPage() {
  const [from, setFrom] = useState(yearStart());
  const [to, setTo] = useState(today());

  const range = { from: new Date(from), to: new Date(`${to}T23:59:59`) };
  const production = trpc.partner.reports.production.useQuery(range);
  const bookings = trpc.partner.reports.bookingList.useQuery(range);
  const cancellations = trpc.partner.reports.cancellations.useQuery(range);
  const financial = trpc.partner.reports.financialSummary.useQuery(range);

  const periodLabel = `${date(from)} – ${date(to)}`;

  /** One place that knows how each report turns into rows for either format. */
  const tables = {
    production: {
      title: "Production by hotel",
      headers: ["Hotel", "City", "Bookings", "Room nights", "Guests", "Net", "Your price"],
      rows: (production.data?.rows ?? []).map((r) => [
        r.hotel,
        r.city,
        String(r.bookings),
        String(r.roomNights),
        String(r.pax),
        n2(r.net),
        n2(r.client),
      ]),
    },
    bookings: {
      title: "Booking list",
      headers: ["Reference", "Your ref", "Hotel", "Lead guest", "Check in", "Check out", "Rooms", "Status", "Net", "Your price"],
      rows: (bookings.data ?? []).map((b) => [
        b.code,
        b.partnerReference ?? "",
        b.hotel?.name ?? "",
        `${b.leadGuestFirstName ?? ""} ${b.leadGuestLastName ?? ""}`.trim(),
        date(b.checkIn),
        date(b.checkOut),
        String(b.noOfRooms),
        PARTNER_BOOKING_STATUS_LABELS[b.status] ?? b.status,
        n2(b.buyingTotal),
        n2(b.partnerClientPrice ?? b.buyingTotal),
      ]),
    },
    cancellations: {
      title: "Cancellations and penalties",
      headers: ["Reference", "Hotel", "Arrival", "Cancelled", "Value", "Penalty", "Reason"],
      rows: (cancellations.data?.rows ?? []).map((r) => [
        r.code,
        r.hotel?.name ?? "",
        date(r.checkIn),
        date(r.cancelledAt),
        n2(r.buyingTotal),
        n2(r.sourcePenaltyAmount),
        r.cancellationReason ?? "",
      ]),
    },
    financial: {
      title: "Financial summary",
      headers: ["Measure", "Value"],
      rows: financial.data
        ? [
            ["Bookings made", String(financial.data.bookings)],
            ["Net value (what you owe us)", n2(financial.data.net)],
            ["Your client price", n2(financial.data.clientPrice)],
            ["Your margin", n2(financial.data.margin)],
            ["Cancellations", String(financial.data.cancellations)],
            ["Cancelled value", n2(financial.data.cancelledValue)],
            ["Penalties", n2(financial.data.penalties)],
            ["Charged to credit", n2(financial.data.charged)],
            ["Payments received", n2(financial.data.paid)],
            ["Credit notes", n2(financial.data.creditNotes)],
            ["Credit limit", financial.data.creditLimit === null ? "No limit" : n2(financial.data.creditLimit)],
            ["Credit used", n2(financial.data.creditUsed)],
          ]
        : [],
    },
  } as const;

  const download = (key: keyof typeof tables, format: "excel" | "pdf") => {
    const t = tables[key];
    if (format === "excel") {
      void exportReportToExcel({ title: t.title, headers: [...t.headers], rows: t.rows.map((r) => [...r]) });
    } else {
      exportReportToPdf({
        title: t.title,
        subtitle: periodLabel,
        headers: [...t.headers],
        rows: t.rows.map((r) => [...r]),
      });
    }
  };

  const Actions = ({ report }: { report: keyof typeof tables }) => (
    <div className="flex gap-2">
      <Button variant="outline" size="sm" onClick={() => download(report, "excel")}>
        <FileSpreadsheet className="mr-2 size-4" /> Excel
      </Button>
      <Button variant="outline" size="sm" onClick={() => download(report, "pdf")}>
        <Download className="mr-2 size-4" /> PDF
      </Button>
    </div>
  );

  const Table = ({ report, loading }: { report: keyof typeof tables; loading: boolean }) => {
    const t = tables[report];
    if (loading) return <Skeleton className="h-64" />;
    if (t.rows.length === 0) {
      return <p className="text-muted-foreground py-8 text-center text-sm">Nothing in this period.</p>;
    }
    return (
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-muted-foreground border-b text-xs">
            <tr>
              {t.headers.map((h, i) => (
                <th key={h} className={`p-2 font-medium ${i >= t.headers.length - 2 ? "text-right" : "text-left"}`}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {t.rows.map((row, i) => (
              <tr key={i} className="border-b last:border-0">
                {row.map((cell, j) => (
                  <td key={j} className={`p-2 ${j >= row.length - 2 ? "text-right" : ""}`}>
                    {report === "bookings" && j === 7 ? (
                      <Badge
                        variant={
                          PARTNER_BOOKING_STATUS_VARIANTS[bookings.data?.[i]?.status ?? ""] ?? "secondary"
                        }
                      >
                        {cell}
                      </Badge>
                    ) : (
                      cell
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="animate-fade-in space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Reports</h1>
        <p className="text-muted-foreground">
          Your production, bookings and money over a period. Download any of them.
        </p>
      </div>

      <Card>
        <CardContent className="flex flex-wrap items-end gap-3 py-4">
          <div className="space-y-1">
            <Label className="text-xs">From</Label>
            <Input type="date" value={from} max={to} onChange={(e) => setFrom(e.target.value)} className="w-40" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">To</Label>
            <Input type="date" value={to} min={from} onChange={(e) => setTo(e.target.value)} className="w-40" />
          </div>
          <p className="text-muted-foreground pb-2 text-xs">
            Production and bookings are counted by arrival date; cancellations and the
            financial summary by when they happened.
          </p>
        </CardContent>
      </Card>

      <Tabs defaultValue="production">
        <TabsList>
          <TabsTrigger value="production">Production</TabsTrigger>
          <TabsTrigger value="bookings">Bookings</TabsTrigger>
          <TabsTrigger value="cancellations">Cancellations</TabsTrigger>
          <TabsTrigger value="financial">Financial</TabsTrigger>
        </TabsList>

        {(
          [
            ["production", production.isLoading],
            ["bookings", bookings.isLoading],
            ["cancellations", cancellations.isLoading],
            ["financial", financial.isLoading],
          ] as const
        ).map(([key, loading]) => (
          <TabsContent key={key} value={key} className="mt-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-base">{tables[key].title}</CardTitle>
                <Actions report={key} />
              </CardHeader>
              <CardContent>
                <Table report={key} loading={loading} />
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
