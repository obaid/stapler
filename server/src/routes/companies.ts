import { Router } from "express";
import { eq } from "drizzle-orm";
import type { Db } from "@stapler/db";
import { companies } from "@stapler/db";
import { createCompanySchema, updateCompanySchema } from "@stapler/shared";
import { validate } from "../middleware/validate.js";
import { forbidden, notFound } from "../errors.js";
import { activityLogService } from "../services/activity-log.js";
import { param } from "../params.js";

export function companyRoutes(db: Db) {
  const router = Router();
  const activity = activityLogService(db);

  router.get("/", async (req, res) => {
    if (req.actor.type !== "board") throw forbidden();
    const rows = await db.select().from(companies);
    res.json(rows);
  });

  router.get("/:id", async (req, res) => {
    const row = await db.select().from(companies).where(eq(companies.id, param(req, "id"))).then((r) => r[0]);
    if (!row) throw notFound("Company not found");
    res.json(row);
  });

  router.post("/", validate(createCompanySchema), async (req, res) => {
    if (req.actor.type !== "board") throw forbidden();
    const [row] = await db.insert(companies).values(req.body).returning();
    await activity.log({
      companyId: row.id,
      actorType: req.actor.type,
      actorId: req.actor.userId || "system",
      action: "create",
      entityType: "company",
      entityId: row.id,
    });
    res.status(201).json(row);
  });

  router.patch("/:id", validate(updateCompanySchema), async (req, res) => {
    if (req.actor.type !== "board") throw forbidden();
    const [row] = await db.update(companies).set({ ...req.body, updatedAt: new Date() }).where(eq(companies.id, param(req, "id"))).returning();
    if (!row) throw notFound("Company not found");
    res.json(row);
  });

  router.delete("/:id", async (req, res) => {
    if (req.actor.type !== "board") throw forbidden();
    const [row] = await db.delete(companies).where(eq(companies.id, param(req, "id"))).returning();
    if (!row) throw notFound("Company not found");
    res.json({ deleted: true });
  });

  return router;
}
