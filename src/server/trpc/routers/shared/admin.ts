import { TRPCError } from "@trpc/server";
import bcrypt from "bcryptjs";
import { z } from "zod";

import { P } from "@/lib/constants/permissions";
import { createTRPCRouter, permissionProcedure, protectedProcedure } from "@/server/trpc";

// ── Helper: invalidate JWT for a user ──────────────────────────────────────
async function invalidateUserToken(ctx: { db: import("@prisma/client").PrismaClient; redis: import("ioredis").Redis }, userId: string) {
  await ctx.db.user.update({ where: { id: userId }, data: { tokenVersion: { increment: 1 } } });
  await ctx.redis.del(`tv:${userId}`, `perms:${userId}`).catch(() => {});
}

// ── Admin: User Management ────────────────────────────────────────────────
const adminUserRouter = createTRPCRouter({
  list: permissionProcedure(P.SYSTEM_USER_READ).query(async ({ ctx }) => {
    return ctx.db.user.findMany({
      where: { companyId: ctx.session.user.companyId ?? undefined },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        isActive: true,
        locale: true,
        createdAt: true,
        userRoles: {
          select: {
            role: { select: { id: true, name: true, displayName: true } },
          },
        },
      },
      orderBy: { name: "asc" },
    });
  }),

  getById: permissionProcedure(P.SYSTEM_USER_READ)
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const user = await ctx.db.user.findUnique({
        where: { id: input.id, companyId: ctx.session.user.companyId ?? undefined },
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
          isActive: true,
          locale: true,
          createdAt: true,
          updatedAt: true,
          passwordExpiresAt: true,
          userRoles: {
            select: {
              role: { select: { id: true, name: true, displayName: true, description: true } },
            },
          },
        },
      });
      if (!user) throw new TRPCError({ code: "NOT_FOUND" });
      return user;
    }),

  create: permissionProcedure(P.SYSTEM_USER_CREATE)
    .input(
      z.object({
        name: z.string().min(1),
        email: z.string().email(),
        password: z.string().min(8),
        locale: z.string().default("en"),
        roleIds: z.array(z.string()).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.user.findUnique({ where: { email: input.email }, select: { id: true } });
      if (existing) throw new TRPCError({ code: "CONFLICT", message: "Email already in use" });

      const hashed = await bcrypt.hash(input.password, 12);
      const user = await ctx.db.user.create({
        data: {
          name: input.name,
          email: input.email,
          password: hashed,
          locale: input.locale,
          companyId: ctx.session.user.companyId ?? undefined,
          isActive: true,
        },
      });

      if (input.roleIds?.length) {
        await ctx.db.userRole.createMany({
          data: input.roleIds.map((roleId) => ({ userId: user.id, roleId })),
          skipDuplicates: true,
        });
      }

      return user;
    }),

  update: permissionProcedure(P.SYSTEM_USER_UPDATE)
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1).optional(),
        email: z.string().email().optional(),
        locale: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      return ctx.db.user.update({
        where: { id, companyId: ctx.session.user.companyId ?? undefined },
        data,
      });
    }),

  toggleActive: permissionProcedure(P.SYSTEM_USER_UPDATE)
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const user = await ctx.db.user.findUnique({
        where: { id: input.id, companyId: ctx.session.user.companyId ?? undefined },
        select: { id: true, isActive: true },
      });
      if (!user) throw new TRPCError({ code: "NOT_FOUND" });

      const updated = await ctx.db.user.update({
        where: { id: input.id },
        data: { isActive: !user.isActive, tokenVersion: { increment: 1 } },
      });
      await ctx.redis.del(`tv:${input.id}`).catch(() => {});
      return updated;
    }),

  resetPassword: permissionProcedure(P.SYSTEM_USER_UPDATE)
    .input(z.object({
      id: z.string(),
      newPassword: z.string().min(8),
      passwordExpiresAt: z.string().datetime().nullable().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const hashed = await bcrypt.hash(input.newPassword, 12);
      await ctx.db.user.update({
        where: { id: input.id, companyId: ctx.session.user.companyId ?? undefined },
        data: {
          password: hashed,
          tokenVersion: { increment: 1 },
          passwordExpiresAt: input.passwordExpiresAt ? new Date(input.passwordExpiresAt) : null,
        },
      });
      await ctx.redis.del(`tv:${input.id}`).catch(() => {});
      return { ok: true };
    }),

  setPasswordExpiry: permissionProcedure(P.SYSTEM_USER_UPDATE)
    .input(z.object({
      id: z.string(),
      passwordExpiresAt: z.string().datetime().nullable(),
    }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.user.update({
        where: { id: input.id, companyId: ctx.session.user.companyId ?? undefined },
        data: { passwordExpiresAt: input.passwordExpiresAt ? new Date(input.passwordExpiresAt) : null },
      });
      return { ok: true };
    }),

  assignRole: permissionProcedure(P.SYSTEM_USER_UPDATE)
    .input(z.object({ userId: z.string(), roleId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.userRole.upsert({
        where: { userId_roleId: { userId: input.userId, roleId: input.roleId } },
        update: {},
        create: { userId: input.userId, roleId: input.roleId },
      });
      await invalidateUserToken(ctx as any, input.userId);
      return { ok: true };
    }),

  revokeRole: permissionProcedure(P.SYSTEM_USER_UPDATE)
    .input(z.object({ userId: z.string(), roleId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.userRole.delete({
        where: { userId_roleId: { userId: input.userId, roleId: input.roleId } },
      });
      await invalidateUserToken(ctx as any, input.userId);
      return { ok: true };
    }),

  delete: permissionProcedure(P.SYSTEM_USER_DELETE)
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      if (input.id === ctx.session.user.id) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Cannot delete your own account" });
      }
      await ctx.db.user.delete({
        where: { id: input.id, companyId: ctx.session.user.companyId ?? undefined },
      });
      await ctx.redis.del(`tv:${input.id}`).catch(() => {});
      return { ok: true };
    }),
});

