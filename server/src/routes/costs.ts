import { Router } from "express";
import { eq, desc } from "drizzle-orm";
import type { Db } from "@stapler/db";
import { costEvents, agents, companies } from "@stapler/db";
import { forbidden, notFound } from "../errors.js";
import { param } from "../params.js";
import { costService } from "../services/costs.js";

export function costRoutes(db: Db) {
  const router = Router();
  const costs = costService(db);

  // List cost events
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

  // Cost summary (budget vs spent)
  router.get("/companies/:companyId/costs/summary", async (req, res) => {
    if (req.actor.type !== "board") throw forbidden();
    const summary = await costs.summary(param(req, "companyId"));
    res.json(summary);
  });

  // Create cost event (agent-facing)
  router.post("/companies/:companyId/cost-events", async (req, res) => {
    const companyId = param(req, "companyId");
    const event = await costs.createEvent({
      companyId,
      agentId: req.body.agentId || req.actor.agentId,
      issueId: req.body.issueId,
      projectId: req.body.projectId,
      provider: req.body.provider,
      model: req.body.model,
      inputTokens: req.body.inputTokens ?? 0,
      outputTokens: req.body.outputTokens ?? 0,
      costCents: req.body.costCents ?? 0,
    });
    res.status(201).json(event);
  });

  // Update company budget
  router.patch("/companies/:companyId/budget", async (req, res) => {
    if (req.actor.type !== "board") throw forbidden();
    const [row] = await db
      .update(companies)
      .set({ budgetMonthlyCents: req.body.budgetMonthlyCents, updatedAt: new Date() })
      .where(eq(companies.id, param(req, "companyId")))
      .returning();
    if (!row) throw notFound("Company not found");
    res.json(row);
  });

  // Update agent budget
  router.patch("/companies/:companyId/agents/:agentId/budget", async (req, res) => {
    if (req.actor.type !== "board") throw forbidden();
    const [row] = await db
      .update(agents)
      .set({ budgetMonthlyCents: req.body.budgetMonthlyCents, updatedAt: new Date() })
      .where(eq(agents.id, param(req, "agentId")))
      .returning();
    if (!row) throw notFound("Agent not found");
    res.json(row);
  });

  return router;
}
