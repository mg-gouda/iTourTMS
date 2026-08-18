import bcrypt from "bcryptjs";
import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";

import { PARTNER_AUTH_BASE_PATH } from "@/lib/b2b/limits";
import { getClientIp } from "@/lib/client-ip";
import { hashBackupCode, verifyTotp } from "@/lib/totp";
import { db } from "@/server/db";
import { redis } from "@/server/redis";

/**
 * The B2B partner portal's own authentication realm.
 *
 * Partners are ordinary `User` rows carrying `tourOperatorId`, but they must
 * never share a session with staff. The portal lives at /b2b on the same
 * domain, so the staff cookie is still *sent* on partner requests — which is
 * exactly why this realm exists and why every gate demands `realm: "partner"`
 * rather than accepting any valid session.
 *
 * Sessions: 15 minutes idle, 4 hours absolute.
 * Logins: 3 failures, then a 30-minute lockout on the account.
 */

export const PARTNER_SESSION_COOKIE = "itms-partner.session-token";
export const PARTNER_IDLE_SECONDS = 15 * 60;
export const PARTNER_MAX_SESSION_SECONDS = 4 * 60 * 60;
export const PARTNER_MAX_FAILURES = 3;
export const PARTNER_LOCKOUT_MINUTES = 30;

/** Password was right but this account still needs a TOTP code. */
class PartnerTwoFactorRequired extends CredentialsSignin {
  code = "2fa_required";
}

/** TOTP code or backup code was wrong. */
class PartnerTwoFactorInvalid extends CredentialsSignin {
  code = "2fa_invalid";
}

/** 2FA is mandatory here and this account has not enrolled yet. */
class PartnerEnrolmentRequired extends CredentialsSignin {
  code = "2fa_enrolment_required";
}

/** Account is locked after repeated failures, or throttled by IP. */
class PartnerLockedOut extends CredentialsSignin {
  code = "locked_out";
}

/** The account exists but may not use the portal. */
class PartnerAccessDenied extends CredentialsSignin {
  code = "portal_access_denied";
}

/**
 * Per-IP spray protection, separate from the per-account lockout so that
 * hammering one account cannot be used to freeze a partner out from elsewhere.
 */
const IP_WINDOW_SECONDS = 15 * 60;
const IP_MAX_FAILURES = 30;

export async function partnerIpThrottled(ip: string | null): Promise<boolean> {
  if (!ip) return false;
  try {
    await redis.connect().catch(() => {});
    const raw = await redis.get(`b2b:fail:ip:${ip}`);
    return raw !== null && Number(raw) >= IP_MAX_FAILURES;
  } catch {
    return false; // Redis down must not lock every partner out
  }
}

export async function recordPartnerIpFailure(ip: string | null): Promise<void> {
  if (!ip) return;
  try {
    await redis.connect().catch(() => {});
    const key = `b2b:fail:ip:${ip}`;
    const n = await redis.incr(key);
    if (n === 1) await redis.expire(key, IP_WINDOW_SECONDS);
  } catch {
    // best effort
  }
}

/** Writes the audit row every sign-in attempt leaves behind. */
async function auditLogin(
  action: "LOGIN_OK" | "LOGIN_FAILED" | "LOCKED_OUT" | "ACCESS_DENIED",
  opts: {
    companyId?: string | null;
    tourOperatorId?: string | null;
    userId?: string | null;
    ip?: string | null;
    userAgent?: string | null;
    metadata?: Record<string, unknown>;
  },
): Promise<void> {
  if (!opts.companyId) return; // audit is company-scoped; nothing to attach to
  try {
    await db.partnerAuditEvent.create({
      data: {
        companyId: opts.companyId,
        tourOperatorId: opts.tourOperatorId ?? null,
        userId: opts.userId ?? null,
        action,
        ip: opts.ip ?? null,
        userAgent: opts.userAgent ?? null,
        metadata: (opts.metadata ?? {}) as object,
      },
    });
  } catch {
    // auditing must never block a login decision
  }
}

