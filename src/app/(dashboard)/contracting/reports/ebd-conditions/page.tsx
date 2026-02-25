"use client";

import { format } from "date-fns";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
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
import { trpc } from "@/lib/trpc";

function fmtDate(d: string | Date | null | undefined) {
  if (!d) return "—";
  return format(new Date(d), "dd MMM yyyy");
}

export default function EbdConditionsReportPage() {
  const [hotelId, setHotelId] = useState("ALL");

  const { data: hotels } = trpc.contracting.hotel.list.useQuery();
  const { data, isLoading } =
    trpc.contracting.reports.ebdConditions.useQuery(
      hotelId === "ALL" ? {} : { hotelId },
    );

  const totalContracts = data?.length ?? 0;
  const totalEbds = data?.reduce((s, c) => s + c.ebdOffers.length, 0) ?? 0;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="page-header">
          <h1 className="text-2xl font-bold tracking-tight">EBD Conditions</h1>
          <p className="text-muted-foreground">
            Cross-contract Early Bird Discount comparison
          </p>
        </div>
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
      </div>

      <div className="grid gap-4 grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Contracts with EBD
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalContracts}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total EBD Offers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalEbds}</div>
          </CardContent>
        </Card>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : data && data.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>EBD Comparison Matrix</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Hotel</TableHead>
                  <TableHead>Contract</TableHead>
                  <TableHead>EBD Name</TableHead>
                  <TableHead>Discount</TableHead>
                  <TableHead>Book By</TableHead>
                  <TableHead>Advance Days</TableHead>
                  <TableHead>Valid Period</TableHead>
                  <TableHead>Min Nights</TableHead>
                  <TableHead>Payment</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.flatMap((contract) =>
                  contract.ebdOffers.map((ebd) => (
                    <TableRow key={ebd.id}>
                      <TableCell className="font-medium">
                        {contract.hotelName}
                      </TableCell>
                      <TableCell>{contract.name}</TableCell>
                      <TableCell>{ebd.name}</TableCell>
                      <TableCell>
                        <Badge variant="default">
                          {ebd.discountValue}
                          {ebd.discountType === "PERCENTAGE" ? "%" : ""}
                        </Badge>
                      </TableCell>
                      <TableCell>{fmtDate(ebd.bookByDate)}</TableCell>
                      <TableCell>
                        {ebd.advanceBookDays ? `${ebd.advanceBookDays}d` : "—"}
                      </TableCell>
                      <TableCell>
                        {fmtDate(ebd.validFrom)} — {fmtDate(ebd.validTo)}
                      </TableCell>
                      <TableCell>
                        {ebd.minimumNights ? `${ebd.minimumNights}N` : "—"}
                      </TableCell>
                      <TableCell>
                        {ebd.paymentPct ? (
                          <span>
                            {ebd.paymentPct}%
                            {ebd.paymentDeadline && (
                              <span className="text-muted-foreground">
                                {" "}by {fmtDate(ebd.paymentDeadline)}
                              </span>
                            )}
                          </span>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                    </TableRow>
                  )),
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            No contracts with Early Bird Discounts found.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
