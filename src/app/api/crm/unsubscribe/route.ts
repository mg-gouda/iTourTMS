import { db } from "@/server/db";
import { readUnsubscribeToken } from "@/server/services/crm/mailing";

/**
 * Unsubscribe from CRM mailings. GET only shows a confirm button, because
 * mail scanners open links; POST (the button, or a mail client's one-click
 * List-Unsubscribe-Post) records the opt-out.
 */
const page = (title: string, body: string, status = 200) =>
  new Response(
    `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title></head>` +
      `<body style="font-family:system-ui,Arial,sans-serif;background:#f4f4f5;margin:0;display:grid;place-items:center;min-height:100vh;color:#18181b">` +
      `<main style="background:#fff;border:1px solid #e4e4e7;border-radius:12px;padding:32px;max-width:420px;margin:16px;text-align:center">` +
      `<h1 style="font-size:20px;margin:0 0 12px">${title}</h1>${body}</main></body></html>`,
    { status, headers: { "content-type": "text/html; charset=utf-8", "x-robots-tag": "noindex" } },
  );

const invalid = () => page("Link not valid", `<p>This unsubscribe link is broken or has expired.</p>`, 400);

export async function GET(req: Request) {
  const t = new URL(req.url).searchParams.get("t") ?? "";
  if (!readUnsubscribeToken(t)) return invalid();
  return page(
    "Unsubscribe?",
    `<p style="margin:0 0 20px">You'll stop receiving our marketing emails. Booking confirmations still arrive.</p>` +
      `<form method="post"><input type="hidden" name="t" value="${t}">` +
      `<button style="background:#18181b;color:#fff;border:0;border-radius:8px;padding:10px 18px;font-size:15px;cursor:pointer">Unsubscribe</button></form>`,
  );
}

export async function POST(req: Request) {
  const url = new URL(req.url);
  let t = url.searchParams.get("t") ?? "";
  if (!t) {
    const form = await req.formData().catch(() => null);
    t = String(form?.get("t") ?? "");
  }
  const who = readUnsubscribeToken(t);
  if (!who) return invalid();
  if (who.kind === "lead") await db.crmLead.updateMany({ where: { id: who.id }, data: { emailOptOut: true } });
  else await db.crmCustomer.updateMany({ where: { id: who.id }, data: { emailOptOut: true } });
  return page("You're unsubscribed", `<p>We won't send you marketing emails any more.</p>`);
}
