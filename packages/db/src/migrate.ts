import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import { fileURLToPath } from "node:url";

const MIGRATIONS_FOLDER = fileURLToPath(new URL("./migrations", import.meta.url));

async function main() {
  const url = process.env.DATABASE_URL ?? "postgres://stapler:stapler@127.0.0.1:5432/stapler";
  const sql = postgres(url, { max: 1 });
  const db = drizzle(sql);
  console.log("Applying migrations...");
  await migrate(db, { migrationsFolder: MIGRATIONS_FOLDER });
  console.log("Migrations applied successfully");
  await sql.end();
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
