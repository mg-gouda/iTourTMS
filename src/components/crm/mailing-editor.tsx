"use client";

import { Send } from "lucide-react";
import { useRouter } from "next/navigation";
import { useDeferredValue, useState } from "react";
import { toast } from "sonner";

import { ToggleChips } from "@/components/crm/toggle-chips";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { CRM_LEAD_SOURCE_LABELS, CRM_LEAD_STATUS_LABELS } from "@/lib/constants/crm";
import { trpc } from "@/lib/trpc";

export interface MailingDraft {
  id?: string;
  name: string;
  subject: string;
  body: string;
  audience: {
    target: "leads" | "customers";
    statuses: string[];
    sources: string[];
    teamId?: string | null;
    minScore: number;
    tiers: string[];
  };
}

export const NEW_MAILING: MailingDraft = {
  name: "",
  subject: "",
  body: "Dear {{firstName}},\n\n",
  audience: { target: "leads", statuses: [], sources: [], teamId: null, minScore: 0, tiers: [] },
};

const TIERS = ["STANDARD", "SILVER", "GOLD", "PLATINUM"].map((t) => ({ value: t, label: t[0] + t.slice(1).toLowerCase() }));
const SCORES = [
  { value: "0", label: "Any score" },
  { value: "40", label: "Warm and hot (40+)" },
  { value: "70", label: "Hot only (70+)" },
];
const ANY = "__any";
const opts = (labels: Record<string, string>) => Object.entries(labels).map(([value, label]) => ({ value, label }));

