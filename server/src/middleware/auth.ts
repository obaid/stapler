import { createHash } from "node:crypto";
import type { RequestHandler } from "express";
import { and, eq, isNull } from "drizzle-orm";
import type { Db } from "@stapler/db";
import { agentApiKeys, agents, companyMemberships, instanceUserRoles } from "@stapler/db";
import type { DeploymentMode } from "@stapler/shared";

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function actorMiddleware(db: Db, opts: { deploymentMode: DeploymentMode }): RequestHandler {
  return async (req, _res, next) => {
    req.actor =
      opts.deploymentMode === "local_trusted"
        ? { type: "board", userId: "local-board", isInstanceAdmin: true, source: "local_implicit" }
        : { type: "none", source: "none" };

    const runIdHeader = req.header("x-stapler-run-id");

    const authHeader = req.header("authorization");
    if (!authHeader?.toLowerCase().startsWith("bearer ")) {
      if (runIdHeader) req.actor.runId = runIdHeader;
      next();
      return;
    }

    const token = authHeader.slice("bearer ".length).trim();
    if (!token) {
      next();
      return;
    }

    const tokenHash = hashToken(token);
    const key = await db
      .select()
      .from(agentApiKeys)
      .where(and(eq(agentApiKeys.keyHash, tokenHash), isNull(agentApiKeys.revokedAt)))
      .then((rows) => rows[0] ?? null);

    if (!key) {
      next();
      return;
    }

    await db
      .update(agentApiKeys)
      .set({ lastUsedAt: new Date() })
      .where(eq(agentApiKeys.id, key.id));

    const agentRecord = await db
      .select()
      .from(agents)
      .where(eq(agents.id, key.agentId))
      .then((rows) => rows[0] ?? null);

    if (!agentRecord || agentRecord.status === "terminated" || agentRecord.status === "pending_approval") {
      next();
      return;
    }

    req.actor = {
      type: "agent",
      agentId: key.agentId,
      companyId: key.companyId,
      keyId: key.id,
      runId: runIdHeader || undefined,
      source: "agent_key",
    };

    next();
  };
}

export function requireBoard(req: Express.Request): boolean {
  return req.actor.type === "board";
}

export function requireAgent(req: Express.Request): boolean {
  return req.actor.type === "agent";
}
