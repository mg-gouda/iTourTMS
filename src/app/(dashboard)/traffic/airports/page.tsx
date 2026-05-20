"use client";

import { useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { PermissionGuard } from "@/components/shared/permission-guard";

export default function AirportsPage() {
  const t = useTranslations("traffic");
  const tCommon = useTranslations("common");
  const utils = trpc.useUtils();
  const { data: airports, isLoading } = trpc.traffic.airport.list.useQuery();
  const { data: countries } = trpc.setup.getCountries.useQuery();

  // Create dialog
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [countryId, setCountryId] = useState("");

  // Edit dialog
  const [editOpen, setEditOpen] = useState(false);
  const [editId, setEditId] = useState("");
  const [editCode, setEditCode] = useState("");
  const [editName, setEditName] = useState("");
  const [editCountryId, setEditCountryId] = useState("");

  const createMutation = trpc.traffic.airport.create.useMutation({
    onSuccess: () => {
      utils.traffic.airport.invalidate();
      setOpen(false);
      setCode(""); setName(""); setCountryId("");
      toast.success(tCommon("created"));
    },
    onError: (err) => toast.error(err.message),
  });

  const updateMutation = trpc.traffic.airport.update.useMutation({
    onSuccess: () => {
      utils.traffic.airport.invalidate();
      setEditOpen(false);
      toast.success(tCommon("updated"));
    },
    onError: (err) => toast.error(err.message),
  });

  const deleteMutation = trpc.traffic.airport.delete.useMutation({
    onSuccess: () => { utils.traffic.airport.invalidate(); toast.success(tCommon("deleted")); },
    onError: (err) => toast.error(err.message),
  });

  function openEdit(a: NonNullable<typeof airports>[number]) {
    setEditId(a.id);
    setEditCode(a.code);
    setEditName(a.name);
    setEditCountryId(a.countryId);
    setEditOpen(true);
  }

  return (

    <PermissionGuard permission="traffic:airport:read">
      <div className="animate-fade-in space-y-6">
      <div className="page-header flex items-center justify-between">
        <div><h1 className="text-2xl font-bold">{t("airports")}</h1><p className="text-muted-foreground">{t("airports")}</p></div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" />{t("airport")}</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{t("airport")}</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div><Label>{t("iataCode")}</Label><Input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="e.g. CAI" maxLength={4} /></div>
              <div><Label>{tCommon("name")}</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Cairo International Airport" /></div>
              <div>
                <Label>{t("country")}</Label>
                <Select value={countryId} onValueChange={setCountryId}>
                  <SelectTrigger><SelectValue placeholder={tCommon("select")} /></SelectTrigger>
                  <SelectContent>
                    {countries?.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={() => createMutation.mutate({ code, name, countryId })} disabled={createMutation.isPending || !code || !name || !countryId}>
                {createMutation.isPending ? tCommon("creating") : tCommon("create")}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Edit dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t("editAirport")}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>{t("iataCode")}</Label><Input value={editCode} onChange={(e) => setEditCode(e.target.value.toUpperCase())} maxLength={4} /></div>
            <div><Label>{tCommon("name")}</Label><Input value={editName} onChange={(e) => setEditName(e.target.value)} /></div>
            <div>
              <Label>{t("country")}</Label>
              <Select value={editCountryId} onValueChange={setEditCountryId}>
                <SelectTrigger><SelectValue placeholder={tCommon("select")} /></SelectTrigger>
                <SelectContent>
                  {countries?.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={() => updateMutation.mutate({ id: editId, data: { code: editCode, name: editName, countryId: editCountryId } })} disabled={updateMutation.isPending || !editCode || !editName || !editCountryId}>
              {updateMutation.isPending ? tCommon("saving") : tCommon("saveChanges")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {isLoading ? <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}</div> : (
        <div className="space-y-2">
          {airports?.map((a) => (
            <div key={a.id} className="flex items-center justify-between rounded-md border p-4">
              <div className="flex items-center gap-4">
                <Badge variant="outline" className="font-mono">{a.code}</Badge>
                <div>
                  <p className="font-medium">{a.name}</p>
                  <p className="text-sm text-muted-foreground">{a.country.name}</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" onClick={() => openEdit(a)}><Pencil className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon" onClick={() => { if (confirm("Delete?")) deleteMutation.mutate({ id: a.id }); }}><Trash2 className="h-4 w-4" /></Button>
              </div>
            </div>
          ))}
          {airports?.length === 0 && <p className="py-8 text-center text-muted-foreground">{tCommon("noData")}</p>}
        </div>
      )}
    </div>
  

    </PermissionGuard>

  );
}
