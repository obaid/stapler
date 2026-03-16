import { Router } from "express";
import { and, eq } from "drizzle-orm";
import type { Db } from "@stapler/db";
import { goals } from "@stapler/db";
import { createGoalSchema, updateGoalSchema } from "@stapler/shared";
import { validate } from "../middleware/validate.js";
import { forbidden, notFound } from "../errors.js";
import { param } from "../params.js";

export function goalRoutes(db: Db) {
  const router = Router();

  router.get("/companies/:companyId/goals", async (req, res) => {
    const rows = await db.select().from(goals).where(eq(goals.companyId, param(req, "companyId")));
    res.json(rows);
  });

  router.get("/companies/:companyId/goals/:goalId", async (req, res) => {
    const row = await db
      .select()
      .from(goals)
      .where(and(eq(goals.id, param(req, "goalId")), eq(goals.companyId, param(req, "companyId"))))
      .then((r) => r[0]);
    if (!row) throw notFound("Goal not found");
    res.json(row);
  });

  router.post("/companies/:companyId/goals", validate(createGoalSchema), async (req, res) => {
    if (req.actor.type !== "board") throw forbidden();
    const [row] = await db
      .insert(goals)
      .values({ ...req.body, companyId: param(req, "companyId") })
      .returning();
    res.status(201).json(row);
  });

  router.patch("/companies/:companyId/goals/:goalId", validate(updateGoalSchema), async (req, res) => {
    if (req.actor.type !== "board") throw forbidden();
    const [row] = await db
      .update(goals)
      .set({ ...req.body, updatedAt: new Date() })
      .where(and(eq(goals.id, param(req, "goalId")), eq(goals.companyId, param(req, "companyId"))))
      .returning();
    if (!row) throw notFound("Goal not found");
    res.json(row);
  });

  return router;
}
