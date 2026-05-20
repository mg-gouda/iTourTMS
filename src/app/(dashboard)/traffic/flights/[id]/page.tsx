"use client";

import { useParams, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { TT_JOB_STATUS_LABELS } from "@/lib/constants/traffic";
import { trpc } from "@/lib/trpc";
import { PermissionGuard } from "@/components/shared/permission-guard";

export default function FlightDetailPage() {
  const t = useTranslations("traffic");
  const tCommon = useTranslations("common");
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: flight, isLoading } = trpc.traffic.trafficFlight.getById.useQuery({ id });

  const deleteMutation = trpc.traffic.trafficFlight.delete.useMutation({
    onSuccess: () => { toast.success(tCommon("deleted")); router.push("/traffic/flights"); },
    onError: (err) => toast.error(err.message),
  });

  if (isLoading) return <div className="animate-fade-in space-y-6"><Skeleton className="h-10 w-64" /><Skeleton className="h-[300px] w-full" /></div>;
  if (!flight) return <p>{t("flights")} not found.</p>;

  return (

    <PermissionGuard permission="traffic:airport:read">
      <div className="animate-fade-in space-y-6">
      <div><h1 className="text-2xl font-bold">{t("flights")} {flight.flightNumber}</h1><p className="text-muted-foreground">{new Date(flight.flightDate).toLocaleDateString()}</p></div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>{t("flightInfo")}</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">{t("flightNumber")}</span><span className="font-medium">{flight.flightNumber}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">{t("airline")}</span><span className="font-medium">{flight.airlineCode ?? "—"}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">{tCommon("date")}</span><span className="font-medium">{new Date(flight.flightDate).toLocaleDateString()}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">{t("terminal")}</span><span className="font-medium">{flight.terminal ?? "—"}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">{t("arrAirport")}</span><span className="font-medium">{flight.arrAirport ? `${flight.arrAirport.code} - ${flight.arrAirport.name}` : "—"}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">{t("arrTime")}</span><span className="font-medium">{flight.arrTime ?? "—"}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">{t("depAirport")}</span><span className="font-medium">{flight.depAirport ? `${flight.depAirport.code} - ${flight.depAirport.name}` : "—"}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">{t("depTime")}</span><span className="font-medium">{flight.depTime ?? "—"}</span></div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>{t("linkedJobs")} ({flight.jobs.length})</CardTitle></CardHeader>
          <CardContent>
            {flight.jobs.length === 0 ? <p className="py-4 text-center text-sm text-muted-foreground">{t("noLinkedJobs")}</p> : (
              <div className="space-y-2">{flight.jobs.map((j) => (
                <div key={j.id} className="flex cursor-pointer items-center justify-between rounded-md border p-3 text-sm hover:bg-muted/50" onClick={() => router.push(`/traffic/jobs/${j.id}`)}>
                  <span>{j.code}</span><Badge variant="outline">{TT_JOB_STATUS_LABELS[j.status] ?? j.status}</Badge>
                </div>
              ))}</div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="flex gap-3">
        <Button variant="outline" onClick={() => router.back()}>{tCommon("back")}</Button>
        <Button variant="destructive" onClick={() => { if (confirm(tCommon("confirmDelete"))) deleteMutation.mutate({ id }); }}>{tCommon("delete")}</Button>
      </div>
    </div>
  

    </PermissionGuard>

  );
}
