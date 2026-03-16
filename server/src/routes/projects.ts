import { Router } from "express";
import { and, eq } from "drizzle-orm";
import type { Db } from "@stapler/db";
import { projects } from "@stapler/db";
import { createProjectSchema, updateProjectSchema } from "@stapler/shared";
import { validate } from "../middleware/validate.js";
import { forbidden, notFound } from "../errors.js";
import { param } from "../params.js";

export function projectRoutes(db: Db) {
  const router = Router();

  router.get("/companies/:companyId/projects", async (req, res) => {
    const rows = await db.select().from(projects).where(eq(projects.companyId, param(req, "companyId")));
    res.json(rows);
  });

  router.get("/companies/:companyId/projects/:projectId", async (req, res) => {
    const row = await db
      .select()
      .from(projects)
      .where(and(eq(projects.id, param(req, "projectId")), eq(projects.companyId, param(req, "companyId"))))
      .then((r) => r[0]);
    if (!row) throw notFound("Project not found");
    res.json(row);
  });

  router.post("/companies/:companyId/projects", validate(createProjectSchema), async (req, res) => {
    if (req.actor.type !== "board") throw forbidden();
    const [row] = await db
      .insert(projects)
      .values({ ...req.body, companyId: param(req, "companyId") })
      .returning();
    res.status(201).json(row);
  });

  router.patch("/companies/:companyId/projects/:projectId", validate(updateProjectSchema), async (req, res) => {
    if (req.actor.type !== "board") throw forbidden();
    const [row] = await db
      .update(projects)
      .set({ ...req.body, updatedAt: new Date() })
      .where(and(eq(projects.id, param(req, "projectId")), eq(projects.companyId, param(req, "companyId"))))
      .returning();
    if (!row) throw notFound("Project not found");
    res.json(row);
  });

  return router;
}
