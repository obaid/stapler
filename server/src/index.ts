/// <reference path="./types/express.d.ts" />
import "dotenv/config";
import { createServer } from "node:http";
import { eq, and } from "drizzle-orm";
import { createDb, authUsers, companies, companyMemberships, instanceUserRoles } from "@stapler/db";
import detectPort from "detect-port";
import { createApp } from "./app.js";
import { loadConfig } from "./config.js";
import { logger } from "./middleware/logger.js";
import { setupLiveEventsWebSocketServer } from "./realtime/live-events-ws.js";
import { webhookDispatcher } from "./services/webhook-dispatcher.js";
import { heartbeatService } from "./services/heartbeat.js";

const LOCAL_BOARD_USER_ID = "local-board";
const LOCAL_BOARD_USER_EMAIL = "local@stapler.local";
const LOCAL_BOARD_USER_NAME = "Board";

async function ensureLocalTrustedBoardPrincipal(db: any): Promise<void> {
  const now = new Date();
  const existingUser = await db
    .select({ id: authUsers.id })
    .from(authUsers)
    .where(eq(authUsers.id, LOCAL_BOARD_USER_ID))
    .then((rows: Array<{ id: string }>) => rows[0] ?? null);

  if (!existingUser) {
    await db.insert(authUsers).values({
      id: LOCAL_BOARD_USER_ID,
      name: LOCAL_BOARD_USER_NAME,
      email: LOCAL_BOARD_USER_EMAIL,
      emailVerified: true,
      image: null,
      createdAt: now,
      updatedAt: now,
    });
  }

  const role = await db
    .select({ id: instanceUserRoles.id })
    .from(instanceUserRoles)
    .where(and(eq(instanceUserRoles.userId, LOCAL_BOARD_USER_ID), eq(instanceUserRoles.role, "instance_admin")))
    .then((rows: Array<{ id: string }>) => rows[0] ?? null);
  if (!role) {
    await db.insert(instanceUserRoles).values({
      userId: LOCAL_BOARD_USER_ID,
      role: "instance_admin",
    });
  }

  const companyRows = await db.select({ id: companies.id }).from(companies);
  for (const company of companyRows) {
    const membership = await db
      .select({ id: companyMemberships.id })
      .from(companyMemberships)
      .where(
        and(
          eq(companyMemberships.companyId, company.id),
          eq(companyMemberships.principalType, "user"),
          eq(companyMemberships.principalId, LOCAL_BOARD_USER_ID),
        ),
      )
      .then((rows: Array<{ id: string }>) => rows[0] ?? null);
    if (membership) continue;
    await db.insert(companyMemberships).values({
      companyId: company.id,
      principalType: "user",
      principalId: LOCAL_BOARD_USER_ID,
      status: "active",
      membershipRole: "owner",
    });
  }
}

async function startServer() {
  const config = loadConfig();

  const databaseUrl = config.databaseUrl ?? "postgres://stapler:stapler@127.0.0.1:5432/stapler";
  const db = createDb(databaseUrl);
  logger.info(`Connected to PostgreSQL`);

  if (config.deploymentMode === "local_trusted") {
    await ensureLocalTrustedBoardPrincipal(db as any);
    logger.info("Ensured local trusted board principal");
  }

  const app = createApp(db as any, { deploymentMode: config.deploymentMode });
  const server = createServer(app as unknown as Parameters<typeof createServer>[0]);

  const listenPort = await detectPort(config.port);
  if (listenPort !== config.port) {
    logger.warn(`Port ${config.port} busy, using ${listenPort}`);
  }

  setupLiveEventsWebSocketServer(server, { deploymentMode: config.deploymentMode });

  // Start webhook retry processor
  const webhooks = webhookDispatcher(db as any);
  webhooks.startRetryProcessor();

  // Start heartbeat reaper
  const hb = heartbeatService(db as any);
  void hb.reapOrphanedRuns().catch((err) => {
    logger.error({ err }, "Startup heartbeat reap failed");
  });
  setInterval(() => {
    void hb.reapOrphanedRuns({ staleThresholdMs: 5 * 60 * 1000 }).catch((err) => {
      logger.error({ err }, "Periodic heartbeat reap failed");
    });
  }, 60_000);

  process.env.STAPLER_LISTEN_HOST = config.host;
  process.env.STAPLER_LISTEN_PORT = String(listenPort);
  process.env.STAPLER_API_URL = `http://${config.host}:${listenPort}`;

  await new Promise<void>((resolve) => {
    server.listen(listenPort, config.host, () => {
      logger.info(`Stapler server listening on http://${config.host}:${listenPort}`);
      logger.info(`Deployment mode: ${config.deploymentMode}`);
      resolve();
    });
  });
}

startServer().catch((err) => {
  logger.error({ err }, "Stapler server failed to start");
  process.exit(1);
});
