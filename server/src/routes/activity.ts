import { Router } from "express";
import { eq, desc, and } from "drizzle-orm";
import type { Db } from "@stapler/db";
import { activityLog, heartbeatRuns, heartbeatRunEvents } from "@stapler/db";
import { forbidden } from "../errors.js";
import { param } from "../params.js";

export function activityRoutes(db: Db) {
  const router = Router();

  // List company activity
  router.get("/companies/:companyId/activity", async (req, res) => {
    if (req.actor.type !== "board") throw forbidden();
    const limit = Math.min(Number(req.query.limit) || 50, 200);
    const rows = await db
      .select()
      .from(activityLog)
      .where(eq(activityLog.companyId, param(req, "companyId")))
      .orderBy(desc(activityLog.createdAt))
      .limit(limit);
    res.json(rows);
  });

  // List heartbeat runs for company
  router.get("/companies/:companyId/runs", async (req, res) => {
    if (req.actor.type !== "board") throw forbidden();
    const limit = Math.min(Number(req.query.limit) || 50, 200);
    const rows = await db
      .select()
      .from(heartbeatRuns)
      .where(eq(heartbeatRuns.companyId, param(req, "companyId")))
      .orderBy(desc(heartbeatRuns.createdAt))
      .limit(limit);
    res.json(rows);
  });

  // Get run events
  router.get("/companies/:companyId/runs/:runId/events", async (req, res) => {
    const rows = await db
      .select()
      .from(heartbeatRunEvents)
      .where(
        and(
          eq(heartbeatRunEvents.runId, param(req, "runId")),
          eq(heartbeatRunEvents.companyId, param(req, "companyId")),
        ),
      )
      .orderBy(heartbeatRunEvents.seq);
    res.json(rows);
  });

  return router;
}
