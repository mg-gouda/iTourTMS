import { getClientIp } from "@/lib/client-ip";
import { db } from "@/server/db";

/**
 * Every partner action that touches money, bookings or documents leaves a row
 * here. Sign-in attempts are written by the auth realm itself; this is the
 * writer for everything after the session exists.
 *
 * It never throws: an audit failure must not roll back the work it describes,
 * and must not be a way to break the portal by filling a disk.
 */
export type PartnerAuditAction =
  | "LOGIN_OK"
  | "LOGIN_FAILED"
  | "LOCKED_OUT"
  | "ACCESS_DENIED"
  | "LOGOUT"
  | "INVITE_SENT"
  | "INVITE_ACCEPTED"
  | "PASSWORD_SET"
  | "PASSWORD_CHANGED"
  | "TWO_FACTOR_ENROLLED"
  | "TWO_FACTOR_RESET"
  | "BACKUP_CODES_VIEWED"
  | "TERMS_ACCEPTED"
  | "USER_CREATED"
  | "USER_UPDATED"
  | "USER_DEACTIVATED"
  | "PORTAL_ENABLED"
  | "PORTAL_DISABLED"
  | "SEARCH_RUN"
  | "BOOKING_CREATED"
  | "BOOKING_AMENDED"
  | "BOOKING_CANCELLED"
  | "DOCUMENT_DOWNLOADED"
  | "MARKUP_CHANGED";

export async function auditPartner(
  action: PartnerAuditAction,
  opts: {
    /** Null when the account has no tenant yet — nothing to attach the row to. */
    companyId: string | null;
    tourOperatorId?: string | null;
    userId?: string | null;
    entityType?: string | null;
    entityId?: string | null;
    /** Pass the incoming request so the row carries the caller's real IP. */
    request?: Request | null;
    ip?: string | null;
    userAgent?: string | null;
    metadata?: Record<string, unknown>;
  },
): Promise<void> {
  if (!opts.companyId) return;
  try {
    await db.partnerAuditEvent.create({
      data: {
        companyId: opts.companyId,
        tourOperatorId: opts.tourOperatorId ?? null,
        userId: opts.userId ?? null,
        action,
        entityType: opts.entityType ?? null,
        entityId: opts.entityId ?? null,
        ip: opts.ip ?? (opts.request ? getClientIp(opts.request) : null),
        userAgent: opts.userAgent ?? opts.request?.headers.get("user-agent") ?? null,
        metadata: (opts.metadata ?? {}) as object,
      },
    });
  } catch {
    // Auditing is a record of work, not a gate on it.
  }
}
