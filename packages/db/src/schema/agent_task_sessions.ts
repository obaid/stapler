import { pgTable, uuid, text, timestamp, jsonb, index, uniqueIndex } from "drizzle-orm/pg-core";
import { companies } from "./companies.js";
import { agents } from "./agents.js";

export const agentTaskSessions = pgTable(
  "agent_task_sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id").notNull().references(() => companies.id),
    agentId: uuid("agent_id").notNull().references(() => agents.id),
    taskKey: text("task_key").notNull(),
    sessionId: text("session_id"),
    sessionParams: jsonb("session_params").$type<Record<string, unknown>>().notNull().default({}),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    agentTaskUq: uniqueIndex("agent_task_sessions_agent_task_uq").on(table.agentId, table.taskKey),
    companyIdx: index("agent_task_sessions_company_idx").on(table.companyId),
  }),
);
