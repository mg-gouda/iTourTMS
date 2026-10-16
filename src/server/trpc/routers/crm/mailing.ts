import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { activeBranch } from "@/server/branch-scope";
import { audienceSchema, deliverMailing, renderMailing, resolveAudience } from "@/server/services/crm/mailing";
import { sendEmail } from "@/server/services/shared/email";
import { createTRPCRouter, modulePermissionProcedure } from "@/server/trpc";

// ponytail: mailings ride on the lead permissions; split out if roles need it.
const read = modulePermissionProcedure("crm", "crm:lead:read");
const write = modulePermissionProcedure("crm", "crm:lead:update");

const draftInput = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(1, "Name is required"),
  subject: z.string().trim().min(1, "Subject is required").max(200),
  body: z.string().trim().min(1, "Write the message").max(20000),
  audience: audienceSchema,
});

const smtpReady = () => {
  if (!process.env.SMTP_HOST) {
    throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Email isn't set up on this server yet (SMTP settings missing)." });
  }
};

export const mailingRouter = createTRPCRouter({
  list: read.query(({ ctx }) =>
    ctx.db.crmMailing.findMany({
      where: { companyId: ctx.companyId },
      include: {
        branch: { select: { code: true, name: true } },
        createdBy: { select: { name: true } },
        _count: { select: { recipients: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 200,
    }),
  ),

  getById: read.input(z.object({ id: z.string() })).query(async ({ ctx, input }) => {
    const mailing = await ctx.db.crmMailing.findFirstOrThrow({
      where: { id: input.id, companyId: ctx.companyId },
      include: {
        branch: { select: { code: true, name: true } },
        createdBy: { select: { name: true } },
        recipients: { orderBy: [{ status: "asc" }, { email: "asc" }], take: 1000 },
      },
    });
    return { ...mailing, audience: audienceSchema.parse(mailing.audience) };
  }),

  /** How many people a draft would reach right now, and a few of them. */
  preview: read.input(audienceSchema).query(async ({ ctx, input }) => {
    const people = await resolveAudience(ctx.db, ctx.companyId, input);
    return { count: people.length, sample: people.slice(0, 5).map((p) => ({ name: p.name, email: p.email })) };
  }),

  save: write.input(draftInput).mutation(async ({ ctx, input }) => {
    const { id, ...data } = input;
    if (id) {
      const current = await ctx.db.crmMailing.findFirstOrThrow({ where: { id, companyId: ctx.companyId } });
      if (current.status !== "DRAFT") throw new TRPCError({ code: "BAD_REQUEST", message: "Sent mailings can't be edited." });
      return ctx.db.crmMailing.update({ where: { id }, data });
    }
    return ctx.db.crmMailing.create({
      data: { ...data, companyId: ctx.companyId, branchId: activeBranch(ctx.branch), createdById: ctx.user.id },
    });
  }),

  delete: write.input(z.object({ id: z.string() })).mutation(async ({ ctx, input }) => {
    const m = await ctx.db.crmMailing.findFirstOrThrow({ where: { id: input.id, companyId: ctx.companyId } });
    if (m.status === "SENDING") throw new TRPCError({ code: "BAD_REQUEST", message: "Wait until it finishes sending." });
    return ctx.db.crmMailing.delete({ where: { id: m.id } });
  }),

  /** Sends one copy to the signed-in user, to check how it reads. */
  sendTest: write.input(z.object({ id: z.string() })).mutation(async ({ ctx, input }) => {
    smtpReady();
    const m = await ctx.db.crmMailing.findFirstOrThrow({ where: { id: input.id, companyId: ctx.companyId } });
    const me = await ctx.db.user.findUniqueOrThrow({ where: { id: ctx.user.id }, select: { email: true, name: true } });
    const { html, text } = renderMailing(m.body, me.name?.split(" ")[0] ?? "there", null);
    await sendEmail({ to: me.email, subject: `[Test] ${m.subject}`, html, text });
    return { to: me.email };
  }),

  send: write.input(z.object({ id: z.string() })).mutation(async ({ ctx, input }) => {
    smtpReady();
    const m = await ctx.db.crmMailing.findFirstOrThrow({ where: { id: input.id, companyId: ctx.companyId } });
    if (m.status !== "DRAFT") throw new TRPCError({ code: "BAD_REQUEST", message: "This mailing was already sent." });
    const people = await resolveAudience(ctx.db, ctx.companyId, audienceSchema.parse(m.audience));
    if (!people.length) throw new TRPCError({ code: "BAD_REQUEST", message: "Nobody matches this audience." });

    // Claim the draft atomically so a double click can't send twice.
    const claimed = await ctx.db.crmMailing.updateMany({ where: { id: m.id, status: "DRAFT" }, data: { status: "SENDING" } });
    if (!claimed.count) throw new TRPCError({ code: "CONFLICT", message: "This mailing is already sending." });
    await ctx.db.crmMailingRecipient.createMany({
      data: people.map((p) => ({
        mailingId: m.id,
        email: p.email,
        name: p.name,
        leadId: p.leadId ?? null,
        customerId: p.customerId ?? null,
      })),
    });
    void deliverMailing(m.id).catch((e) => ctx.logger.error({ err: e, mailingId: m.id }, "crm mailing failed"));
    return { queued: people.length };
  }),
});