/** Write a mailing, pick who gets it, see the count live, then test and send. */
export function MailingEditor({ initial }: { initial: MailingDraft }) {
  const router = useRouter();
  const utils = trpc.useUtils();
  const [m, setM] = useState(initial);
  const a = m.audience;
  const setA = (patch: Partial<MailingDraft["audience"]>) => setM((x) => ({ ...x, audience: { ...x.audience, ...patch } }));

  const { data: teams } = trpc.crm.salesTeam.list.useQuery();
  const preview = trpc.crm.mailing.preview.useQuery(useDeferredValue(a), { placeholderData: (prev) => prev });
  const count = preview.data?.count ?? 0;

  const save = trpc.crm.mailing.save.useMutation({ onError: (e) => toast.error(e.message) });
  const test = trpc.crm.mailing.sendTest.useMutation({
    onSuccess: (r) => toast.success(`Test sent to ${r.to}`),
    onError: (e) => toast.error(e.message),
  });
  const send = trpc.crm.mailing.send.useMutation({
    onSuccess: (r) => {
      toast.success(`Sending to ${r.queued} people`);
      utils.crm.mailing.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });
  const busy = save.isPending || test.isPending || send.isPending;

  async function persist() {
    const saved = await save.mutateAsync({ ...m, audience: { ...a, teamId: a.teamId || null } });
    utils.crm.mailing.list.invalidate();
    if (!m.id) {
      router.replace(`/crm/mailings/${saved.id}`);
      return null;
    }
    utils.crm.mailing.getById.invalidate({ id: saved.id });
    return saved.id;
  }

  return (
    <form
      className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]"
      onSubmit={async (e) => {
        e.preventDefault();
        if ((await persist()) && m.id) toast.success("Draft saved");
      }}
    >
      <section className="space-y-4" aria-label="Message">
        <div className="space-y-1.5">
          <Label htmlFor="ml-name">Internal name</Label>
          <Input
            id="ml-name"
            value={m.name}
            onChange={(e) => setM({ ...m, name: e.target.value })}
            placeholder="e.g. Winter Nile offer — UK leads"
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="ml-subject">Subject line</Label>
          <Input id="ml-subject" value={m.subject} onChange={(e) => setM({ ...m, subject: e.target.value })} maxLength={200} required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="ml-body">Message</Label>
          <Textarea
            id="ml-body"
            value={m.body}
            onChange={(e) => setM({ ...m, body: e.target.value })}
            rows={16}
            className="min-h-80 leading-relaxed"
            required
          />
          <p className="text-muted-foreground text-xs">
            Plain text; a blank line starts a new paragraph. <code className="font-mono">{"{{firstName}}"}</code> becomes
            each person&apos;s first name. An unsubscribe link is added at the bottom.
          </p>
        </div>
      </section>

      <aside className="bg-muted/40 space-y-5 self-start rounded-lg border p-4" aria-label="Audience">
        <div className="space-y-2">
          <Label>Send to</Label>
          <RadioGroup
            value={a.target}
            onValueChange={(v) => setA({ target: v as "leads" | "customers" })}
            className="grid grid-cols-2 gap-2"
          >
            {(["leads", "customers"] as const).map((t) => (
              <Label
                key={t}
                className="has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-background flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 font-normal capitalize"
              >
                <RadioGroupItem value={t} /> {t}
              </Label>
            ))}
          </RadioGroup>
        </div>

        {a.target === "leads" ? (
          <>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <ToggleChips label="Status" options={opts(CRM_LEAD_STATUS_LABELS)} value={a.statuses} onChange={(statuses) => setA({ statuses })} emptyHint="Any status." />
            </div>
            <div className="space-y-1.5">
              <Label>Source</Label>
              <ToggleChips label="Source" options={opts(CRM_LEAD_SOURCE_LABELS)} value={a.sources} onChange={(sources) => setA({ sources })} emptyHint="Any source." />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Team</Label>
                <Select value={a.teamId || ANY} onValueChange={(v) => setA({ teamId: v === ANY ? null : v })}>
                  <SelectTrigger className="bg-background w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ANY}>Any team</SelectItem>
                    {(teams ?? []).map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Score</Label>
                <Select value={String(a.minScore)} onValueChange={(v) => setA({ minScore: Number(v) })}>
                  <SelectTrigger className="bg-background w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SCORES.map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </>
        ) : (
          <div className="space-y-1.5">
            <Label>Loyalty tier</Label>
            <ToggleChips label="Loyalty tier" options={TIERS} value={a.tiers} onChange={(tiers) => setA({ tiers })} emptyHint="Every customer." />
          </div>
        )}

        <div className="border-t pt-4" aria-live="polite">
          <p className="text-sm">
            <span className="font-mono text-2xl font-semibold tabular-nums">{preview.isLoading ? "…" : count}</span>{" "}
            {count === 1 ? "person" : "people"} will receive it
          </p>
          <p className="text-muted-foreground mt-0.5 text-xs">With an email address, not unsubscribed, once per address.</p>
          {!!preview.data?.sample.length && (
            <ul className="text-muted-foreground mt-2 space-y-0.5 text-xs">
              {preview.data.sample.map((p) => (
                <li key={p.email} className="truncate">
                  {p.name} · {p.email}
                </li>
              ))}
              {count > preview.data.sample.length && <li>and {count - preview.data.sample.length} more</li>}
            </ul>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <Button type="submit" variant="outline" disabled={busy}>
            {save.isPending ? "Saving…" : m.id ? "Save draft" : "Save draft and continue"}
          </Button>
          {m.id && (
            <>
              <Button
                type="button"
                variant="outline"
                disabled={busy}
                onClick={async () => {
                  if (await persist()) test.mutate({ id: m.id! });
                }}
              >
                {test.isPending ? "Sending test…" : "Send me a test"}
              </Button>
              <Button
                type="button"
                disabled={busy || !count}
                onClick={async () => {
                  if (!confirm(`Send “${m.subject}” to ${count} ${count === 1 ? "person" : "people"}? This can't be undone.`)) return;
                  if (await persist()) send.mutate({ id: m.id! });
                }}
              >
                <Send className="me-2 size-4" />
                {send.isPending ? "Starting…" : `Send to ${count} ${count === 1 ? "person" : "people"}`}
              </Button>
            </>
          )}
        </div>
      </aside>
    </form>
  );
}
