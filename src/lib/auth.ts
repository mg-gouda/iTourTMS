import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";

import { getClientIp } from "@/lib/client-ip";
import { hashBackupCode, verifyTotp } from "@/lib/totp";
import { db } from "@/server/db";
import { redis } from "@/server/redis";
import { notifyRole } from "@/server/services/shared/notifications";
import { LICENSE_EXPIRY_WARNING_DAYS } from "@/server/services/shared/license";

/** Password was right but the account needs a TOTP code — the client shows the OTP field. */
class TwoFactorRequired extends CredentialsSignin {
  code = "2fa_required";
}

/** TOTP code was wrong or expired. */
class TwoFactorInvalid extends CredentialsSignin {
  code = "2fa_invalid";
}

/** Too many failed attempts for this email or IP — back off. */
class TooManyAttempts extends CredentialsSignin {
  code = "too_many_attempts";
}

const LOGIN_WINDOW_SECONDS = 15 * 60;
// Per-email is the real brake on a targeted attack. Per-IP only has to stop
// spraying, and it is deliberately loose because a whole office shares one NAT
// address — too tight and one bad Monday locks out the entire customer.
const LOGIN_MAX_PER_EMAIL = 10;
const LOGIN_MAX_PER_IP = 100;

/**
 * A real bcrypt hash of a random string, compared against when the account does
 * not exist so a miss costs the same wall-clock time as a wrong password.
 * Without it, response latency tells an attacker which emails are registered.
 */
const DECOY_HASH = "$2b$12$uqQOQd3uexMOdKfmgfvTeOASA19/W33yLUSeWY42zjkiyWQeu/PSe";

const failKeys = (email: string, ip: string) => [
  `login_fail:email:${email}`,
  `login_fail:ip:${ip}`,
];

/**
 * Fixed-window failure counters. Fails OPEN: Redis being down must not lock
 * every user out of the product.
 */
async function isLoginThrottled(email: string, ip: string): Promise<boolean> {
  try {
    await redis.connect().catch(() => {});
    const [byEmail, byIp] = await Promise.all(failKeys(email, ip).map((k) => redis.get(k)));
    return Number(byEmail ?? 0) >= LOGIN_MAX_PER_EMAIL || Number(byIp ?? 0) >= LOGIN_MAX_PER_IP;
  } catch {
    return false;
  }
}

async function recordLoginFailure(email: string, ip: string): Promise<void> {
  try {
    await redis.connect().catch(() => {});
    const pipeline = redis.pipeline();
    for (const key of failKeys(email, ip)) {
      pipeline.incr(key);
      // NX so a sustained attack cannot keep extending the window and lock a
      // victim's account out indefinitely — the ban stays bounded.
      pipeline.expire(key, LOGIN_WINDOW_SECONDS, "NX");
    }
    await pipeline.exec();
  } catch {
    // Redis unavailable — throttling is best-effort.
  }
}

async function clearLoginFailures(email: string, ip: string): Promise<void> {
  try {
    await redis.connect().catch(() => {});
    await redis.del(...failKeys(email, ip));
  } catch {
    // Redis unavailable — counters expire on their own.
  }
}

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
        token: { label: "Authentication code", type: "text" },
      },
      async authorize(credentials, request) {
        if (!credentials?.email || !credentials?.password) return null;

        // Counter keys only — the lookup below keeps the caller's original
        // casing so we don't change which account matches.
        const throttleEmail = (credentials.email as string).toLowerCase().trim();
        const ip = getClientIp(request as Request);

        if (await isLoginThrottled(throttleEmail, ip)) throw new TooManyAttempts();

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

        // Always spend the bcrypt time, even when there is no such account, so
        // that a miss is indistinguishable from a wrong password by timing.
        const isValid = await bcrypt.compare(
          credentials.password as string,
          user?.password ?? DECOY_HASH,
        );

        const passwordExpired = !!user?.passwordExpiresAt && user.passwordExpiresAt < new Date();

        if (!user || !user.password || !user.isActive || !isValid || passwordExpired) {
          await recordLoginFailure(throttleEmail, ip);
          return null;
        }

        if (user.twoFactorEnabled && user.twoFactorSecret) {
          const token = (credentials.token as string | undefined)?.trim();
          if (!token) throw new TwoFactorRequired();

          if (!verifyTotp(user.email, user.twoFactorSecret, token)) {
            // Fall back to a single-use backup code, burning it on success.
            const hash = hashBackupCode(token);
            if (!user.twoFactorBackupCodes.includes(hash)) {
              // A second factor is guessable in 10^6 — it needs the same
              // budget as the password, or it is the weakest link.
              await recordLoginFailure(throttleEmail, ip);
              throw new TwoFactorInvalid();
            }

            await db.user.update({
              where: { id: user.id },
              data: { twoFactorBackupCodes: user.twoFactorBackupCodes.filter((h) => h !== hash) },
            });
          }
        }

        await clearLoginFailures(throttleEmail, ip);

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

        let cached: { tokenVersion: number; isActive: boolean } | null = null;
        try {
          await redis.connect().catch(() => {});
          const raw = await redis.get(cacheKey);
          if (raw) cached = JSON.parse(raw);
        } catch {
          // Redis unavailable or holding junk — fall through to the DB, which
          // is the authoritative answer anyway.
        }

        if (cached) {
          if (!cached.isActive || cached.tokenVersion !== token.tokenVersion) return null;
        } else {
          try {
            const dbUser = await db.user.findUnique({
              where: { id: token.id as string },
              select: { tokenVersion: true, isActive: true },
            });
            if (!dbUser || !dbUser.isActive) return null;
            if (dbUser.tokenVersion !== token.tokenVersion) return null;
            await redis
              .setex(
                cacheKey,
                60,
                JSON.stringify({ tokenVersion: dbUser.tokenVersion, isActive: dbUser.isActive }),
              )
              .catch(() => {});
          } catch {
            // Fail CLOSED. If we cannot confirm the session is still valid, a
            // swallowed error would let a revoked or disabled account keep
            // working for as long as the outage lasts.
            return null;
          }
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
