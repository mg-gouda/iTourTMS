"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc";

const STATUS_LABEL: Record<string, string> = {
  REQUESTED: "Awaiting our answer",
  CONFIRMED: "Confirmed",
  DECLINED: "Not available",
  CANCELLED: "Cancelled",
};

const STATUS_VARIANT: Record<string, "success" | "warning" | "destructive" | "secondary"> = {
  REQUESTED: "warning",
  CONFIRMED: "success",
  DECLINED: "destructive",
  CANCELLED: "secondary",
};

const TYPE_LABEL: Record<string, string> = {
  EXCURSION: "Excursion",
  TRANSFER: "Transfer",
  PACKAGE: "Package",
};

const date = (d: Date | string) =>
  new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

const money = (n: number | string, currency: string) =>
  `${currency} ${Number(n).toLocaleString("en", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

/** Everything the partner has asked for beyond a hotel stay, and what came of it. */
export default function PartnerRequestsPage() {
  const { data, isLoading } = trpc.partner.products.myRequests.useQuery();

  return (
    <div className="animate-fade-in space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Requests</h1>
        <p className="text-muted-foreground">
          Excursions, transfers and packages you have asked for. We answer each one by hand.
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      ) : !data?.length ? (
        <Card>
          <CardContent className="text-muted-foreground py-12 text-center text-sm">
            You have not requested anything yet. Open an excursion, transfer or package to ask.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {data.map((r) => (
            <Card key={r.id}>
              <CardContent className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{r.code}</span>
                    <Badge variant={STATUS_VARIANT[r.status] ?? "secondary"}>
                      {STATUS_LABEL[r.status] ?? r.status}
                    </Badge>
                    <Badge variant="outline">{TYPE_LABEL[r.productType] ?? r.productType}</Badge>
                    {r.partnerReference && (
                      <span className="text-muted-foreground text-xs">
                        Your ref: {r.partnerReference}
                      </span>
                    )}
                  </div>
                  <p className="truncate text-sm">{r.productName}</p>
                  <p className="text-muted-foreground text-xs">
                    {date(r.serviceDate)} · {r.adults} adults
                    {r.children ? `, ${r.children} children` : ""}
                  </p>
                  {r.staffNote && (
                    <p className="text-muted-foreground text-xs italic">Note from us: {r.staffNote}</p>
                  )}
                </div>

                <div className="shrink-0 text-right">
                  <p className="font-semibold">{money(Number(r.net), r.currency)}</p>
                  <p className="text-muted-foreground text-xs">your price</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
