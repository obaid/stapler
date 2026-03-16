import { pgTable, uuid, text, timestamp, jsonb, index } from "drizzle-orm/pg-core";
import { companies } from "./companies.js";
import { agents } from "./agents.js";

export const agentRegistrations = pgTable(
  "agent_registrations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id").notNull().references(() => companies.id),
    agentName: text("agent_name").notNull(),
    openclawGatewayUrl: text("openclaw_gateway_url"),
    capabilities: text("capabilities"),
    webhookUrl: text("webhook_url"),
    claimSecretHash: text("claim_secret_hash").notNull(),
    status: text("status").notNull().default("pending"),
    approvedAgentId: uuid("approved_agent_id").references(() => agents.id),
    decidedByUserId: text("decided_by_user_id"),
    decidedAt: timestamp("decided_at", { withTimezone: true }),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    companyStatusIdx: index("agent_registrations_company_status_idx").on(table.companyId, table.status),
  }),
);
