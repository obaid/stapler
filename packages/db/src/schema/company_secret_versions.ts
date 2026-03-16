import { pgTable, uuid, text, timestamp, integer, index } from "drizzle-orm/pg-core";
import { companies } from "./companies.js";
import { companySecrets } from "./company_secrets.js";

export const companySecretVersions = pgTable(
  "company_secret_versions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id").notNull().references(() => companies.id),
    secretId: uuid("secret_id").notNull().references(() => companySecrets.id),
    version: integer("version").notNull(),
    encryptedValue: text("encrypted_value").notNull(),
    createdByUserId: text("created_by_user_id"),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    secretVersionIdx: index("company_secret_versions_secret_version_idx").on(table.secretId, table.version),
    companyIdx: index("company_secret_versions_company_idx").on(table.companyId),
  }),
);
