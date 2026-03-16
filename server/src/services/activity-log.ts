import type { Db } from "@stapler/db";
import { activityLog } from "@stapler/db";

export function activityLogService(db: Db) {
  return {
    async log(params: {
      companyId: string;
      actorType: string;
      actorId: string;
      action: string;
      entityType: string;
      entityId: string;
      agentId?: string;
      runId?: string;
      details?: Record<string, unknown>;
    }) {
      await db.insert(activityLog).values({
        companyId: params.companyId,
        actorType: params.actorType,
        actorId: params.actorId,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId,
        agentId: params.agentId,
        runId: params.runId,
        details: params.details,
      });
    },
  };
}
