import { pgTable, uuid, text, timestamp, integer, index } from "drizzle-orm/pg-core";
import { companies } from "./companies.js";
import { issues } from "./issues.js";

export const issueAttachments = pgTable(
  "issue_attachments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id").notNull().references(() => companies.id),
    issueId: uuid("issue_id").notNull().references(() => issues.id, { onDelete: "cascade" }),
    filename: text("filename").notNull(),
    contentType: text("content_type").notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    storageRef: text("storage_ref").notNull(),
    uploadedByUserId: text("uploaded_by_user_id"),
    uploadedByAgentId: uuid("uploaded_by_agent_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    issueIdx: index("issue_attachments_issue_idx").on(table.issueId),
    companyIdx: index("issue_attachments_company_idx").on(table.companyId),
  }),
);
