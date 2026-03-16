import { eq, and, inArray } from "drizzle-orm";
import type { Db } from "@stapler/db";
import { heartbeatRuns, heartbeatRunEvents, agents } from "@stapler/db";
import { publishCompanyEvent } from "./live-events.js";
import { logger } from "../middleware/logger.js";

export function heartbeatService(db: Db) {
  return {
    async startRun(params: {
      companyId: string;
      agentId: string;
      invocationSource?: string;
      triggerDetail?: string;
    }) {
      const [run] = await db
        .insert(heartbeatRuns)
        .values({
          companyId: params.companyId,
          agentId: params.agentId,
          invocationSource: params.invocationSource ?? "on_demand",
          triggerDetail: params.triggerDetail,
          status: "running",
          startedAt: new Date(),
        })
        .returning();

      await db
        .update(agents)
        .set({ status: "running", lastHeartbeatAt: new Date(), updatedAt: new Date() })
        .where(eq(agents.id, params.agentId));

      publishCompanyEvent(params.companyId, "heartbeat.run.started", {
        runId: run.id,
        agentId: params.agentId,
      });

      return run;
    },

    async completeRun(runId: string, result?: {
      exitCode?: number;
      usageJson?: Record<string, unknown>;
      resultJson?: Record<string, unknown>;
      stdoutExcerpt?: string;
      stderrExcerpt?: string;
    }) {
      const [run] = await db
        .update(heartbeatRuns)
        .set({
          status: "completed",
          finishedAt: new Date(),
          exitCode: result?.exitCode ?? 0,
          usageJson: result?.usageJson,
          resultJson: result?.resultJson,
          stdoutExcerpt: result?.stdoutExcerpt,
          stderrExcerpt: result?.stderrExcerpt,
          updatedAt: new Date(),
        })
        .where(eq(heartbeatRuns.id, runId))
        .returning();

      if (run) {
        await db
          .update(agents)
          .set({ status: "idle", updatedAt: new Date() })
          .where(eq(agents.id, run.agentId));

        publishCompanyEvent(run.companyId, "heartbeat.run.completed", {
          runId: run.id,
          agentId: run.agentId,
        });
      }

      return run;
    },

    async failRun(runId: string, error: string, errorCode?: string) {
      const [run] = await db
        .update(heartbeatRuns)
        .set({
          status: "failed",
          finishedAt: new Date(),
          error,
          errorCode,
          updatedAt: new Date(),
        })
        .where(eq(heartbeatRuns.id, runId))
        .returning();

      if (run) {
        await db
          .update(agents)
          .set({ status: "idle", updatedAt: new Date() })
          .where(eq(agents.id, run.agentId));

        publishCompanyEvent(run.companyId, "heartbeat.run.failed", {
          runId: run.id,
          agentId: run.agentId,
          error,
        });
      }

      return run;
    },

    async addRunEvent(params: {
      companyId: string;
      runId: string;
      agentId: string;
      seq: number;
      eventType: string;
      stream?: string;
      level?: string;
      message?: string;
      payload?: Record<string, unknown>;
    }) {
      await db.insert(heartbeatRunEvents).values(params);
    },

    async reapOrphanedRuns(opts?: { staleThresholdMs?: number }) {
      const threshold = opts?.staleThresholdMs ?? 5 * 60 * 1000;
      const cutoff = new Date(Date.now() - threshold);

      const stale = await db
        .select()
        .from(heartbeatRuns)
        .where(
          inArray(heartbeatRuns.status, ["running", "queued"]),
        );

      let reaped = 0;
      for (const run of stale) {
        if (run.startedAt && run.startedAt < cutoff) {
          await db
            .update(heartbeatRuns)
            .set({
              status: "failed",
              error: "Orphaned run reaped by server",
              errorCode: "ORPHANED",
              finishedAt: new Date(),
              updatedAt: new Date(),
            })
            .where(eq(heartbeatRuns.id, run.id));
          reaped++;
        }
      }

      if (reaped > 0) {
        logger.info({ reaped }, "Reaped orphaned heartbeat runs");
      }

      return { reaped };
    },

    async getRunEvents(runId: string) {
      return db
        .select()
        .from(heartbeatRunEvents)
        .where(eq(heartbeatRunEvents.runId, runId))
        .orderBy(heartbeatRunEvents.seq);
    },
  };
}
