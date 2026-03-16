import { Router } from "express";
import { eq, count, sql } from "drizzle-orm";
import type { Db } from "@stapler/db";
import { agents, issues, projects, costEvents, agentRegistrations } from "@stapler/db";
import { forbidden } from "../errors.js";
import { param } from "../params.js";

export function dashboardRoutes(db: Db) {
  const router = Router();

  router.get("/companies/:companyId/dashboard", async (req, res) => {
    if (req.actor.type !== "board") throw forbidden();
    const companyId = param(req, "companyId");

    const [agentCount, issueCount, projectCount, pendingRegistrations] = await Promise.all([
      db.select({ count: count() }).from(agents).where(eq(agents.companyId, companyId)).then((r) => r[0]?.count ?? 0),
      db.select({ count: count() }).from(issues).where(eq(issues.companyId, companyId)).then((r) => r[0]?.count ?? 0),
      db.select({ count: count() }).from(projects).where(eq(projects.companyId, companyId)).then((r) => r[0]?.count ?? 0),
      db.select({ count: count() }).from(agentRegistrations).where(
        sql`${agentRegistrations.companyId} = ${companyId} AND ${agentRegistrations.status} = 'pending'`,
      ).then((r) => r[0]?.count ?? 0),
    ]);

    res.json({
      agents: agentCount,
      issues: issueCount,
      projects: projectCount,
      pendingRegistrations,
    });
  });

  return router;
}
