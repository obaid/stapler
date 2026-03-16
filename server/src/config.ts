import { z } from "zod";

const configSchema = z.object({
  host: z.string().default("127.0.0.1"),
  port: z.coerce.number().default(3100),
  databaseUrl: z.string().optional(),
  deploymentMode: z.enum(["local_trusted", "authenticated"]).default("local_trusted"),
  serveUi: z.boolean().default(true),
});

export type StaplerConfig = z.infer<typeof configSchema>;

export function loadConfig(): StaplerConfig {
  return configSchema.parse({
    host: process.env.STAPLER_LISTEN_HOST,
    port: process.env.STAPLER_LISTEN_PORT,
    databaseUrl: process.env.DATABASE_URL,
    deploymentMode: process.env.STAPLER_DEPLOYMENT_MODE,
    serveUi: process.env.STAPLER_SERVE_UI !== "false",
  });
}
