import { Router } from "express";
import { eq, desc } from "drizzle-orm";
import type { Db } from "@stapler/db";
import { costEvents } from "@stapler/db";
import { forbidden } from "../errors.js";
import { param } from "../params.js";

export function costRoutes(db: Db) {
  const router = Router();

  router.get("/companies/:companyId/costs", async (req, res) => {
    if (req.actor.type !== "board") throw forbidden();
    const limit = Math.min(Number(req.query.limit) || 50, 500);
    const rows = await db
      .select()
      .from(costEvents)
      .where(eq(costEvents.companyId, param(req, "companyId")))
      .orderBy(desc(costEvents.occurredAt))
      .limit(limit);
    res.json(rows);
  });

  return router;
}
