"use client";

import { Check, Copy, Link2, Plus, ShieldCheck, ShieldOff } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { PARTNER_ROLE_DESCRIPTIONS, PARTNER_ROLE_LABELS } from "@/lib/constants/b2b-portal";
import { trpc } from "@/lib/trpc";

const ROLES = ["PARTNER_ADMIN", "PARTNER_AGENT", "PARTNER_ACCOUNTANT"] as const;

/**
 * A partner running their own colleagues. Deliberately cannot reset anyone's
 * authenticator — that stays with us, so an admin account taken over from
 * inside cannot be used to take the rest.
 */
export default function PartnerUsersPage() {
  const [inviteOpen, setInviteOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<string>("PARTNER_AGENT");
  const [link, setLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const utils = trpc.useUtils();
  const { data, isLoading } = trpc.partner.team.list.useQuery();

  const invite = trpc.partner.team.invite.useMutation({
    onSuccess: (r) => {
      setLink(r.url);
      setName("");
      setEmail("");
      void utils.partner.team.list.invalidate();
      toast.success(`Invitation sent to ${r.email}.`);
    },
    onError: (e) => toast.error(e.message),
  });

  const setRoleMutation = trpc.partner.team.setRole.useMutation({
    onSuccess: () => {
      void utils.partner.team.list.invalidate();
      toast.success("Role updated.");
    },
    onError: (e) => toast.error(e.message),
  });

  const setActive = trpc.partner.team.setActive.useMutation({
    onSuccess: (r) => {
      void utils.partner.team.list.invalidate();
      toast.success(r.isActive ? "Login switched on." : "Login switched off.");
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Users</h1>
          <p className="text-muted-foreground">
            Who at your company can use the portal, and what they can do here.
          </p>
        </div>
        <Button
          onClick={() => {
            setLink(null);
            setInviteOpen(true);
          }}
        >
          <Plus className="mr-2 size-4" /> Invite a colleague
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {data?.map((u) => (
            <Card key={u.id}>
              <CardContent className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{u.name}</span>
                    {!u.isActive && <Badge variant="destructive">Switched off</Badge>}
                    {u.mustSetPassword && <Badge variant="secondary">Invitation pending</Badge>}
                    {u.lockedUntil && new Date(u.lockedUntil) > new Date() && (
                      <Badge variant="warning">Locked out</Badge>
                    )}
                  </div>
                  <p className="text-muted-foreground text-xs">{u.email}</p>
                  <p className="text-muted-foreground flex items-center gap-1 text-xs">
                    {u.twoFactorEnabled ? (
                      <>
                        <ShieldCheck className="size-3 text-emerald-600" /> Two-factor on
                      </>
                    ) : (
                      <>
                        <ShieldOff className="size-3 text-amber-600" /> Two-factor not set up yet
                      </>
                    )}
                  </p>
                </div>

                <div className="flex shrink-0 flex-wrap items-center gap-2">
                  <Select
                    value={u.partnerRole ?? "PARTNER_AGENT"}
                    onValueChange={(v) => {
                      if (!v || v === u.partnerRole) return;
                      setRoleMutation.mutate({ id: u.id, partnerRole: v as never });
                    }}
                  >
                    <SelectTrigger className="w-48">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ROLES.map((r) => (
                        <SelectItem key={r} value={r}>
                          {PARTNER_ROLE_LABELS[r]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setActive.mutate({ id: u.id, isActive: !u.isActive })}
                  >
                    {u.isActive ? "Switch off" : "Switch on"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <p className="text-muted-foreground text-xs">
        Lost a phone with no backup codes left? Contact your account manager — resetting
        two-factor is something only we can do.
      </p>

      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Invite a colleague</DialogTitle>
            <DialogDescription>
              They choose their own password and set up two-factor from the link.
            </DialogDescription>
          </DialogHeader>

          {link ? (
            <div className="space-y-3">
              <div className="rounded-md bg-emerald-500/10 px-3 py-2 text-xs text-emerald-600">
                Invitation sent. The link works once and expires in 7 days.
              </div>
              <div className="bg-muted rounded-md p-2 font-mono text-xs break-all">{link}</div>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  void navigator.clipboard.writeText(link);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
              >
                {copied ? <Check className="mr-2 size-4" /> : <Copy className="mr-2 size-4" />}
                {copied ? "Copied" : "Copy the link"}
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Name</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Email</Label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="colleague@yourcompany.com"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">What they can do</Label>
                <Select value={role} onValueChange={(v) => v && setRole(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLES.map((r) => (
                      <SelectItem key={r} value={r}>
                        {PARTNER_ROLE_LABELS[r]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-muted-foreground text-xs">
                  {PARTNER_ROLE_DESCRIPTIONS[role]}
                </p>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setInviteOpen(false)}>
              {link ? "Done" : "Cancel"}
            </Button>
            {!link && (
              <Button
                disabled={!name.trim() || !email.trim() || invite.isPending}
                onClick={() =>
                  invite.mutate({ name: name.trim(), email: email.trim(), partnerRole: role as never })
                }
              >
                <Link2 className="mr-2 size-4" />
                {invite.isPending ? "Sending..." : "Send invitation"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
