import { eq, sql } from "drizzle-orm";
import type { Db } from "@stapler/db";
import { costEvents, agents, companies } from "@stapler/db";
import { logger } from "../middleware/logger.js";

export function costService(db: Db) {
  return {
    async createEvent(params: {
      companyId: string;
      agentId: string;
      issueId?: string;
      projectId?: string;
      goalId?: string;
      billingCode?: string;
      provider: string;
      model: string;
      inputTokens: number;
      outputTokens: number;
      costCents: number;
    }) {
      const [event] = await db
        .insert(costEvents)
        .values({
          ...params,
          occurredAt: new Date(),
        })
        .returning();

      // Update agent spent
      await db
        .update(agents)
        .set({
          spentMonthlyCents: sql`${agents.spentMonthlyCents} + ${params.costCents}`,
          updatedAt: new Date(),
        })
        .where(eq(agents.id, params.agentId));

      // Update company spent
      await db
        .update(companies)
        .set({
          spentMonthlyCents: sql`${companies.spentMonthlyCents} + ${params.costCents}`,
          updatedAt: new Date(),
        })
        .where(eq(companies.id, params.companyId));

      // Check budget and pause agent if over
      const agent = await db
        .select()
        .from(agents)
        .where(eq(agents.id, params.agentId))
        .then((r) => r[0]);

      if (agent && agent.budgetMonthlyCents > 0 && agent.spentMonthlyCents >= agent.budgetMonthlyCents) {
        await db
          .update(agents)
          .set({ status: "paused", updatedAt: new Date() })
          .where(eq(agents.id, params.agentId));
        logger.warn(
          { agentId: params.agentId, spent: agent.spentMonthlyCents, budget: agent.budgetMonthlyCents },
          "Agent paused: monthly budget exceeded",
        );
      }

      return event;
    },

    async summary(companyId: string) {
      const company = await db
        .select()
        .from(companies)
        .where(eq(companies.id, companyId))
        .then((r) => r[0]);

      const agentRows = await db
        .select({
          id: agents.id,
          name: agents.name,
          budgetMonthlyCents: agents.budgetMonthlyCents,
          spentMonthlyCents: agents.spentMonthlyCents,
        })
        .from(agents)
        .where(eq(agents.companyId, companyId));

      return {
        company: {
          budgetMonthlyCents: company?.budgetMonthlyCents ?? 0,
          spentMonthlyCents: company?.spentMonthlyCents ?? 0,
        },
        agents: agentRows,
      };
    },
  };
}
