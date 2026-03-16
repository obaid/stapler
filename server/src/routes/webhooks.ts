import { Router } from "express";
import { randomBytes } from "node:crypto";
import { eq, and, desc } from "drizzle-orm";
import type { Db } from "@stapler/db";
import { webhookEndpoints, webhookDeliveries } from "@stapler/db";
import { createWebhookEndpointSchema } from "@stapler/shared";
import { validate } from "../middleware/validate.js";
import { forbidden, notFound } from "../errors.js";
import { param } from "../params.js";

export function webhookRoutes(db: Db) {
  const router = Router();

  // List webhook endpoints
  router.get("/companies/:companyId/webhooks", async (req, res) => {
    if (req.actor.type !== "board") throw forbidden();
    const rows = await db
      .select({
        id: webhookEndpoints.id,
        url: webhookEndpoints.url,
        description: webhookEndpoints.description,
        eventFilter: webhookEndpoints.eventFilter,
        enabled: webhookEndpoints.enabled,
        failureCount: webhookEndpoints.failureCount,
        lastSuccessAt: webhookEndpoints.lastSuccessAt,
        lastFailureAt: webhookEndpoints.lastFailureAt,
        createdAt: webhookEndpoints.createdAt,
      })
      .from(webhookEndpoints)
      .where(eq(webhookEndpoints.companyId, param(req, "companyId")));
    res.json(rows);
  });

  // Create webhook endpoint
  router.post(
    "/companies/:companyId/webhooks",
    validate(createWebhookEndpointSchema),
    async (req, res) => {
      if (req.actor.type !== "board") throw forbidden();
      const secret = randomBytes(32).toString("hex");
      const [row] = await db
        .insert(webhookEndpoints)
        .values({
          companyId: param(req, "companyId"),
          url: req.body.url,
          description: req.body.description,
          eventFilter: req.body.eventFilter ?? [],
          secret,
        })
        .returning();

      res.status(201).json({ ...row, secret });
    },
  );

  // Delete webhook endpoint
  router.delete("/companies/:companyId/webhooks/:webhookId", async (req, res) => {
    if (req.actor.type !== "board") throw forbidden();
    const [row] = await db
      .delete(webhookEndpoints)
      .where(
        and(
          eq(webhookEndpoints.id, param(req, "webhookId")),
          eq(webhookEndpoints.companyId, param(req, "companyId")),
        ),
      )
      .returning();
    if (!row) throw notFound("Webhook endpoint not found");
    res.json({ deleted: true });
  });

  // Toggle webhook enabled/disabled
  router.patch("/companies/:companyId/webhooks/:webhookId", async (req, res) => {
    if (req.actor.type !== "board") throw forbidden();
    const [row] = await db
      .update(webhookEndpoints)
      .set({
        enabled: req.body.enabled,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(webhookEndpoints.id, param(req, "webhookId")),
          eq(webhookEndpoints.companyId, param(req, "companyId")),
        ),
      )
      .returning();
    if (!row) throw notFound("Webhook endpoint not found");
    res.json(row);
  });

  // List webhook deliveries
  router.get("/companies/:companyId/webhooks/:webhookId/deliveries", async (req, res) => {
    if (req.actor.type !== "board") throw forbidden();
    const limit = Math.min(Number(req.query.limit) || 50, 200);
    const rows = await db
      .select()
      .from(webhookDeliveries)
      .where(
        and(
          eq(webhookDeliveries.endpointId, param(req, "webhookId")),
          eq(webhookDeliveries.companyId, param(req, "companyId")),
        ),
      )
      .orderBy(desc(webhookDeliveries.createdAt))
      .limit(limit);
    res.json(rows);
  });

  // Inbound webhook from agents (task update outside poll cycle)
  router.post("/agent/webhook/task-update", async (req, res) => {
    if (req.actor.type !== "agent") throw forbidden("Agent authentication required");
    // Accept task updates via webhook POST
    const { taskId, status } = req.body;
    // This is handled by the existing agent-poll routes, but allows webhook-style push
    res.json({ received: true, taskId, status });
  });

  return router;
}
