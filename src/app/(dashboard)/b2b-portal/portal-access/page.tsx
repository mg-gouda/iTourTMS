"use client";

import { Building2, Check, Search, ShieldCheck } from "lucide-react";
import { useMemo, useState } from "react";

import { PermissionGuard } from "@/components/shared/permission-guard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { PARTNER_AUDIT_LABELS } from "@/lib/constants/b2b-portal";
import { trpc } from "@/lib/trpc";

const NO_MANAGER = "__none__";

/**
 * One screen for everything that decides whether a partner can use the portal:
 * the switch itself, the hotels they may see, the value above which their
 * bookings need a human, who owns the relationship — plus the terms they have
 * to accept and the trail of what they did.
 */
export default function PortalAccessPage() {
  return (
    <PermissionGuard permission="b2b-portal:contract:read">
      <div className="animate-fade-in space-y-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Portal access</h1>
          <p className="text-muted-foreground">
            Who may sign in to the B2B portal, what they can see, and what they have done.
          </p>
        </div>

        <Tabs defaultValue="partners">
          <TabsList>
            <TabsTrigger value="partners">Partners</TabsTrigger>
            <TabsTrigger value="terms">Terms of use</TabsTrigger>
            <TabsTrigger value="audit">Audit trail</TabsTrigger>
          </TabsList>

          <TabsContent value="partners" className="mt-4">
            <PartnersTab />
          </TabsContent>
          <TabsContent value="terms" className="mt-4">
            <TermsTab />
          </TabsContent>
          <TabsContent value="audit" className="mt-4">
            <AuditTab />
          </TabsContent>
        </Tabs>
      </div>
    </PermissionGuard>
  );
}

// ---------------------------------------------------------------------------
// Partners
// ---------------------------------------------------------------------------

