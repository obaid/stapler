import { Router } from "express";
import { eq, desc } from "drizzle-orm";
import type { Db } from "@stapler/db";
import { activityLog } from "@stapler/db";
import { forbidden } from "../errors.js";
import { param } from "../params.js";

export function activityRoutes(db: Db) {
  const router = Router();

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

  return router;
}