export const {
  handlers: partnerHandlers,
  auth: partnerAuth,
  signIn: partnerSignIn,
  signOut: partnerSignOut,
} = NextAuth({
  // Mounted away from /api/auth so the two realms never share an endpoint.
  basePath: PARTNER_AUTH_BASE_PATH,
  session: { strategy: "jwt", maxAge: PARTNER_MAX_SESSION_SECONDS },
  pages: { signIn: "/b2b/login" },
  cookies: {
    // A distinct name is what keeps the two realms apart on one domain.
    sessionToken: {
      name: PARTNER_SESSION_COOKIE,
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
      },
    },
  },
  providers: [
    Credentials({
      // The id decides the callback path and what signIn() must be called with;
      // it does not default from `name`.
      id: "partner-credentials",
      name: "partner-credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        token: { label: "Authentication code", type: "text" },
      },
      async authorize(credentials, request) {
        const email = (credentials?.email as string | undefined)?.trim().toLowerCase();
        const password = credentials?.password as string | undefined;
        if (!email || !password) return null;

        const ip = getClientIp(request as unknown as Request);
        const userAgent = (request as unknown as Request)?.headers?.get("user-agent") ?? null;

        if (await partnerIpThrottled(ip)) throw new PartnerLockedOut();

        // Exact match first so the unique index does the work; the
        // case-insensitive retry only runs on a miss, and exists because an
        // address typed with different capitalisation is the same account —
        // failing it looks to the partner like a wrong password.
        const userWhere = { email };
        const user = await db.user.findFirst({
          where: {
            OR: [userWhere, { email: { equals: email, mode: "insensitive" as const } }],
          },
          select: {
            id: true,
            email: true,
            name: true,
            password: true,
            isActive: true,
            companyId: true,
            tourOperatorId: true,
            partnerRole: true,
            failedLoginCount: true,
            lockedUntil: true,
            mustSetPassword: true,
            termsVersion: true,
            twoFactorEnabled: true,
            twoFactorSecret: true,
            twoFactorBackupCodes: true,
            tourOperator: { select: { id: true, active: true, portalEnabled: true } },
          },
        });

        // Unknown address: fail identically to a wrong password, so the portal
        // cannot be used to discover who holds an account.
        if (!user || !user.password) {
          await recordPartnerIpFailure(ip);
          return null;
        }

        const denied =
          !user.isActive ||
          !user.tourOperatorId ||
          !user.partnerRole ||
          !user.tourOperator?.active ||
          !user.tourOperator?.portalEnabled;

        if (denied) {
          await recordPartnerIpFailure(ip);
          await auditLogin("ACCESS_DENIED", {
            companyId: user.companyId,
            tourOperatorId: user.tourOperatorId,
            userId: user.id,
            ip,
            userAgent,
            metadata: { reason: !user.tourOperatorId ? "not_a_partner" : "portal_disabled_or_inactive" },
          });
          throw new PartnerAccessDenied();
        }

        if (user.lockedUntil && user.lockedUntil > new Date()) {
          await auditLogin("LOCKED_OUT", {
            companyId: user.companyId,
            tourOperatorId: user.tourOperatorId,
            userId: user.id,
            ip,
            userAgent,
            metadata: { until: user.lockedUntil.toISOString() },
          });
          throw new PartnerLockedOut();
        }

        const passwordOk = await bcrypt.compare(password, user.password);
        if (!passwordOk) {
          const failures = user.failedLoginCount + 1;
          const locked = failures >= PARTNER_MAX_FAILURES;
          await db.user.update({
            where: { id: user.id },
            data: {
              failedLoginCount: locked ? 0 : failures,
              lockedUntil: locked
                ? new Date(Date.now() + PARTNER_LOCKOUT_MINUTES * 60_000)
                : user.lockedUntil,
            },
          });
          await recordPartnerIpFailure(ip);
          await auditLogin(locked ? "LOCKED_OUT" : "LOGIN_FAILED", {
            companyId: user.companyId,
            tourOperatorId: user.tourOperatorId,
            userId: user.id,
            ip,
            userAgent,
            metadata: { failures },
          });
          if (locked) throw new PartnerLockedOut();
          return null;
        }

        // 2FA is mandatory in this realm: an un-enrolled account cannot sign in,
        // it is sent to enrolment instead.
        if (!user.twoFactorEnabled || !user.twoFactorSecret) {
          throw new PartnerEnrolmentRequired();
        }

        const submitted = (credentials?.token as string | undefined)?.trim();
        if (!submitted) throw new PartnerTwoFactorRequired();

        if (!verifyTotp(user.email, user.twoFactorSecret, submitted)) {
          // Fall back to a single-use backup code, burning it on success.
          const hash = hashBackupCode(submitted);
          if (!user.twoFactorBackupCodes.includes(hash)) {
            await recordPartnerIpFailure(ip);
            await auditLogin("LOGIN_FAILED", {
              companyId: user.companyId,
              tourOperatorId: user.tourOperatorId,
              userId: user.id,
              ip,
              userAgent,
              metadata: { stage: "2fa" },
            });
            throw new PartnerTwoFactorInvalid();
          }
          await db.user.update({
            where: { id: user.id },
            data: {
              twoFactorBackupCodes: user.twoFactorBackupCodes.filter((h) => h !== hash),
            },
          });
        }

        await db.user.update({
          where: { id: user.id },
          data: { failedLoginCount: 0, lockedUntil: null },
        });
        await auditLogin("LOGIN_OK", {
          companyId: user.companyId,
          tourOperatorId: user.tourOperatorId,
          userId: user.id,
          ip,
          userAgent,
        });

        return {
          id: user.id,
          email: user.email,
          name: user.name,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      const now = Math.floor(Date.now() / 1000);

      if (user) {
        const dbUser = await db.user.findUnique({
          where: { id: user.id as string },
          select: {
            companyId: true,
            tourOperatorId: true,
            partnerRole: true,
            mustSetPassword: true,
            termsVersion: true,
            tokenVersion: true,
          },
        });
        token.id = user.id;
        token.realm = "partner";
        token.companyId = dbUser?.companyId ?? null;
        token.tourOperatorId = dbUser?.tourOperatorId ?? null;
        token.partnerRole = dbUser?.partnerRole ?? null;
        token.mustSetPassword = dbUser?.mustSetPassword ?? false;
        token.termsVersion = dbUser?.termsVersion ?? null;
        token.tokenVersion = dbUser?.tokenVersion ?? 0;
        token.lastSeen = now;
        return token;
      }

      // A token minted by the staff realm must never be honoured here.
      if (token.realm !== "partner") return null;

      // Idle timeout: 15 minutes without a request ends the session.
      const lastSeen = typeof token.lastSeen === "number" ? token.lastSeen : now;
      if (now - lastSeen > PARTNER_IDLE_SECONDS) return null;
      token.lastSeen = now;

      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.companyId = token.companyId as string | null;
        session.user.tourOperatorId = token.tourOperatorId as string | null;
        // Partner-only claims the shared Session type does not declare
        const claims = session.user as unknown as Record<string, unknown>;
        claims.partnerRole = token.partnerRole ?? null;
        claims.realm = token.realm ?? null;
        claims.mustSetPassword = token.mustSetPassword ?? false;
        claims.termsVersion = token.termsVersion ?? null;
        // Partner sessions carry no staff roles or permissions, by construction.
        session.user.roles = [];
        session.user.permissions = [];
      }
      return session;
    },
  },
});