function PartnersTab() {
  const utils = trpc.useUtils();
  const { data, isLoading } = trpc.b2bPortal.portalAccess.listPartners.useQuery();
  const { data: managers } = trpc.b2bPortal.portalAccess.listAccountManagers.useQuery();
  const [allowlistFor, setAllowlistFor] = useState<{ id: string; name: string } | null>(null);

  const refresh = () => utils.b2bPortal.portalAccess.listPartners.invalidate();
  const update = trpc.b2bPortal.portalAccess.updateSettings.useMutation({ onSuccess: refresh });

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    );
  }

  const partners = data ?? [];
  if (partners.length === 0) {
    return (
      <Card>
        <CardContent className="text-muted-foreground py-10 text-center text-sm">
          No partners yet. Create a tour operator or travel agent first.
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="space-y-3">
        {partners.map((partner) => (
          <Card key={partner.id}>
            <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
              <div>
                <CardTitle className="text-base">
                  {partner.name}{" "}
                  <span className="text-muted-foreground font-mono text-xs">({partner.code})</span>
                </CardTitle>
                <p className="text-muted-foreground text-xs">
                  {partner._count.partnerUsers} user
                  {partner._count.partnerUsers === 1 ? "" : "s"} ·{" "}
                  {partner._count.hotelAssignments} hotel
                  {partner._count.hotelAssignments === 1 ? "" : "s"} allowed
                </p>
              </div>
              <div className="flex items-center gap-3">
                {!partner.active && <Badge variant="secondary">Partner inactive</Badge>}
                <div className="flex items-center gap-2">
                  <Label className="text-xs">Portal</Label>
                  <Switch
                    checked={partner.portalEnabled}
                    disabled={!partner.active || update.isPending}
                    onCheckedChange={(checked) =>
                      update.mutate({ tourOperatorId: partner.id, portalEnabled: checked })
                    }
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Booking value cap</Label>
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  placeholder="No cap"
                  defaultValue={partner.bookingValueCap ? Number(partner.bookingValueCap) : ""}
                  onBlur={(e) => {
                    const raw = e.target.value.trim();
                    const value = raw === "" ? null : Number(raw);
                    if (value !== null && Number.isNaN(value)) return;
                    if (Number(partner.bookingValueCap ?? NaN) === value) return;
                    update.mutate({ tourOperatorId: partner.id, bookingValueCap: value });
                  }}
                />
                <p className="text-muted-foreground text-xs">
                  Bookings above this go to staff for approval instead of confirming.
                </p>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Account manager</Label>
                <Select
                  value={partner.accountManagerId ?? NO_MANAGER}
                  onValueChange={(v) => {
                    if (!v) return;
                    update.mutate({
                      tourOperatorId: partner.id,
                      accountManagerId: v === NO_MANAGER ? null : v,
                    });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Unassigned" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NO_MANAGER}>Unassigned</SelectItem>
                    {(managers ?? []).map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.name ?? m.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-muted-foreground text-xs">
                  Named on partner emails as the person to reply to.
                </p>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Hotels</Label>
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => setAllowlistFor({ id: partner.id, name: partner.name })}
                >
                  <Building2 className="mr-2 size-4" />
                  {partner._count.hotelAssignments === 0
                    ? "No hotels — partner sees nothing"
                    : `${partner._count.hotelAssignments} allowed`}
                </Button>
                <p className="text-muted-foreground text-xs">
                  The only hotels this partner can search or book.
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {allowlistFor && (
        <HotelAllowlistDialog
          partner={allowlistFor}
          onClose={() => setAllowlistFor(null)}
          onSaved={() => {
            setAllowlistFor(null);
            void refresh();
          }}
        />
      )}
    </>
  );
}

function HotelAllowlistDialog({
  partner,
  onClose,
  onSaved,
}: {
  partner: { id: string; name: string };
  onClose: () => void;
  onSaved: () => void;
}) {
  const { data: hotels } = trpc.b2bPortal.portalAccess.listHotels.useQuery();
  const { data: settings, isLoading } = trpc.b2bPortal.portalAccess.getSettings.useQuery({
    tourOperatorId: partner.id,
  });
  const [selected, setSelected] = useState<Set<string> | null>(null);
  const [search, setSearch] = useState("");

  const save = trpc.b2bPortal.portalAccess.setHotelAllowlist.useMutation({ onSuccess: onSaved });

  // Seed from what is stored, once the query lands.
  const current =
    selected ?? new Set((settings?.hotelAssignments ?? []).map((a) => a.hotelId));

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    const all = hotels ?? [];
    if (!term) return all;
    return all.filter(
      (h) => h.name.toLowerCase().includes(term) || (h.code ?? "").toLowerCase().includes(term),
    );
  }, [hotels, search]);

  function toggle(id: string) {
    const next = new Set(current);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Hotels for {partner.name}</DialogTitle>
        </DialogHeader>

        <div className="relative">
          <Search className="text-muted-foreground absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
          <Input
            placeholder="Search hotels..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>

        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">
            {current.size} of {hotels?.length ?? 0} selected
          </span>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelected(new Set((hotels ?? []).map((h) => h.id)))}
            >
              Select all
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setSelected(new Set())}>
              Clear
            </Button>
          </div>
        </div>

        <ScrollArea className="h-80 rounded-md border">
          {isLoading ? (
            <div className="space-y-2 p-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-8 w-full" />
              ))}
            </div>
          ) : (
            <div className="divide-y">
              {visible.map((hotel) => {
                const on = current.has(hotel.id);
                return (
                  <button
                    key={hotel.id}
                    type="button"
                    onClick={() => toggle(hotel.id)}
                    className="hover:bg-muted/50 flex w-full items-center justify-between px-3 py-2 text-left text-sm"
                  >
                    <span>
                      {hotel.name}{" "}
                      <span className="text-muted-foreground font-mono text-xs">{hotel.code}</span>
                    </span>
                    {on && <Check className="text-primary size-4" />}
                  </button>
                );
              })}
            </div>
          )}
        </ScrollArea>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={save.isPending}
            onClick={() =>
              save.mutate({ tourOperatorId: partner.id, hotelIds: Array.from(current) })
            }
          >
            {save.isPending ? "Saving..." : "Save allowlist"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Terms
// ---------------------------------------------------------------------------

function TermsTab() {
  const utils = trpc.useUtils();
  const { data, isLoading } = trpc.b2bPortal.portalAccess.listTerms.useQuery();
  const [version, setVersion] = useState("");
  const [body, setBody] = useState("");

  const publish = trpc.b2bPortal.portalAccess.publishTerms.useMutation({
    onSuccess: () => {
      setVersion("");
      setBody("");
      void utils.b2bPortal.portalAccess.listTerms.invalidate();
    },
  });

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Publish a version</CardTitle>
          <p className="text-muted-foreground text-xs">
            Publishing asks every partner to accept again on their next page load. Their
            acceptance is recorded in the audit trail.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Version</Label>
            <Input
              placeholder="2026-08"
              value={version}
              onChange={(e) => setVersion(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Terms</Label>
            <Textarea
              rows={12}
              placeholder="Paste the terms your partners must accept..."
              value={body}
              onChange={(e) => setBody(e.target.value)}
            />
          </div>
          {publish.error && <p className="text-destructive text-sm">{publish.error.message}</p>}
          <Button
            disabled={!version.trim() || !body.trim() || publish.isPending}
            onClick={() => publish.mutate({ version: version.trim(), body })}
          >
            {publish.isPending ? "Publishing..." : "Publish"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Published versions</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-24 w-full" />
          ) : (data ?? []).length === 0 ? (
            <p className="text-muted-foreground text-sm">
              Nothing published yet — partners are not asked to accept anything.
            </p>
          ) : (
            <div className="space-y-3">
              {(data ?? []).map((t, i) => (
                <div key={t.id} className="rounded-md border p-3">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{t.version}</span>
                    {i === 0 && (
                      <Badge>
                        <ShieldCheck className="mr-1 size-3" /> Current
                      </Badge>
                    )}
                  </div>
                  <p className="text-muted-foreground text-xs">
                    {new Date(t.publishedAt).toLocaleDateString("en-GB", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </p>
                  <p className="text-muted-foreground mt-2 line-clamp-3 text-xs whitespace-pre-wrap">
                    {t.body}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Audit
// ---------------------------------------------------------------------------

const ALL = "__all__";

function AuditTab() {
  const [partnerId, setPartnerId] = useState<string>(ALL);
  const [action, setAction] = useState<string>(ALL);

  const { data: partners } = trpc.b2bPortal.portalAccess.listPartners.useQuery();
  const { data, isLoading } = trpc.b2bPortal.portalAccess.listAudit.useQuery({
    tourOperatorId: partnerId === ALL ? undefined : partnerId,
    action: action === ALL ? undefined : action,
    take: 200,
  });

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base">Recent activity</CardTitle>
        <div className="flex gap-2">
          <Select value={partnerId} onValueChange={(v) => v && setPartnerId(v)}>
            <SelectTrigger className="h-9 w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All partners</SelectItem>
              {(partners ?? []).map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={action} onValueChange={(v) => v && setAction(v)}>
            <SelectTrigger className="h-9 w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All actions</SelectItem>
              {Object.entries(PARTNER_AUDIT_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-64 w-full" />
        ) : (data ?? []).length === 0 ? (
          <p className="text-muted-foreground py-8 text-center text-sm">Nothing recorded yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-muted-foreground border-b text-xs">
                <tr>
                  <th className="px-2 py-2 text-left font-medium">When</th>
                  <th className="px-2 py-2 text-left font-medium">Action</th>
                  <th className="px-2 py-2 text-left font-medium">Partner</th>
                  <th className="px-2 py-2 text-left font-medium">User</th>
                  <th className="px-2 py-2 text-left font-medium">IP</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {(data ?? []).map((row) => (
                  <tr key={row.id}>
                    <td className="text-muted-foreground px-2 py-2 whitespace-nowrap">
                      {new Date(row.createdAt).toLocaleString("en-GB", {
                        day: "2-digit",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="px-2 py-2">
                      <Badge
                        variant={
                          row.action.includes("FAILED") ||
                          row.action.includes("DENIED") ||
                          row.action.includes("LOCKED")
                            ? "destructive"
                            : "secondary"
                        }
                      >
                        {PARTNER_AUDIT_LABELS[row.action] ?? row.action}
                      </Badge>
                    </td>
                    <td className="px-2 py-2">{row.tourOperator?.name ?? "—"}</td>
                    <td className="px-2 py-2">{row.user?.name ?? row.user?.email ?? "—"}</td>
                    <td className="text-muted-foreground px-2 py-2 font-mono text-xs">
                      {row.ip ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
