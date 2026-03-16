import { Router } from "express";
import { createHash, randomBytes } from "node:crypto";
import { and, eq } from "drizzle-orm";
import type { Db } from "@stapler/db";
import { agents, agentApiKeys } from "@stapler/db";
import { createAgentSchema, updateAgentSchema } from "@stapler/shared";
import { validate } from "../middleware/validate.js";
import { forbidden, notFound } from "../errors.js";
import { activityLogService } from "../services/activity-log.js";
import { param } from "../params.js";

function generateApiKey(): { raw: string; hash: string } {
  const raw = `stplr_key_${randomBytes(32).toString("hex")}`;
  const hash = createHash("sha256").update(raw).digest("hex");
  return { raw, hash };
}

export function agentRoutes(db: Db) {
  const router = Router();
  const activity = activityLogService(db);

  // List agents for a company
  router.get("/companies/:companyId/agents", async (req, res) => {
    const rows = await db.select().from(agents).where(eq(agents.companyId, param(req, "companyId")));
    res.json(rows);
  });

  // Get single agent
  router.get("/companies/:companyId/agents/:agentId", async (req, res) => {
    const row = await db
      .select()
      .from(agents)
      .where(and(eq(agents.id, param(req, "agentId")), eq(agents.companyId, param(req, "companyId"))))
      .then((r) => r[0]);
    if (!row) throw notFound("Agent not found");
    res.json(row);
  });

  // Create agent
  router.post("/companies/:companyId/agents", validate(createAgentSchema), async (req, res) => {
    if (req.actor.type !== "board") throw forbidden();
    const [row] = await db
      .insert(agents)
      .values({ ...req.body, companyId: param(req, "companyId") })
      .returning();
    await activity.log({
      companyId: param(req, "companyId"),
      actorType: req.actor.type,
      actorId: req.actor.userId || "system",
      action: "create",
      entityType: "agent",
      entityId: row.id,
    });
    res.status(201).json(row);
  });

  // Update agent
  router.patch("/companies/:companyId/agents/:agentId", validate(updateAgentSchema), async (req, res) => {
    if (req.actor.type !== "board") throw forbidden();
    const [row] = await db
      .update(agents)
      .set({ ...req.body, updatedAt: new Date() })
      .where(and(eq(agents.id, param(req, "agentId")), eq(agents.companyId, param(req, "companyId"))))
      .returning();
    if (!row) throw notFound("Agent not found");
    res.json(row);
  });

  // Delete agent
  router.delete("/companies/:companyId/agents/:agentId", async (req, res) => {
    if (req.actor.type !== "board") throw forbidden();
    const [row] = await db
      .delete(agents)
      .where(and(eq(agents.id, param(req, "agentId")), eq(agents.companyId, param(req, "companyId"))))
      .returning();
    if (!row) throw notFound("Agent not found");
    res.json({ deleted: true });
  });

  // Create API key for agent
  router.post("/companies/:companyId/agents/:agentId/keys", async (req, res) => {
    if (req.actor.type !== "board") throw forbidden();
    const agent = await db
      .select()
      .from(agents)
      .where(and(eq(agents.id, param(req, "agentId")), eq(agents.companyId, param(req, "companyId"))))
      .then((r) => r[0]);
    if (!agent) throw notFound("Agent not found");

    const { raw, hash } = generateApiKey();
    const [key] = await db
      .insert(agentApiKeys)
      .values({
        agentId: param(req, "agentId"),
        companyId: param(req, "companyId"),
        name: req.body.name || "default",
        keyHash: hash,
      })
      .returning();

    res.status(201).json({ id: key.id, name: key.name, key: raw, createdAt: key.createdAt });
  });

  // List API keys for agent
  router.get("/companies/:companyId/agents/:agentId/keys", async (req, res) => {
    const keys = await db
      .select({
        id: agentApiKeys.id,
        name: agentApiKeys.name,
        lastUsedAt: agentApiKeys.lastUsedAt,
        revokedAt: agentApiKeys.revokedAt,
        createdAt: agentApiKeys.createdAt,
      })
      .from(agentApiKeys)
      .where(
        and(eq(agentApiKeys.agentId, param(req, "agentId")), eq(agentApiKeys.companyId, param(req, "companyId"))),
      );
    res.json(keys);
  });

  // Revoke API key
  router.delete("/companies/:companyId/agents/:agentId/keys/:keyId", async (req, res) => {
    if (req.actor.type !== "board") throw forbidden();
    const [key] = await db
      .update(agentApiKeys)
      .set({ revokedAt: new Date() })
      .where(eq(agentApiKeys.id, param(req, "keyId")))
      .returning();
    if (!key) throw notFound("Key not found");
    res.json({ revoked: true });
  });

  return router;
}
