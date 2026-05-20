"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useParams, useRouter } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { TT_JOB_STATUS_LABELS } from "@/lib/constants/traffic";
import { trpc } from "@/lib/trpc";
import { PermissionGuard } from "@/components/shared/permission-guard";

export default function RepDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const utils = trpc.useUtils();
  const t = useTranslations("traffic");
  const tc = useTranslations("common");
  const { data: rep, isLoading } = trpc.traffic.rep.getById.useQuery({ id });

  const deleteMutation = trpc.traffic.rep.delete.useMutation({
    onSuccess: () => { toast.success(tc("deleted")); router.push("/traffic/reps"); },
    onError: (err) => toast.error(err.message),
  });

  if (isLoading) return <div className="animate-fade-in space-y-6"><Skeleton className="h-10 w-64" /><Skeleton className="h-[300px] w-full" /></div>;
  if (!rep) return <p>{t("rep")} not found.</p>;

  return (
    <div className="animate-fade-in space-y-6">
      <div><h1 className="text-2xl font-bold">{rep.user.name ?? rep.user.email}</h1><p className="text-muted-foreground">{rep.phone ?? "No phone"}</p></div>

      <Tabs defaultValue="info">
        <TabsList>
          <TabsTrigger value="info">{t("repDetails")}</TabsTrigger>
          <TabsTrigger value="zones">{t("zones")} ({rep.repZones.length})</TabsTrigger>
          <TabsTrigger value="history">{t("trafficJobs")} ({rep.assignments.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="info">
          <Card><CardContent className="space-y-2 pt-6 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">{tc("name")}</span><span className="font-medium">{rep.user.name ?? "—"}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">{tc("email")}</span><span className="font-medium">{rep.user.email}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">{tc("phone")}</span><span className="font-medium">{rep.phone ?? "—"}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">{tc("active")}</span><span className="font-medium">{rep.isActive ? tc("yes") : tc("no")}</span></div>
          </CardContent></Card>
        </TabsContent>
        <TabsContent value="zones">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>{t("assignedZones")}</CardTitle>
              <AssignZonesDialog
                repId={id}
                currentZoneIds={rep.repZones.map((rz) => rz.zone.id)}
                onSuccess={() => utils.traffic.rep.getById.invalidate({ id })}
              />
            </CardHeader>
            <CardContent>
              {rep.repZones.length === 0 ? <p className="py-4 text-center text-sm text-muted-foreground">{t("noZonesAssigned")}</p> : (
                <div className="space-y-2">{rep.repZones.map((rz) => (
                  <div key={rz.id} className="rounded-md border p-3 text-sm">{rz.zone.name} ({rz.zone.code}) &middot; {rz.zone.city.name}</div>
                ))}</div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="history">
          <Card><CardContent className="pt-6">
            {rep.assignments.length === 0 ? <p className="py-4 text-center text-sm text-muted-foreground">{t("noRecentAssignments")}</p> : (
              <div className="space-y-2">{rep.assignments.map((a) => (
                <div key={a.id} className="flex cursor-pointer items-center justify-between rounded-md border p-3 text-sm hover:bg-muted/50" onClick={() => router.push(`/traffic/jobs/${a.job.id}`)}>
                  <span>{a.job.code} &middot; {new Date(a.job.serviceDate).toLocaleDateString()}</span>
                  <Badge variant="outline">{TT_JOB_STATUS_LABELS[a.job.status] ?? a.job.status}</Badge>
                </div>
              ))}</div>
            )}
          </CardContent></Card>
        </TabsContent>
      </Tabs>

      <div className="flex gap-3">
        <Button variant="outline" onClick={() => router.back()}>{tc("back")}</Button>
        <Button variant="destructive" onClick={() => { if (confirm(tc("confirmDelete"))) deleteMutation.mutate({ id }); }}>{tc("delete")}</Button>
      </div>
    </div>
  );
}

function AssignZonesDialog({ repId, currentZoneIds, onSuccess }: { repId: string; currentZoneIds: string[]; onSuccess: () => void }) {
  const [open, setOpen] = useState(false);
  const [selectedZoneIds, setSelectedZoneIds] = useState<string[]>(currentZoneIds);
  const { data: zones } = trpc.traffic.zone.list.useQuery(undefined, { enabled: open });
  const t = useTranslations("traffic");
  const tc = useTranslations("common");

  // Sync selectedZoneIds with current when dialog opens
  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen) setSelectedZoneIds(currentZoneIds);
    setOpen(isOpen);
  };

  const assignMutation = trpc.traffic.rep.assignZones.useMutation({
    onSuccess: () => {
      toast.success(tc("updated"));
      setOpen(false);
      onSuccess();
    },
    onError: (err) => toast.error(err.message),
  });

  function toggleZone(zoneId: string) {
    setSelectedZoneIds((prev) =>
      prev.includes(zoneId) ? prev.filter((z) => z !== zoneId) : [...prev, zoneId]
    );
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    assignMutation.mutate({ repId, zoneIds: selectedZoneIds });
  }

  return (

    <PermissionGuard permission="traffic:driver:read">
      <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm">{t("manageZones")}</Button>
      </DialogTrigger>
      <DialogContent className="max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("assignZones")}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            {zones?.length === 0 && <p className="text-sm text-muted-foreground">{t("noZonesAssigned")}</p>}
            {zones?.map((zone) => (
              <label
                key={zone.id}
                className="flex cursor-pointer items-center gap-3 rounded-md border p-3 text-sm hover:bg-muted/50"
              >
                <input
                  type="checkbox"
                  checked={selectedZoneIds.includes(zone.id)}
                  onChange={() => toggleZone(zone.id)}
                  className="h-4 w-4 rounded border-gray-300"
                />
                <span>{zone.name} ({zone.code}) &middot; {zone.city.name}</span>
              </label>
            ))}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>{tc("cancel")}</Button>
            <Button type="submit" disabled={assignMutation.isPending}>
              {assignMutation.isPending ? tc("saving") : `${tc("save")} (${selectedZoneIds.length} ${t("zones")})`}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  

    </PermissionGuard>

  );
}
