"use client";

import { format } from "date-fns";
import { FileDown, FileSpreadsheet } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { exportReportToExcel } from "@/lib/export/report-excel";
import { exportReportToPdf } from "@/lib/export/report-pdf";
import { trpc } from "@/lib/trpc";

const OFFER_TYPE_LABELS: Record<string, string> = {
  EARLY_BIRD: "Early Bird",
  FREE_NIGHTS: "Free Nights",
  DISCOUNT: "Discount",
  HONEYMOON: "Honeymoon",
  LONG_STAY: "Long Stay",
  REPEAT_GUEST: "Repeat Guest",
  GROUP: "Group",
  OTHER: "Other",
};

function fmtDate(d: string | Date | null | undefined) {
  if (!d) return "—";
  return format(new Date(d), "dd MMM yyyy");
}

export default function SeasonalOffersReportPage() {
  const router = useRouter();
  const [hotelId, setHotelId] = useState("ALL");
  const [offerTypeFilter, setOfferTypeFilter] = useState("ALL");

  const { data: hotels } = trpc.contracting.hotel.list.useQuery();
  const { data: rawData, isLoading } =
    trpc.contracting.reports.seasonalOffers.useQuery(
      hotelId === "ALL" ? {} : { hotelId },
    );

  // Client-side offer type filter
  const data = useMemo(() => {
    if (!rawData || offerTypeFilter === "ALL") return rawData;
    return rawData
      .map((c) => ({
        ...c,
        offers: c.offers.filter((o) => o.offerType === offerTypeFilter),
      }))
      .filter((c) => c.offers.length > 0);
  }, [rawData, offerTypeFilter]);

  const totalContracts = data?.length ?? 0;
  const totalOffers = data?.reduce((s, c) => s + c.offers.length, 0) ?? 0;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="page-header">
          <h1 className="text-2xl font-bold tracking-tight">Seasonal Offers</h1>
          <p className="text-muted-foreground">
            Special offers grouped by contract and season
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={hotelId} onValueChange={setHotelId}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="All Hotels" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Hotels</SelectItem>
              {(hotels ?? []).map((h) => (
                <SelectItem key={h.id} value={h.id}>
                  {h.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={offerTypeFilter} onValueChange={setOfferTypeFilter}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Types</SelectItem>
              {Object.entries(OFFER_TYPE_LABELS).map(([key, label]) => (
                <SelectItem key={key} value={key}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="sm"
            disabled={!data || data.length === 0}
            onClick={() => {
              if (!data) return;
              const headers = ["Hotel", "Contract", "Offer", "Type", "Discount", "Valid From", "Valid To", "Book By", "Min Nights", "Advance Days"];
              const rows: string[][] = [];
              for (const c of data) {
                for (const o of c.offers) {
                  rows.push([
                    c.hotelName,
                    c.name,
                    o.name,
                    OFFER_TYPE_LABELS[o.offerType] ?? o.offerType,
                    o.offerType === "FREE_NIGHTS"
                      ? `Stay ${o.stayNights}, Pay ${o.payNights}`
                      : `${o.discountValue}${o.discountType === "PERCENTAGE" ? "%" : ""}`,
                    fmtDate(o.validFrom),
                    fmtDate(o.validTo),
                    fmtDate(o.bookByDate),
                    o.minimumNights ? String(o.minimumNights) : "—",
                    o.advanceBookDays ? String(o.advanceBookDays) : "—",
                  ]);
                }
              }
              exportReportToPdf({ title: "Seasonal Offers", headers, rows });
              toast.success("PDF downloaded");
            }}
          >
            <FileDown className="mr-1 size-4" /> PDF
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={!data || data.length === 0}
            onClick={async () => {
              if (!data) return;
              const headers = ["Hotel", "Contract", "Offer", "Type", "Discount", "Valid From", "Valid To", "Book By", "Min Nights", "Advance Days"];
              const rows: (string | number)[][] = [];
              for (const c of data) {
                for (const o of c.offers) {
                  rows.push([
                    c.hotelName,
                    c.name,
                    o.name,
                    OFFER_TYPE_LABELS[o.offerType] ?? o.offerType,
                    o.offerType === "FREE_NIGHTS"
                      ? `Stay ${o.stayNights}, Pay ${o.payNights}`
                      : `${o.discountValue}${o.discountType === "PERCENTAGE" ? "%" : ""}`,
                    fmtDate(o.validFrom),
                    fmtDate(o.validTo),
                    fmtDate(o.bookByDate),
                    o.minimumNights ?? 0,
                    o.advanceBookDays ?? 0,
                  ]);
                }
              }
              await exportReportToExcel({ title: "Seasonal Offers", headers, rows });
              toast.success("Excel downloaded");
            }}
          >
            <FileSpreadsheet className="mr-1 size-4" /> Excel
          </Button>
        </div>
      </div>

      <div className="grid gap-4 grid-cols-2 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Contracts with Offers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalContracts}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Active Offers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalOffers}</div>
          </CardContent>
        </Card>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      ) : data && data.length > 0 ? (
        <div className="space-y-4">
          {data.map((contract) => (
            <Card key={contract.id}>
              <CardHeader
                className="pb-3 cursor-pointer hover:bg-muted/30 rounded-t-lg transition-colors"
                onClick={() => router.push(`/contracting/contracts/${contract.id}`)}
              >
                <CardTitle className="text-base">
                  {contract.name}{" "}
                  <span className="text-muted-foreground font-normal">
                    — {contract.hotelName}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                {contract.offers.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No active offers</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Offer</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Discount</TableHead>
                        <TableHead>Valid Period</TableHead>
                        <TableHead>Book By</TableHead>
                        <TableHead>Conditions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {contract.offers.map((offer) => (
                        <TableRow key={offer.id}>
                          <TableCell className="font-medium">{offer.name}</TableCell>
                          <TableCell>
                            <Badge variant="secondary">
                              {OFFER_TYPE_LABELS[offer.offerType] ?? offer.offerType}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {offer.offerType === "FREE_NIGHTS"
                              ? `Stay ${offer.stayNights}, Pay ${offer.payNights}`
                              : `${offer.discountValue}${offer.discountType === "PERCENTAGE" ? "%" : ""}`}
                          </TableCell>
                          <TableCell>
                            {fmtDate(offer.validFrom)} — {fmtDate(offer.validTo)}
                          </TableCell>
                          <TableCell>{fmtDate(offer.bookByDate)}</TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {offer.minimumNights && (
                                <Badge variant="outline" className="text-xs">
                                  Min {offer.minimumNights}N
                                </Badge>
                              )}
                              {offer.advanceBookDays && (
                                <Badge variant="outline" className="text-xs">
                                  {offer.advanceBookDays}d advance
                                </Badge>
                              )}
                              {offer.combinable && (
                                <Badge variant="outline" className="text-xs">
                                  Combinable
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            No contracts with active offers found.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
