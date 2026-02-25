import type { PrismaClient } from "@prisma/client";

interface AuditLogParams {
  contractId: string;
  action: string;
  entity: string;
  entityId?: string;
  summary: string;
  userId: string;
  userName: string;
}

/**
 * Log a contract audit action. Works with both PrismaClient and transaction clients.
 */
export async function logContractAction(
  db: Pick<PrismaClient, "contractAuditLog">,
  params: AuditLogParams,
) {
  return db.contractAuditLog.create({
    data: {
      contractId: params.contractId,
      action: params.action,
      entity: params.entity,
      entityId: params.entityId ?? null,
      summary: params.summary,
      userId: params.userId,
      userName: params.userName,
    },
  });
}
