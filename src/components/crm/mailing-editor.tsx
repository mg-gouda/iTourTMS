"use client";

import { Send } from "lucide-react";
import { useTranslations } from "next-intl";
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

const TIERS = ["STANDARD", "SILVER", "GOLD", "PLATINUM"];
const SCORES = [
  { value: "0", key: "anyScore" },
  { value: "40", key: "warmPlus" },
  { value: "70", key: "hotOnly" },
] as const;
const ANY = "__any";
const opts = (labels: Record<string, string>) => Object.entries(labels).map(([value, label]) => ({ value, label }));

/** Write a mailing, pick who gets it, see the count live, then test and send. */
export function MailingEditor({ initial }: { initial: MailingDraft }) {
  const t = useTranslations("crm.mailings");
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
    onSuccess: (r) => toast.success(t("testSent", { to: r.to })),
    onError: (e) => toast.error(e.message),
  });
  const send = trpc.crm.mailing.send.useMutation({
    onSuccess: (r) => {
      toast.success(t("sendingTo", { count: r.queued }));
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
        if ((await persist()) && m.id) toast.success(t("draftSaved"));
      }}
    >
      <section className="space-y-4" aria-label={t("message")}>
        <div className="space-y-1.5">
          <Label htmlFor="ml-name">{t("name")}</Label>
          <Input
            id="ml-name"
            value={m.name}
            onChange={(e) => setM({ ...m, name: e.target.value })}
            placeholder={t("namePlaceholder")}
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="ml-subject">{t("subject")}</Label>
          <Input id="ml-subject" value={m.subject} onChange={(e) => setM({ ...m, subject: e.target.value })} maxLength={200} required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="ml-body">{t("message")}</Label>
          <Textarea
            id="ml-body"
            value={m.body}
            onChange={(e) => setM({ ...m, body: e.target.value })}
            rows={16}
            className="min-h-80 leading-relaxed"
            required
          />
          <p className="text-muted-foreground text-xs">
            {t("messageHint", { token: "{{firstName}}" })}
          </p>
        </div>
      </section>

      <aside className="bg-muted/40 space-y-5 self-start rounded-lg border p-4" aria-label={t("audience")}>
        <div className="space-y-2">
          <Label>{t("sendTo")}</Label>
          <RadioGroup
            value={a.target}
            onValueChange={(v) => setA({ target: v as "leads" | "customers" })}
            className="grid grid-cols-2 gap-2"
          >
            {(["leads", "customers"] as const).map((target) => (
              <Label
                key={target}
                className="has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-background flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 font-normal"
              >
                <RadioGroupItem value={target} /> {t(`target.${target}`)}
              </Label>
            ))}
          </RadioGroup>
        </div>

        {a.target === "leads" ? (
          <>
            <div className="space-y-1.5">
              <Label>{t("statusLabel")}</Label>
              <ToggleChips label={t("statusLabel")} options={opts(CRM_LEAD_STATUS_LABELS)} value={a.statuses} onChange={(statuses) => setA({ statuses })} emptyHint={t("anyStatus")} />
            </div>
            <div className="space-y-1.5">
              <Label>{t("source")}</Label>
              <ToggleChips label={t("source")} options={opts(CRM_LEAD_SOURCE_LABELS)} value={a.sources} onChange={(sources) => setA({ sources })} emptyHint={t("anySource")} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>{t("team")}</Label>
                <Select value={a.teamId || ANY} onValueChange={(v) => setA({ teamId: v === ANY ? null : v })}>
                  <SelectTrigger className="bg-background w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ANY}>{t("anyTeam")}</SelectItem>
                    {(teams ?? []).map((tm) => (
                      <SelectItem key={tm.id} value={tm.id}>
                        {tm.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>{t("score")}</Label>
                <Select value={String(a.minScore)} onValueChange={(v) => setA({ minScore: Number(v) })}>
                  <SelectTrigger className="bg-background w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SCORES.map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        {t(s.key)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </>
        ) : (
          <div className="space-y-1.5">
            <Label>{t("tier")}</Label>
            <ToggleChips
              label={t("tier")}
              options={TIERS.map((v) => ({ value: v, label: t(`tiers.${v}`) }))}
              value={a.tiers}
              onChange={(tiers) => setA({ tiers })}
              emptyHint={t("everyCustomer")}
            />
          </div>
        )}

        <div className="border-t pt-4" aria-live="polite">
          <p className="text-sm">
            <span className="font-mono text-2xl font-semibold tabular-nums">{preview.isLoading ? "…" : count}</span>{" "}
            {t("willReceive", { count })}
          </p>
          <p className="text-muted-foreground mt-0.5 text-xs">{t("receiveHint")}</p>
          {!!preview.data?.sample.length && (
            <ul className="text-muted-foreground mt-2 space-y-0.5 text-xs">
              {preview.data.sample.map((p) => (
                <li key={p.email} className="truncate">
                  {p.name} · {p.email}
                </li>
              ))}
              {count > preview.data.sample.length && <li>{t("andMore", { count: count - preview.data.sample.length })}</li>}
            </ul>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <Button type="submit" variant="outline" disabled={busy}>
            {save.isPending ? t("saving") : m.id ? t("saveDraft") : t("saveContinue")}
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
                {test.isPending ? t("sendingTest") : t("sendTest")}
              </Button>
              <Button
                type="button"
                disabled={busy || !count}
                onClick={async () => {
                  if (!confirm(t("confirmSend", { subject: m.subject, count }))) return;
                  if (await persist()) send.mutate({ id: m.id! });
                }}
              >
                <Send className="me-2 size-4" />
                {send.isPending ? t("starting") : t("sendCount", { count })}
              </Button>
            </>
          )}
        </div>
      </aside>
    </form>
  );
}
