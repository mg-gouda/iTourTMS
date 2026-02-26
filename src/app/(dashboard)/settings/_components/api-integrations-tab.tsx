"use client";

import { useState } from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import {
  Copy,
  Eye,
  EyeOff,
  Key,
  MoreHorizontal,
  Plus,
  RefreshCw,
  Send,
  Trash2,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export function ApiIntegrationsTab() {
  const utils = trpc.useUtils();
  const { data: integrations, isLoading } = trpc.apiIntegration.list.useQuery();

  const [createOpen, setCreateOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [keyReveal, setKeyReveal] = useState<{ key: string; prefix: string } | null>(null);
  const [deliveriesId, setDeliveriesId] = useState<string | null>(null);

  const deleteMutation = trpc.apiIntegration.delete.useMutation({
    onSuccess: () => {
      toast.success("Integration deleted");
      utils.apiIntegration.list.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const regenMutation = trpc.apiIntegration.regenerateKey.useMutation({
    onSuccess: (data) => {
      setKeyReveal({ key: data.plainKey, prefix: data.keyPrefix });
      utils.apiIntegration.list.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const testMutation = trpc.apiIntegration.testWebhook.useMutation({
    onSuccess: () => toast.success("Test webhook sent"),
    onError: (err) => toast.error(err.message),
  });

  if (isLoading) {
    return <p className="text-sm text-muted-foreground py-4">Loading integrations...</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">
            Manage API access for external tour operators. Each integration generates
            a unique API key and can optionally receive webhook notifications.
          </p>
        </div>
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          <Plus className="mr-1.5 h-4 w-4" />
          New Integration
        </Button>
      </div>

      {integrations && integrations.length > 0 ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tour Operator</TableHead>
              <TableHead>API Key</TableHead>
              <TableHead>Hotels</TableHead>
              <TableHead>Webhook</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Last Used</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {integrations.map((i) => (
              <TableRow key={i.id}>
                <TableCell className="font-medium">{i.tourOperator.name}</TableCell>
                <TableCell>
                  <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{i.apiKey.keyPrefix}...</code>
                </TableCell>
                <TableCell>{i.hotels.length} hotel{i.hotels.length !== 1 ? "s" : ""}</TableCell>
                <TableCell>
                  {i.webhookUrl ? (
                    <span className="text-xs text-muted-foreground truncate max-w-[200px] block">
                      {i.webhookUrl}
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground">Not configured</span>
                  )}
                </TableCell>
                <TableCell>
                  <Badge variant={i.active ? "default" : "secondary"}>
                    {i.active ? "Active" : "Inactive"}
                  </Badge>
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {i.apiKey.lastUsedAt
                    ? format(new Date(i.apiKey.lastUsedAt), "MMM d, HH:mm")
                    : "Never"}
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setEditId(i.id)}>
                        <Eye className="mr-2 h-4 w-4" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => regenMutation.mutate({ id: i.id })}>
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Regenerate Key
                      </DropdownMenuItem>
                      {i.webhookUrl && (
                        <DropdownMenuItem onClick={() => testMutation.mutate({ id: i.id })}>
                          <Send className="mr-2 h-4 w-4" />
                          Test Webhook
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem onClick={() => setDeliveriesId(i.id)}>
                        <Key className="mr-2 h-4 w-4" />
                        Webhook Logs
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={() => {
                          if (confirm("Delete this integration? The API key will be permanently revoked.")) {
                            deleteMutation.mutate({ id: i.id });
                          }
                        }}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : (
        <div className="text-center py-8 text-muted-foreground text-sm">
          No API integrations configured yet. Create one to get started.
        </div>
      )}

      {/* Create Dialog */}
      <CreateIntegrationDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onKeyCreated={(key, prefix) => setKeyReveal({ key, prefix })}
      />

      {/* Edit Dialog */}
      {editId && (
        <EditIntegrationDialog
          id={editId}
          open={!!editId}
          onOpenChange={(open) => !open && setEditId(null)}
        />
      )}

      {/* Key Reveal Dialog */}
      <KeyRevealDialog
        data={keyReveal}
        onClose={() => setKeyReveal(null)}
      />

      {/* Webhook Deliveries Sheet */}
      {deliveriesId && (
        <WebhookDeliveriesSheet
          integrationId={deliveriesId}
          open={!!deliveriesId}
          onOpenChange={(open) => !open && setDeliveriesId(null)}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Create Integration Dialog
// ---------------------------------------------------------------------------

function CreateIntegrationDialog({
  open,
  onOpenChange,
  onKeyCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onKeyCreated: (key: string, prefix: string) => void;
}) {
  const utils = trpc.useUtils();
  const { data: tourOperators } = trpc.contracting.tourOperator.list.useQuery();
  const { data: hotels } = trpc.contracting.hotel.list.useQuery();

  const [toId, setToId] = useState("");
  const [hotelIds, setHotelIds] = useState<string[]>([]);
  const [webhookUrl, setWebhookUrl] = useState("");
  const [webhookSecret, setWebhookSecret] = useState("");
  const [notes, setNotes] = useState("");

  const createMutation = trpc.apiIntegration.create.useMutation({
    onSuccess: (data) => {
      toast.success("Integration created");
      onOpenChange(false);
      onKeyCreated(data.plainKey, data.integration.apiKey.keyPrefix);
      utils.apiIntegration.list.invalidate();
      // Reset form
      setToId("");
      setHotelIds([]);
      setWebhookUrl("");
      setWebhookSecret("");
      setNotes("");
    },
    onError: (err) => toast.error(err.message),
  });

  function generateSecret() {
    const bytes = new Uint8Array(32);
    crypto.getRandomValues(bytes);
    setWebhookSecret(
      "whsec_" + Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join(""),
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>New API Integration</DialogTitle>
          <DialogDescription>
            Create API access for a tour operator. An API key will be generated automatically.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Tour Operator</Label>
            <Select value={toId} onValueChange={setToId}>
              <SelectTrigger>
                <SelectValue placeholder="Select tour operator" />
              </SelectTrigger>
              <SelectContent>
                {tourOperators?.map((to) => (
                  <SelectItem key={to.id} value={to.id}>
                    {to.name} ({to.code})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Hotels (select which hotels this TO can access)</Label>
            <div className="max-h-40 overflow-y-auto border rounded-md p-2 space-y-1">
              {hotels?.map((h) => (
                <label key={h.id} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-muted rounded px-1 py-0.5">
                  <input
                    type="checkbox"
                    checked={hotelIds.includes(h.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setHotelIds([...hotelIds, h.id]);
                      } else {
                        setHotelIds(hotelIds.filter((id) => id !== h.id));
                      }
                    }}
                  />
                  {h.name} ({h.code})
                </label>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">{hotelIds.length} selected</p>
          </div>

          <div className="space-y-1.5">
            <Label>Webhook URL (optional)</Label>
            <Input
              placeholder="https://example.com/webhooks/itms"
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Webhook Secret (optional)</Label>
            <div className="flex gap-2">
              <Input
                placeholder="whsec_..."
                value={webhookSecret}
                onChange={(e) => setWebhookSecret(e.target.value)}
                className="font-mono text-xs"
              />
              <Button variant="outline" size="sm" onClick={generateSecret} type="button">
                Generate
              </Button>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Notes (optional)</Label>
            <Textarea
              placeholder="Internal notes about this integration..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={!toId || hotelIds.length === 0 || createMutation.isPending}
            onClick={() =>
              createMutation.mutate({
                tourOperatorId: toId,
                hotelIds,
                webhookUrl: webhookUrl || undefined,
                webhookSecret: webhookSecret || undefined,
                notes: notes || undefined,
              })
            }
          >
            {createMutation.isPending ? "Creating..." : "Create Integration"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Edit Integration Dialog
// ---------------------------------------------------------------------------

function EditIntegrationDialog({
  id,
  open,
  onOpenChange,
}: {
  id: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const utils = trpc.useUtils();
  const { data: integration } = trpc.apiIntegration.getById.useQuery({ id });
  const { data: hotels } = trpc.contracting.hotel.list.useQuery();

  const [hotelIds, setHotelIds] = useState<string[]>([]);
  const [webhookUrl, setWebhookUrl] = useState("");
  const [webhookSecret, setWebhookSecret] = useState("");
  const [active, setActive] = useState(true);
  const [notes, setNotes] = useState("");
  const [initialized, setInitialized] = useState(false);

  if (integration && !initialized) {
    setHotelIds(integration.hotels.map((h) => h.hotelId));
    setWebhookUrl(integration.webhookUrl ?? "");
    setWebhookSecret(integration.webhookSecret ?? "");
    setActive(integration.active);
    setNotes(integration.notes ?? "");
    setInitialized(true);
  }

  const updateMutation = trpc.apiIntegration.update.useMutation({
    onSuccess: () => {
      toast.success("Integration updated");
      onOpenChange(false);
      setInitialized(false);
      utils.apiIntegration.list.invalidate();
      utils.apiIntegration.getById.invalidate({ id });
    },
    onError: (err) => toast.error(err.message),
  });

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) setInitialized(false); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit Integration</DialogTitle>
          <DialogDescription>
            {integration?.tourOperator.name} ({integration?.tourOperator.code})
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Label>Active</Label>
            <Switch checked={active} onCheckedChange={setActive} />
          </div>

          <div className="space-y-1.5">
            <Label>Hotels</Label>
            <div className="max-h-40 overflow-y-auto border rounded-md p-2 space-y-1">
              {hotels?.map((h) => (
                <label key={h.id} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-muted rounded px-1 py-0.5">
                  <input
                    type="checkbox"
                    checked={hotelIds.includes(h.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setHotelIds([...hotelIds, h.id]);
                      } else {
                        setHotelIds(hotelIds.filter((hid) => hid !== h.id));
                      }
                    }}
                  />
                  {h.name} ({h.code})
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Webhook URL</Label>
            <Input
              placeholder="https://example.com/webhooks/itms"
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Webhook Secret</Label>
            <Input
              placeholder="whsec_..."
              value={webhookSecret}
              onChange={(e) => setWebhookSecret(e.target.value)}
              className="font-mono text-xs"
            />
          </div>

          <div className="space-y-1.5">
            <Label>Notes</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={updateMutation.isPending}
            onClick={() =>
              updateMutation.mutate({
                id,
                hotelIds,
                webhookUrl: webhookUrl || null,
                webhookSecret: webhookSecret || null,
                active,
                notes: notes || null,
              })
            }
          >
            {updateMutation.isPending ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Key Reveal Dialog (shown once after create / regenerate)
// ---------------------------------------------------------------------------

function KeyRevealDialog({
  data,
  onClose,
}: {
  data: { key: string; prefix: string } | null;
  onClose: () => void;
}) {
  const [visible, setVisible] = useState(false);

  if (!data) return null;

  return (
    <Dialog open={!!data} onOpenChange={() => { onClose(); setVisible(false); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>API Key Generated</DialogTitle>
          <DialogDescription>
            Copy your API key now. You will not be able to see it again.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="relative">
            <Input
              readOnly
              value={visible ? data.key : data.key.replace(/./g, "\u2022")}
              className="font-mono text-xs pr-20"
            />
            <div className="absolute right-1 top-1 flex gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => setVisible(!visible)}
              >
                {visible ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => {
                  navigator.clipboard.writeText(data.key);
                  toast.success("API key copied to clipboard");
                }}
              >
                <Copy className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
          <p className="text-xs text-destructive font-medium">
            Store this key securely. It will not be shown again.
          </p>
        </div>

        <DialogFooter>
          <Button onClick={() => { onClose(); setVisible(false); }}>Done</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Webhook Deliveries Sheet
// ---------------------------------------------------------------------------

function WebhookDeliveriesSheet({
  integrationId,
  open,
  onOpenChange,
}: {
  integrationId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { data } = trpc.apiIntegration.listDeliveries.useQuery({
    integrationId,
    pageSize: 50,
  });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[500px] sm:max-w-[500px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Webhook Delivery Logs</SheetTitle>
          <SheetDescription>
            Recent webhook delivery attempts for this integration.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-4 space-y-2">
          {data?.deliveries && data.deliveries.length > 0 ? (
            data.deliveries.map((d) => (
              <div
                key={d.id}
                className="border rounded-md p-3 text-xs space-y-1"
              >
                <div className="flex items-center justify-between">
                  <Badge variant={d.success ? "default" : "destructive"} className="text-[10px]">
                    {d.success ? "OK" : "Failed"}
                  </Badge>
                  <span className="text-muted-foreground">
                    {format(new Date(d.createdAt), "MMM d, HH:mm:ss")}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{d.event}</span>
                  {d.httpStatus && (
                    <span className="text-muted-foreground">HTTP {d.httpStatus}</span>
                  )}
                </div>
                <div className="text-muted-foreground truncate">{d.url}</div>
                {d.error && (
                  <div className="text-destructive">{d.error}</div>
                )}
                <div className="text-muted-foreground">
                  Attempts: {d.attempts}
                </div>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground py-4 text-center">
              No webhook deliveries yet.
            </p>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
