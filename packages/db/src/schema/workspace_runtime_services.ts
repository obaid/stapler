import { pgTable, uuid, text, timestamp, jsonb, index } from "drizzle-orm/pg-core";
import { companies } from "./companies.js";

export const workspaceRuntimeServices = pgTable(
  "workspace_runtime_services",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id").notNull().references(() => companies.id),
    scope: text("scope").notNull(),
    scopeId: text("scope_id").notNull(),
    serviceType: text("service_type").notNull(),
    serviceId: text("service_id").notNull(),
    status: text("status").notNull().default("running"),
    connectionInfo: jsonb("connection_info").$type<Record<string, unknown>>(),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    companyScopeIdx: index("workspace_runtime_services_company_scope_idx").on(
      table.companyId,
      table.scope,
      table.scopeId,
    ),
  }),
);
