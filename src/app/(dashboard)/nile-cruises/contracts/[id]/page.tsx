"use client";

import { useParams, useRouter } from "next/navigation";
import { format } from "date-fns";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  CRUISE_CONTRACT_STATUS_LABELS,
  CRUISE_CONTRACT_STATUS_VARIANTS,
  CRUISE_SUPPLEMENT_TYPE_LABELS,
  CRUISE_GALA_MEAL_TYPE_LABELS,
  CRUISE_OFFER_TYPE_LABELS,
} from "@/lib/constants/nile-cruises";
import { trpc } from "@/lib/trpc";

export default function CruiseContractDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const utils = trpc.useUtils();

  const { data, isLoading } = trpc.nileCruises.contract.getById.useQuery({ id });
  const { data: baseRates } = trpc.nileCruises.baseRate.listByContract.useQuery({ contractId: id });
  const { data: supplements } = trpc.nileCruises.supplement.listByContract.useQuery({ contractId: id });
  const { data: offers } = trpc.nileCruises.offer.listByContract.useQuery({ contractId: id });
  const { data: galaMeals } = trpc.nileCruises.galaMeal.listByContract.useQuery({ contractId: id });
  const { data: markup } = trpc.nileCruises.markup.listByContract.useQuery({ contractId: id });

  const post = trpc.nileCruises.contract.post.useMutation({
    onSuccess: () => { toast.success("Contract posted"); utils.nileCruises.contract.getById.invalidate({ id }); },
    onError: (err) => toast.error(err.message),
  });

  const publish = trpc.nileCruises.contract.publish.useMutation({
    onSuccess: () => { toast.success("Contract published"); utils.nileCruises.contract.getById.invalidate({ id }); },
    onError: (err) => toast.error(err.message),
  });

  const del = trpc.nileCruises.contract.delete.useMutation({
    onSuccess: () => { toast.success("Deleted"); router.push("/nile-cruises/contracts"); },
    onError: (err) => toast.error(err.message),
  });

  if (isLoading) return <div className="p-6 space-y-4">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-20" />)}</div>;
  if (!data) return <div className="p-6 text-muted-foreground">Contract not found</div>;

  const statusVariant = CRUISE_CONTRACT_STATUS_VARIANTS[data.status as keyof typeof CRUISE_CONTRACT_STATUS_VARIANTS] as "default" | "secondary" | "destructive" | "outline";

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold">{data.code}</h1>
            <Badge variant={statusVariant}>
              {CRUISE_CONTRACT_STATUS_LABELS[data.status as keyof typeof CRUISE_CONTRACT_STATUS_LABELS]}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">{data.name} · {data.boat.name}</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {data.status === "DRAFT" && (
            <Button variant="outline" onClick={() => post.mutate({ id })} disabled={post.isPending}>Post</Button>
          )}
          {data.status === "POSTED" && (
            <Button variant="default" onClick={() => publish.mutate({ id })} disabled={publish.isPending}>Publish</Button>
          )}
          {data.status === "DRAFT" && (
            <Button variant="destructive" onClick={() => { if (window.confirm("Delete contract?")) del.mutate({ id }); }}>Delete</Button>
          )}
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: "Valid From", value: format(new Date(data.validFrom), "dd MMM yyyy") },
          { label: "Valid To", value: format(new Date(data.validTo), "dd MMM yyyy") },
          { label: "Currency", value: data.baseCurrency },
          { label: "Seasons", value: data.seasons.length },
        ].map((item) => (
          <Card key={item.label}>
            <CardContent className="pt-3 pb-3">
              <p className="text-xs text-muted-foreground">{item.label}</p>
              <p className="text-sm font-semibold">{item.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="rates">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="rates">Base Rates ({baseRates?.length ?? 0})</TabsTrigger>
          <TabsTrigger value="supplements">Supplements ({supplements?.length ?? 0})</TabsTrigger>
          <TabsTrigger value="offers">Offers ({offers?.length ?? 0})</TabsTrigger>
          <TabsTrigger value="gala">Gala Meals ({galaMeals?.length ?? 0})</TabsTrigger>
          <TabsTrigger value="markup">Markup</TabsTrigger>
          <TabsTrigger value="seasons">Seasons ({data.seasons.length})</TabsTrigger>
        </TabsList>

        {/* Base Rates */}
        <TabsContent value="rates">
          <Card>
            <CardHeader><CardTitle className="text-base">Base Rates (per pax per night)</CardTitle></CardHeader>
            <CardContent>
              {!baseRates?.length ? (
                <p className="text-sm text-muted-foreground py-4">No base rates defined</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-muted-foreground text-xs">
                        <th className="text-left pb-2">Season</th>
                        <th className="text-left pb-2">Category</th>
                        <th className="text-left pb-2">Market</th>
                        <th className="text-right pb-2">Rate</th>
                        <th className="text-right pb-2">Currency</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {baseRates.map((r) => (
                        <tr key={r.id}>
                          <td className="py-2">{r.season.name}</td>
                          <td className="py-2">{r.cabinCategory.name}</td>
                          <td className="py-2 text-xs">{r.market?.name ?? "All"}</td>
                          <td className="py-2 text-right font-mono">{Number(r.ratePerPaxPerNight).toFixed(2)}</td>
                          <td className="py-2 text-right text-muted-foreground">{r.currency}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Supplements */}
        <TabsContent value="supplements">
          <Card>
            <CardHeader><CardTitle className="text-base">Supplements</CardTitle></CardHeader>
            <CardContent>
              {!supplements?.length ? (
                <p className="text-sm text-muted-foreground py-4">No supplements defined</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-muted-foreground text-xs">
                        <th className="text-left pb-2">Type</th>
                        <th className="text-left pb-2">Season</th>
                        <th className="text-left pb-2">Category</th>
                        <th className="text-left pb-2">Value Type</th>
                        <th className="text-right pb-2">Value</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {supplements.map((s) => (
                        <tr key={s.id}>
                          <td className="py-2">{CRUISE_SUPPLEMENT_TYPE_LABELS[s.type as keyof typeof CRUISE_SUPPLEMENT_TYPE_LABELS]}</td>
                          <td className="py-2">{s.season?.name ?? "All"}</td>
                          <td className="py-2">{s.cabinCategory?.name ?? "All"}</td>
                          <td className="py-2 text-xs">{s.valueType}</td>
                          <td className="py-2 text-right font-mono">{Number(s.value).toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Offers */}
        <TabsContent value="offers">
          <Card>
            <CardHeader><CardTitle className="text-base">Special Offers</CardTitle></CardHeader>
            <CardContent>
              {!offers?.length ? (
                <p className="text-sm text-muted-foreground py-4">No offers defined</p>
              ) : (
                <div className="space-y-3">
                  {offers.map((o) => (
                    <div key={o.id} className="flex items-center justify-between rounded border p-3">
                      <div>
                        <p className="text-sm font-medium">{o.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {CRUISE_OFFER_TYPE_LABELS[o.type as keyof typeof CRUISE_OFFER_TYPE_LABELS]} · {o.valueType}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-mono">
                          {o.value != null ? `${Number(o.value).toFixed(0)}${o.valueType === "PERCENTAGE" ? "%" : ""}` : "—"}
                        </span>
                        <Badge variant={o.active ? "default" : "secondary"}>{o.active ? "Active" : "Inactive"}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Gala Meals */}
        <TabsContent value="gala">
          <Card>
            <CardHeader><CardTitle className="text-base">Gala Meals</CardTitle></CardHeader>
            <CardContent>
              {!galaMeals?.length ? (
                <p className="text-sm text-muted-foreground py-4">No gala meals defined</p>
              ) : (
                <div className="divide-y">
                  {galaMeals.map((g) => (
                    <div key={g.id} className="flex items-center justify-between py-2">
                      <div>
                        <p className="text-sm font-medium">{CRUISE_GALA_MEAL_TYPE_LABELS[g.type as keyof typeof CRUISE_GALA_MEAL_TYPE_LABELS]}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(g.applicableDate), "dd MMM yyyy")} {g.isMandatory ? "· Mandatory" : ""}
                        </p>
                      </div>
                      <span className="font-mono text-sm">{Number(g.pricePerPax).toFixed(2)} {g.currency}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Markup */}
        <TabsContent value="markup">
          <Card>
            <CardHeader><CardTitle className="text-base">Market & Agent Markup</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {markup?.markets.length ? (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-2">MARKETS</p>
                  <div className="divide-y">
                    {markup.markets.map((m) => (
                      <div key={m.id} className="flex items-center justify-between py-2">
                        <p className="text-sm">{m.market.name}</p>
                        <span className="font-mono text-sm">{Number(m.markup).toFixed(1)}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
              {markup?.tourOperators.length ? (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-2">TOUR OPERATORS</p>
                  <div className="divide-y">
                    {markup.tourOperators.map((to) => (
                      <div key={to.id} className="flex items-center justify-between py-2">
                        <p className="text-sm">{to.tourOperator.name}</p>
                        <span className="font-mono text-sm">{Number(to.markup).toFixed(1)}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
              {!markup?.markets.length && !markup?.tourOperators.length && (
                <p className="text-sm text-muted-foreground py-4">No markup rules configured</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Seasons */}
        <TabsContent value="seasons">
          <Card>
            <CardHeader><CardTitle className="text-base">Seasons</CardTitle></CardHeader>
            <CardContent>
              {!data.seasons.length ? (
                <p className="text-sm text-muted-foreground py-4">No seasons defined</p>
              ) : (
                <div className="divide-y">
                  {data.seasons.map((s) => (
                    <div key={s.id} className="flex items-center justify-between py-2">
                      <p className="text-sm font-medium">{s.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(s.dateFrom), "dd MMM yyyy")} – {format(new Date(s.dateTo), "dd MMM yyyy")}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
