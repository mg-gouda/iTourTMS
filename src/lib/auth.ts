import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";

import { db } from "@/server/db";
import { redis } from "@/server/redis";
import { notifyRole } from "@/server/services/shared/notifications";
import { LICENSE_EXPIRY_WARNING_DAYS } from "@/server/services/shared/license";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(db),
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await db.user.findUnique({
          where: { email: credentials.email as string },
          include: {
            userRoles: {
              include: {
                role: {
                  include: {
                    rolePermissions: {
                      include: { permission: true },
                    },
                  },
                },
              },
            },
          },
        });

        if (!user || !user.password || !user.isActive) return null;

        // Reject login if password has expired
        if (user.passwordExpiresAt && user.passwordExpiresAt < new Date()) return null;

        const isValid = await bcrypt.compare(
          credentials.password as string,
          user.password,
        );
        if (!isValid) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;

        // Fetch user details for JWT (roles only — no permissions, kept out of JWT to avoid JWE size limit)
        let dbUser;
        try {
          dbUser = await db.user.findUnique({
            where: { id: user.id },
            select: {
              companyId: true,
              tourOperatorId: true,
              locale: true,
              tokenVersion: true,
              userRoles: {
                select: { role: { select: { name: true } } },
              },
            },
          });
        } catch (e) {
          console.error("[auth] jwt sign-in db query failed:", e);
        }

        token.tokenVersion = dbUser?.tokenVersion ?? 0;
        if (dbUser) {
          token.companyId = dbUser.companyId;
          token.tourOperatorId = dbUser.tourOperatorId;
          token.locale = dbUser.locale;
          token.roles = dbUser.userRoles.map((ur) => ur.role.name);
        }

        // Backup license expiry notification on login
        if (dbUser?.companyId) {
          const warningDate = new Date();
          warningDate.setDate(warningDate.getDate() + LICENSE_EXPIRY_WARNING_DAYS);

          db.license
            .findFirst({
              where: {
                companyId: dbUser.companyId,
                isActivated: true,
                isRevoked: false,
                expiryNotified: false,
                expiresAt: { gt: new Date(), lte: warningDate },
              },
              select: { id: true, companyId: true, expiresAt: true },
            })
            .then((license) => {
              if (license?.companyId && license.expiresAt) {
                const daysLeft = Math.ceil(
                  (license.expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24),
                );
                notifyRole(db, license.companyId, "super_admin", {
                  type: "LICENSE_EXPIRY_WARNING",
                  title: "License expires soon",
                  message: `Your iTourTMS license expires on ${license.expiresAt.toLocaleDateString()} (${daysLeft} days). Contact your provider to renew.`,
                  link: "/settings",
                });
                db.license.update({
                  where: { id: license.id },
                  data: { expiryNotified: true },
                });
              }
            })
            .catch(() => {}); // Fire-and-forget
        }
      } else if (token.id) {
        // Subsequent requests — validate tokenVersion via Redis cache (60s TTL)
        const cacheKey = `tv:${token.id}`;
        try {
          await redis.connect().catch(() => {});
          const cached = await redis.get(cacheKey);
          if (cached) {
            const { tokenVersion, isActive } = JSON.parse(cached) as { tokenVersion: number; isActive: boolean };
            if (!isActive || tokenVersion !== token.tokenVersion) return null;
          } else {
            const dbUser = await db.user.findUnique({
              where: { id: token.id as string },
              select: { tokenVersion: true, isActive: true },
            });
            if (!dbUser || !dbUser.isActive) return null;
            if (dbUser.tokenVersion !== token.tokenVersion) return null;
            await redis.setex(cacheKey, 60, JSON.stringify({ tokenVersion: dbUser.tokenVersion, isActive: dbUser.isActive })).catch(() => {});
          }
        } catch {
          // Redis/DB unavailable — don't block the request
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.companyId = token.companyId as string | null;
        session.user.tourOperatorId = token.tourOperatorId as string | null;
        session.user.locale = token.locale as string;
        session.user.roles = (token.roles as string[]) ?? [];

        // Fetch permissions from Redis/DB (not stored in JWT to keep it small)
        const userId = token.id as string;
        const cacheKey = `perms:${userId}`;
        let permissions: string[] = [];
        try {
          await redis.connect().catch(() => {});
          const cached = await redis.get(cacheKey);
          if (cached) {
            permissions = JSON.parse(cached) as string[];
          } else {
            const rolePerms = await db.rolePermission.findMany({
              where: { role: { userRoles: { some: { userId } } } },
              select: { permission: { select: { code: true } } },
            });
            permissions = [...new Set(rolePerms.map((rp) => rp.permission.code))];
            await redis.setex(cacheKey, 60, JSON.stringify(permissions)).catch(() => {});
          }
        } catch {
          // Redis/DB unavailable — proceed with empty permissions (super_admin bypass covers admins)
        }
        session.user.permissions = permissions;
      }
      return session;
    },
  },
});
