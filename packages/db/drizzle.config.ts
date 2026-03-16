import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "postgresql",
  schema: "dist/schema/*.js",
  out: "src/migrations",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "postgres://stapler:stapler@127.0.0.1:5432/stapler",
  },
});
