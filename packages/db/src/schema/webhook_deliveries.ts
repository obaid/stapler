import { pgTable, uuid, text, timestamp, integer, jsonb, index } from "drizzle-orm/pg-core";
import { companies } from "./companies.js";
import { webhookEndpoints } from "./webhook_endpoints.js";

export const webhookDeliveries = pgTable(
  "webhook_deliveries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id").notNull().references(() => companies.id),
    endpointId: uuid("endpoint_id").notNull().references(() => webhookEndpoints.id),
    eventType: text("event_type").notNull(),
    payload: jsonb("payload").$type<Record<string, unknown>>().notNull(),
    status: text("status").notNull().default("pending"),
    httpStatus: integer("http_status"),
    responseExcerpt: text("response_excerpt"),
    attempts: integer("attempts").notNull().default(0),
    maxAttempts: integer("max_attempts").notNull().default(3),
    nextRetryAt: timestamp("next_retry_at", { withTimezone: true }),
    deliveredAt: timestamp("delivered_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    companyIdx: index("webhook_deliveries_company_idx").on(table.companyId),
    endpointStatusIdx: index("webhook_deliveries_endpoint_status_idx").on(table.endpointId, table.status),
    nextRetryIdx: index("webhook_deliveries_next_retry_idx").on(table.status, table.nextRetryAt),
  }),
);
