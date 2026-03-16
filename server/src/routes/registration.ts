import { Router } from "express";
import { createHash, randomBytes } from "node:crypto";
import { and, eq } from "drizzle-orm";
import type { Db } from "@stapler/db";
import { agentRegistrations, agents, agentApiKeys, companies } from "@stapler/db";
import { registerAgentSchema } from "@stapler/shared";
import { validate } from "../middleware/validate.js";
import { badRequest, forbidden, notFound, conflict } from "../errors.js";
import { publishCompanyEvent } from "../services/live-events.js";
import { activityLogService } from "../services/activity-log.js";
import { param } from "../params.js";

function generateApiKey(): { raw: string; hash: string } {
  const raw = `stplr_key_${randomBytes(32).toString("hex")}`;
  const hash = createHash("sha256").update(raw).digest("hex");
  return { raw, hash };
}

function generateClaimSecret(): { raw: string; hash: string } {
  const raw = randomBytes(32).toString("hex");
  const hash = createHash("sha256").update(raw).digest("hex");
  return { raw, hash };
}

export function registrationRoutes(db: Db) {
  const router = Router();
  const activity = activityLogService(db);

  // Step 1: Agent requests registration (no auth required)
  router.post("/register", validate(registerAgentSchema), async (req, res) => {
    const { companyId, agentName, openclawGatewayUrl, capabilities, webhookUrl, metadata } = req.body;

    // Verify company exists
    const company = await db
      .select()
      .from(companies)
      .where(eq(companies.id, companyId))
      .then((r) => r[0]);
    if (!company) throw notFound("Company not found");

    const { raw: claimSecret, hash: claimSecretHash } = generateClaimSecret();

    // If auto-approve is enabled, create the agent and key immediately
    if (company.autoApproveRegistrations) {
      const [agent] = await db
        .insert(agents)
        .values({
          companyId,
          name: agentName,
          capabilities,
          webhookUrl,
          adapterType: "openclaw_gateway",
          adapterConfig: openclawGatewayUrl ? { url: openclawGatewayUrl } : {},
          metadata,
        })
        .returning();

      const { raw: apiKey, hash: keyHash } = generateApiKey();
      await db.insert(agentApiKeys).values({
        agentId: agent.id,
        companyId,
        name: "registration-key",
        keyHash,
      });

      const [registration] = await db
        .insert(agentRegistrations)
        .values({
          companyId,
          agentName,
          openclawGatewayUrl,
          capabilities,
          webhookUrl,
          claimSecretHash,
          status: "claimed",
          approvedAgentId: agent.id,
          metadata,
        })
        .returning();

      await activity.log({
        companyId,
        actorType: "system",
        actorId: "auto-registration",
        action: "register_auto_approve",
        entityType: "agent",
        entityId: agent.id,
      });

      publishCompanyEvent(companyId, "registration.approved", {
        registrationId: registration.id,
        agentId: agent.id,
      });

      res.status(201).json({
        registrationId: registration.id,
        status: "claimed",
        agentId: agent.id,
        apiKey,
        endpoints: {
          poll: "/api/agent/poll",
          heartbeat: "/api/agent/heartbeat",
          taskCheckout: "/api/agent/tasks/:id/checkout",
          taskProgress: "/api/agent/tasks/:id/progress",
          taskComplete: "/api/agent/tasks/:id/complete",
          taskFail: "/api/agent/tasks/:id/fail",
          taskComment: "/api/agent/tasks/:id/comment",
        },
      });
      return;
    }

    // Standard flow: create pending registration
    const [registration] = await db
      .insert(agentRegistrations)
      .values({
        companyId,
        agentName,
        openclawGatewayUrl,
        capabilities,
        webhookUrl,
        claimSecretHash,
        metadata,
      })
      .returning();

    publishCompanyEvent(companyId, "registration.pending", {
      registrationId: registration.id,
      agentName,
    });

    res.status(201).json({
      registrationId: registration.id,
      claimSecret,
      status: "pending",
    });
  });

  // Step 2: Agent polls registration status (no auth required, uses registrationId)
  router.get("/register/:id/status", async (req, res) => {
    const registration = await db
      .select()
      .from(agentRegistrations)
      .where(eq(agentRegistrations.id, param(req, "id")))
      .then((r) => r[0]);
    if (!registration) throw notFound("Registration not found");

    res.json({
      registrationId: registration.id,
      status: registration.status,
      decidedAt: registration.decidedAt,
    });
  });

  // Step 3: Board approves/rejects registration
  router.post("/register/:id/approve", async (req, res) => {
    if (req.actor.type !== "board") throw forbidden();

    const registration = await db
      .select()
      .from(agentRegistrations)
      .where(eq(agentRegistrations.id, param(req, "id")))
      .then((r) => r[0]);
    if (!registration) throw notFound("Registration not found");
    if (registration.status !== "pending") throw conflict("Registration already decided");

    // Create the agent
    const [agent] = await db
      .insert(agents)
      .values({
        companyId: registration.companyId,
        name: registration.agentName,
        capabilities: registration.capabilities,
        webhookUrl: registration.webhookUrl,
        adapterType: "openclaw_gateway",
        adapterConfig: registration.openclawGatewayUrl
          ? { url: registration.openclawGatewayUrl }
          : {},
        metadata: registration.metadata,
      })
      .returning();

    await db
      .update(agentRegistrations)
      .set({
        status: "approved",
        approvedAgentId: agent.id,
        decidedByUserId: req.actor.userId,
        decidedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(agentRegistrations.id, param(req, "id")));

    await activity.log({
      companyId: registration.companyId,
      actorType: "board",
      actorId: req.actor.userId || "system",
      action: "approve_registration",
      entityType: "agent_registration",
      entityId: registration.id,
      details: { agentId: agent.id },
    });

    publishCompanyEvent(registration.companyId, "registration.approved", {
      registrationId: registration.id,
      agentId: agent.id,
    });

    res.json({ status: "approved", agentId: agent.id });
  });

  router.post("/register/:id/reject", async (req, res) => {
    if (req.actor.type !== "board") throw forbidden();

    const registration = await db
      .select()
      .from(agentRegistrations)
      .where(eq(agentRegistrations.id, param(req, "id")))
      .then((r) => r[0]);
    if (!registration) throw notFound("Registration not found");
    if (registration.status !== "pending") throw conflict("Registration already decided");

    await db
      .update(agentRegistrations)
      .set({
        status: "rejected",
        decidedByUserId: req.actor.userId,
        decidedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(agentRegistrations.id, param(req, "id")));

    publishCompanyEvent(registration.companyId, "registration.rejected", {
      registrationId: registration.id,
    });

    res.json({ status: "rejected" });
  });

  // Step 4: Agent claims approved registration (exchanges claim secret for API key)
  router.post("/register/:id/claim", async (req, res) => {
    const { claimSecret } = req.body;
    if (!claimSecret) throw badRequest("claimSecret is required");

    const registration = await db
      .select()
      .from(agentRegistrations)
      .where(eq(agentRegistrations.id, param(req, "id")))
      .then((r) => r[0]);
    if (!registration) throw notFound("Registration not found");
    if (registration.status !== "approved") throw conflict("Registration not approved");

    const claimHash = createHash("sha256").update(claimSecret).digest("hex");
    if (claimHash !== registration.claimSecretHash) throw forbidden("Invalid claim secret");

    // Generate API key
    const { raw: apiKey, hash: keyHash } = generateApiKey();
    await db.insert(agentApiKeys).values({
      agentId: registration.approvedAgentId!,
      companyId: registration.companyId,
      name: "registration-key",
      keyHash,
    });

    await db
      .update(agentRegistrations)
      .set({ status: "claimed", updatedAt: new Date() })
      .where(eq(agentRegistrations.id, param(req, "id")));

    res.json({
      agentId: registration.approvedAgentId,
      apiKey,
      endpoints: {
        poll: "/api/agent/poll",
        heartbeat: "/api/agent/heartbeat",
        taskCheckout: "/api/agent/tasks/:id/checkout",
        taskProgress: "/api/agent/tasks/:id/progress",
        taskComplete: "/api/agent/tasks/:id/complete",
        taskFail: "/api/agent/tasks/:id/fail",
        taskComment: "/api/agent/tasks/:id/comment",
      },
    });
  });

  // List registrations (board only)
  router.get("/companies/:companyId/registrations", async (req, res) => {
    if (req.actor.type !== "board") throw forbidden();
    const rows = await db
      .select()
      .from(agentRegistrations)
      .where(eq(agentRegistrations.companyId, param(req, "companyId")));
    res.json(rows);
  });

  return router;
}
