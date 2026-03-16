import { drizzle as drizzlePg } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema/index.js";

export function createDb(url: string) {
  const sql = postgres(url);
  return drizzlePg(sql, { schema });
}

export type Db = ReturnType<typeof createDb>;
