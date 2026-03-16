import { pgTable, uuid, text, timestamp, integer, jsonb, uniqueIndex } from "drizzle-orm/pg-core";
import { companies } from "./companies.js";
import { agents } from "./agents.js";

export const agentRuntimeState = pgTable(
  "agent_runtime_state",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id").notNull().references(() => companies.id),
    agentId: uuid("agent_id").notNull().references(() => agents.id),
    sessionId: text("session_id"),
    sessionParams: jsonb("session_params").$type<Record<string, unknown>>().notNull().default({}),
    taskKey: text("task_key"),
    totalInputTokens: integer("total_input_tokens").notNull().default(0),
    totalOutputTokens: integer("total_output_tokens").notNull().default(0),
    totalCostCents: integer("total_cost_cents").notNull().default(0),
    lastError: text("last_error"),
    lastErrorAt: timestamp("last_error_at", { withTimezone: true }),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    companyAgentUq: uniqueIndex("agent_runtime_state_company_agent_uq").on(table.companyId, table.agentId),
  }),
);
