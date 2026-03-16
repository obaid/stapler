import { pgTable, uuid, text, timestamp, integer, boolean, jsonb, index } from "drizzle-orm/pg-core";
import { companies } from "./companies.js";

export const webhookEndpoints = pgTable(
  "webhook_endpoints",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id").notNull().references(() => companies.id),
    url: text("url").notNull(),
    description: text("description"),
    secret: text("secret").notNull(),
    eventFilter: jsonb("event_filter").$type<string[]>().notNull().default([]),
    enabled: boolean("enabled").notNull().default(true),
    failureCount: integer("failure_count").notNull().default(0),
    lastFailureAt: timestamp("last_failure_at", { withTimezone: true }),
    lastSuccessAt: timestamp("last_success_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    companyIdx: index("webhook_endpoints_company_idx").on(table.companyId),
    companyEnabledIdx: index("webhook_endpoints_company_enabled_idx").on(table.companyId, table.enabled),
  }),
);