// ── Admin: Role Management ────────────────────────────────────────────────
const adminRoleRouter = createTRPCRouter({
  list: permissionProcedure(P.SYSTEM_ROLE_READ).query(async ({ ctx }) => {
    return ctx.db.role.findMany({
      where: { companyId: ctx.session.user.companyId ?? undefined },
      include: {
        _count: { select: { userRoles: true, rolePermissions: true } },
      },
      orderBy: { name: "asc" },
    });
  }),

  getById: permissionProcedure(P.SYSTEM_ROLE_READ)
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const role = await ctx.db.role.findUnique({
        where: { id: input.id, companyId: ctx.session.user.companyId ?? undefined },
        include: {
          rolePermissions: { include: { permission: true } },
          userRoles: {
            include: {
              user: { select: { id: true, name: true, email: true, image: true, isActive: true } },
            },
          },
        },
      });
      if (!role) throw new TRPCError({ code: "NOT_FOUND" });
      return role;
    }),

  create: permissionProcedure(P.SYSTEM_ROLE_CREATE)
    .input(
      z.object({
        name: z.string().min(1).regex(/^[a-z0-9_]+$/, "Only lowercase letters, numbers, underscores"),
        displayName: z.string().min(1),
        description: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.role.create({
        data: {
          name: input.name,
          displayName: input.displayName,
          description: input.description,
          companyId: ctx.session.user.companyId!,
          isSystem: false,
        },
      });
    }),

  update: permissionProcedure(P.SYSTEM_ROLE_UPDATE)
    .input(
      z.object({
        id: z.string(),
        displayName: z.string().min(1).optional(),
        description: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const role = await ctx.db.role.findUnique({
        where: { id: input.id, companyId: ctx.session.user.companyId ?? undefined },
        select: { isSystem: true },
      });
      if (!role) throw new TRPCError({ code: "NOT_FOUND" });
      const { id, ...data } = input;
      return ctx.db.role.update({ where: { id }, data });
    }),

  delete: permissionProcedure(P.SYSTEM_ROLE_DELETE)
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const role = await ctx.db.role.findUnique({
        where: { id: input.id, companyId: ctx.session.user.companyId ?? undefined },
        select: { isSystem: true },
      });
      if (!role) throw new TRPCError({ code: "NOT_FOUND" });
      if (role.isSystem) throw new TRPCError({ code: "BAD_REQUEST", message: "Cannot delete system roles" });

      // Invalidate all users who had this role
      const affectedUsers = await ctx.db.userRole.findMany({
        where: { roleId: input.id },
        select: { userId: true },
      });
      await ctx.db.role.delete({ where: { id: input.id } });
      for (const { userId } of affectedUsers) {
        await invalidateUserToken(ctx as any, userId);
      }
      return { ok: true };
    }),

  setPermissions: permissionProcedure(P.SYSTEM_ROLE_UPDATE)
    .input(z.object({ roleId: z.string(), permissionCodes: z.array(z.string()) }))
    .mutation(async ({ ctx, input }) => {
      const role = await ctx.db.role.findUnique({
        where: { id: input.roleId, companyId: ctx.session.user.companyId ?? undefined },
        select: { id: true, name: true },
      });
      if (!role) throw new TRPCError({ code: "NOT_FOUND" });
      if (role.name === "super_admin") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Super admin permissions cannot be modified" });
      }

      const permissions = await ctx.db.permission.findMany({
        where: { code: { in: input.permissionCodes } },
        select: { id: true },
      });

      await ctx.db.rolePermission.deleteMany({ where: { roleId: input.roleId } });
      if (permissions.length) {
        await ctx.db.rolePermission.createMany({
          data: permissions.map((p) => ({ roleId: input.roleId, permissionId: p.id })),
          skipDuplicates: true,
        });
      }

      // Invalidate all users in this role
      const affectedUsers = await ctx.db.userRole.findMany({
        where: { roleId: input.roleId },
        select: { userId: true },
      });
      for (const { userId } of affectedUsers) {
        await invalidateUserToken(ctx as any, userId);
      }

      return { ok: true, count: permissions.length };
    }),
});

// ── Admin: Permission Listing ─────────────────────────────────────────────
const adminPermissionRouter = createTRPCRouter({
  listAll: permissionProcedure(P.SYSTEM_PERMISSION_READ).query(async ({ ctx }) => {
    return ctx.db.permission.findMany({
      orderBy: [{ module: "asc" }, { resource: "asc" }, { action: "asc" }],
    });
  }),
});

// ── Admin Root Router ─────────────────────────────────────────────────────
export const adminRouter = createTRPCRouter({
  user: adminUserRouter,
  role: adminRoleRouter,
  permission: adminPermissionRouter,
});
