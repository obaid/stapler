import { pgTable, uuid, text, timestamp, jsonb, index } from "drizzle-orm/pg-core";
import { companies } from "./companies.js";
import { agents } from "./agents.js";

export const agentConfigRevisions = pgTable(
  "agent_config_revisions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id").notNull().references(() => companies.id),
    agentId: uuid("agent_id").notNull().references(() => agents.id),
    changedByUserId: text("changed_by_user_id"),
    changedByAgentId: uuid("changed_by_agent_id").references(() => agents.id),
    configBefore: jsonb("config_before").$type<Record<string, unknown>>(),
    configAfter: jsonb("config_after").$type<Record<string, unknown>>(),
    changeSummary: text("change_summary"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    companyAgentIdx: index("agent_config_revisions_company_agent_idx").on(table.companyId, table.agentId),
  }),
);
