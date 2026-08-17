import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";

import { getClientIp } from "@/lib/client-ip";
import { hashPassword, isStaleHash } from "@/lib/password";
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

/**
 * Three tiers, so throttling an attacker cannot be used to lock out a victim.
 *
 * The tight limit is per email+IP: it stops someone hammering one account, but
 * only from the address doing the hammering, so the real owner signing in from
 * anywhere else is unaffected. The email-only counter stays as a backstop
 * against a distributed attack, but set high enough that forging it into an
 * account freeze costs 50 failures spread across many addresses. The IP tier
 * catches spraying and is loose because an office shares one NAT address.
 */
const LOGIN_LIMITS = {
  pair: 10,
  email: 50,
  ip: 100,
} as const;

/**
 * A real bcrypt hash of a random string, compared against when the account does
 * not exist so a miss costs the same wall-clock time as a wrong password.
 * Without it, response latency tells an attacker which emails are registered.
 */
const DECOY_HASH = "$2b$12$uqQOQd3uexMOdKfmgfvTeOASA19/W33yLUSeWY42zjkiyWQeu/PSe";

/**
 * The counters to bump, each with the ceiling that trips it. The IP-bearing
 * tiers are skipped when no public address could be established, so a proxy
 * misconfiguration degrades to the email backstop instead of collapsing every
 * caller into one bucket and locking out the whole customer.
 */
function failCounters(email: string, ip: string | null): { key: string; limit: number }[] {
  return [
    { key: `login_fail:email:${email}`, limit: LOGIN_LIMITS.email },
    ...(ip
      ? [
          { key: `login_fail:pair:${email}:${ip}`, limit: LOGIN_LIMITS.pair },
          { key: `login_fail:ip:${ip}`, limit: LOGIN_LIMITS.ip },
        ]
      : []),
  ];
}

const failKeys = (email: string, ip: string | null) =>
  failCounters(email, ip).map((c) => c.key);

/**
 * Fixed-window failure counters. Fails OPEN: Redis being down must not lock
 * every user out of the product.
 */
async function isLoginThrottled(email: string, ip: string | null): Promise<boolean> {
  try {
    await redis.connect().catch(() => {});
    const counters = failCounters(email, ip);
    const counts = await Promise.all(counters.map((c) => redis.get(c.key)));
    return counters.some((c, i) => Number(counts[i] ?? 0) >= c.limit);
  } catch {
    return false;
  }
}

async function recordLoginFailure(email: string, ip: string | null): Promise<void> {
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

async function clearLoginFailures(email: string, ip: string | null): Promise<void> {
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

        // Credentials are correct and we are holding the plaintext exactly once
        // — the only moment an old hash can be upgraded. Never let this fail a
        // login that has already been authenticated.
        if (isStaleHash(user.password)) {
          try {
            const upgraded = await hashPassword(credentials.password as string);
            await db.user.update({ where: { id: user.id }, data: { password: upgraded } });
          } catch {
            // Next sign-in will try again.
          }
        }

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
