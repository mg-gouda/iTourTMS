"use client";

import { useParams, useRouter } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { TT_JOB_STATUS_LABELS } from "@/lib/constants/traffic";
import { trpc } from "@/lib/trpc";

export default function RepDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: rep, isLoading } = trpc.traffic.rep.getById.useQuery({ id });

  const deleteMutation = trpc.traffic.rep.delete.useMutation({
    onSuccess: () => { toast.success("Rep deleted"); router.push("/traffic/reps"); },
    onError: (err) => toast.error(err.message),
  });

  if (isLoading) return <div className="animate-fade-in space-y-6"><Skeleton className="h-10 w-64" /><Skeleton className="h-[300px] w-full" /></div>;
  if (!rep) return <p>Rep not found.</p>;

  return (
    <div className="animate-fade-in space-y-6">
      <div><h1 className="text-2xl font-bold">{rep.user.name ?? rep.user.email}</h1><p className="text-muted-foreground">{rep.phone ?? "No phone"}</p></div>

      <Tabs defaultValue="info">
        <TabsList>
          <TabsTrigger value="info">Info</TabsTrigger>
          <TabsTrigger value="zones">Zones ({rep.repZones.length})</TabsTrigger>
          <TabsTrigger value="history">Recent Jobs ({rep.assignments.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="info">
          <Card><CardContent className="space-y-2 pt-6 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Name</span><span className="font-medium">{rep.user.name ?? "—"}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Email</span><span className="font-medium">{rep.user.email}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Phone</span><span className="font-medium">{rep.phone ?? "—"}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Active</span><span className="font-medium">{rep.isActive ? "Yes" : "No"}</span></div>
          </CardContent></Card>
        </TabsContent>
        <TabsContent value="zones">
          <Card><CardContent className="pt-6">
            {rep.repZones.length === 0 ? <p className="py-4 text-center text-sm text-muted-foreground">No zones assigned.</p> : (
              <div className="space-y-2">{rep.repZones.map((rz) => (
                <div key={rz.id} className="rounded-md border p-3 text-sm">{rz.zone.name} ({rz.zone.code}) &middot; {rz.zone.city.name}</div>
              ))}</div>
            )}
          </CardContent></Card>
        </TabsContent>
        <TabsContent value="history">
          <Card><CardContent className="pt-6">
            {rep.assignments.length === 0 ? <p className="py-4 text-center text-sm text-muted-foreground">No recent assignments.</p> : (
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
        <Button variant="outline" onClick={() => router.back()}>Back</Button>
        <Button variant="destructive" onClick={() => { if (confirm("Delete?")) deleteMutation.mutate({ id }); }}>Delete</Button>
      </div>
    </div>
  );
}
