import { createHmac, timingSafeEqual } from "node:crypto";

import type { PrismaClient } from "@prisma/client";
import { z } from "zod";

import { db as globalDb } from "@/server/db";
import { logger } from "@/lib/logger";
import { sendEmail } from "@/server/services/shared/email";

import { scoreInclude, withScore } from "./lead-routing";

type Db = Omit<PrismaClient, "$connect" | "$disconnect" | "$on" | "$use" | "$extends">;

export const audienceSchema = z.object({
  target: z.enum(["leads", "customers"]),
  // leads
  statuses: z.array(z.string()).default([]),
  sources: z.array(z.string()).default([]),
  teamId: z.string().nullish(),
  minScore: z.number().int().min(0).max(100).default(0),
  // customers
  tiers: z.array(z.string()).default([]),
});
export type Audience = z.infer<typeof audienceSchema>;

export interface Recipient {
  email: string;
  name: string;
  firstName: string;
  leadId?: string;
  customerId?: string;
}

/**
 * Who a mailing reaches: matching leads (in the caller's branches) or
 * customers, with an email, not opted out, one message per address.
 */
export async function resolveAudience(db: Db, companyId: string, a: Audience): Promise<Recipient[]> {
  let rows: Recipient[];
  if (a.target === "leads") {
    const leads = await db.crmLead.findMany({
      where: {
        companyId,
        email: { not: null },
        emailOptOut: false,
        ...(a.statuses.length && { status: { in: a.statuses as never } }),
        ...(a.sources.length && { source: { in: a.sources as never } }),
        ...(a.teamId && { teamId: a.teamId }),
      },
      include: scoreInclude,
    });
    rows = leads
      .map(withScore)
      .filter((l) => l.score >= a.minScore)
      .map((l) => ({ email: l.email!, name: `${l.firstName} ${l.lastName}`, firstName: l.firstName, leadId: l.id }));
  } else {
    const customers = await db.crmCustomer.findMany({
      where: {
        companyId,
        email: { not: null },
        emailOptOut: false,
        ...(a.tiers.length && { loyaltyTier: { in: a.tiers } }),
      },
      select: { id: true, email: true, firstName: true, lastName: true },
    });
    rows = customers.map((c) => ({
      email: c.email!,
      name: `${c.firstName} ${c.lastName}`,
      firstName: c.firstName,
      customerId: c.id,
    }));
  }
  const seen = new Set<string>();
  return rows.filter((r) => {
    const key = r.email.trim().toLowerCase();
    if (!key.includes("@") || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// ── Unsubscribe links: signed, so they need no login and can't be forged ──

const secret = () => process.env.AUTH_SECRET ?? "dev-secret";
const sign = (payload: string) => createHmac("sha256", secret()).update(`unsub:${payload}`).digest("base64url");

export function unsubscribeToken(r: { leadId?: string | null; customerId?: string | null }): string {
  const payload = r.leadId ? `l.${r.leadId}` : `c.${r.customerId}`;
  return `${payload}.${sign(payload)}`;
}

export function readUnsubscribeToken(token: string): { kind: "lead" | "customer"; id: string } | null {
  const m = /^([lc])\.([A-Za-z0-9_-]+)\.([A-Za-z0-9_-]+)$/.exec(token);
  if (!m) return null;
  const want = Buffer.from(sign(`${m[1]}.${m[2]}`));
  const got = Buffer.from(m[3]);
  if (want.length !== got.length || !timingSafeEqual(want, got)) return null;
  return { kind: m[1] === "l" ? "lead" : "customer", id: m[2] };
}

const escape = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** Plain-text body → safe HTML, with the recipient's name and an unsubscribe footer. */
export function renderMailing(body: string, firstName: string, unsubscribeUrl: string | null) {
  const text = body.replace(/\{\{\s*firstName\s*\}\}/g, firstName);
  const paras = text
    .split(/\n{2,}/)
    .map((p) => `<p style="margin:0 0 14px">${escape(p).replace(/\n/g, "<br>")}</p>`)
    .join("");
  const footer = unsubscribeUrl
    ? `<p style="margin:24px 0 0;font-size:12px;color:#6b7280">Don't want these emails? <a href="${escape(unsubscribeUrl)}" style="color:#6b7280">Unsubscribe</a>.</p>`
    : "";
  return {
    html: `<div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.55;color:#111827;max-width:620px">${paras}${footer}</div>`,
    text: unsubscribeUrl ? `${text}\n\n--\nUnsubscribe: ${unsubscribeUrl}` : text,
  };
}

const appUrl = () => (process.env.NEXT_PUBLIC_APP_URL ?? process.env.NEXTAUTH_URL ?? "").replace(/\/$/, "");

/** Sends a mailing's pending recipients, one by one, and closes it out. Runs in the background. */
export async function deliverMailing(mailingId: string) {
  const mailing = await globalDb.crmMailing.findUniqueOrThrow({ where: { id: mailingId } });
  const pending = await globalDb.crmMailingRecipient.findMany({ where: { mailingId, status: "PENDING" } });

  for (const r of pending) {
    const url = `${appUrl()}/api/crm/unsubscribe?t=${unsubscribeToken(r)}`;
    const { html, text } = renderMailing(mailing.body, r.name.split(" ")[0] ?? "", url);
    try {
      await sendEmail({
        to: r.email,
        subject: mailing.subject,
        html,
        text,
        headers: { "List-Unsubscribe": `<${url}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" },
      });
      await globalDb.crmMailingRecipient.update({ where: { id: r.id }, data: { status: "SENT", sentAt: new Date() } });
    } catch (e) {
      await globalDb.crmMailingRecipient.update({
        where: { id: r.id },
        data: { status: "FAILED", error: e instanceof Error ? e.message.slice(0, 500) : "Send failed" },
      });
    }
  }

  const counts = await globalDb.crmMailingRecipient.groupBy({ by: ["status"], where: { mailingId }, _count: true });
  const n = (s: string) => counts.find((c) => c.status === s)?._count ?? 0;
  await globalDb.crmMailing.update({
    where: { id: mailingId },
    data: { status: "SENT", sentAt: new Date(), sentCount: n("SENT"), failedCount: n("FAILED") },
  });
  logger.info({ mailingId, sent: n("SENT"), failed: n("FAILED") }, "crm mailing delivered");
}

/**
 * Picks up mailings a restart cut off mid-send. Called once at server boot.
 * ponytail: assumes one app instance — at boot nothing else is delivering.
 */
export async function resumeMailings() {
  const stuck = await globalDb.crmMailing.findMany({ where: { status: "SENDING" }, select: { id: true } });
  for (const m of stuck) await deliverMailing(m.id);
  if (stuck.length) logger.info({ count: stuck.length }, "crm mailings resumed");
}
