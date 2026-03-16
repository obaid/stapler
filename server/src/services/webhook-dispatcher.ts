import { createHmac } from "node:crypto";
import { eq, and, lte } from "drizzle-orm";
import type { Db } from "@stapler/db";
import { webhookEndpoints, webhookDeliveries } from "@stapler/db";
import { logger } from "../middleware/logger.js";

const RETRY_DELAYS = [10_000, 60_000, 300_000]; // 10s, 60s, 5min

function signPayload(secret: string, payload: string): string {
  return createHmac("sha256", secret).update(payload).digest("hex");
}

export function webhookDispatcher(db: Db) {
  let retryTimerActive = false;

  async function dispatch(companyId: string, eventType: string, data: unknown) {
    // Find all enabled endpoints for this company that match the event
    const endpoints = await db
      .select()
      .from(webhookEndpoints)
      .where(and(eq(webhookEndpoints.companyId, companyId), eq(webhookEndpoints.enabled, true)));

    for (const endpoint of endpoints) {
      // Check event filter
      const filter = endpoint.eventFilter as string[];
      if (filter && filter.length > 0 && !filter.includes(eventType)) {
        continue;
      }

      const payload = JSON.stringify({ event: eventType, data, timestamp: new Date().toISOString() });

      // Create delivery record
      const [delivery] = await db
        .insert(webhookDeliveries)
        .values({
          companyId,
          endpointId: endpoint.id,
          eventType,
          payload: { event: eventType, data, timestamp: new Date().toISOString() } as Record<string, unknown>,
          status: "pending",
          maxAttempts: 3,
        })
        .returning();

      // Attempt immediate delivery
      await attemptDelivery(delivery.id, endpoint.url, endpoint.secret, payload);
    }
  }

  async function attemptDelivery(
    deliveryId: string,
    url: string,
    secret: string,
    payload: string,
  ) {
    try {
      const signature = signPayload(secret, payload);

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Stapler-Signature": signature,
          "X-Stapler-Event": JSON.parse(payload).event,
        },
        body: payload,
        signal: AbortSignal.timeout(10_000),
      });

      const responseText = await response.text().catch(() => "");
      const excerpt = responseText.slice(0, 500);

      if (response.ok) {
        await db
          .update(webhookDeliveries)
          .set({
            status: "delivered",
            httpStatus: response.status,
            responseExcerpt: excerpt,
            attempts: 1,
            deliveredAt: new Date(),
          })
          .where(eq(webhookDeliveries.id, deliveryId));

        // Reset failure count on success
        const delivery = await db
          .select()
          .from(webhookDeliveries)
          .where(eq(webhookDeliveries.id, deliveryId))
          .then((r) => r[0]);
        if (delivery) {
          await db
            .update(webhookEndpoints)
            .set({ failureCount: 0, lastSuccessAt: new Date(), updatedAt: new Date() })
            .where(eq(webhookEndpoints.id, delivery.endpointId));
        }
      } else {
        await scheduleRetry(deliveryId, response.status, excerpt);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown error";
      await scheduleRetry(deliveryId, null, message.slice(0, 500));
    }
  }

  async function scheduleRetry(
    deliveryId: string,
    httpStatus: number | null,
    responseExcerpt: string,
  ) {
    const delivery = await db
      .select()
      .from(webhookDeliveries)
      .where(eq(webhookDeliveries.id, deliveryId))
      .then((r) => r[0]);

    if (!delivery) return;

    const attempts = delivery.attempts + 1;

    if (attempts >= delivery.maxAttempts) {
      await db
        .update(webhookDeliveries)
        .set({
          status: "dead_letter",
          httpStatus,
          responseExcerpt,
          attempts,
        })
        .where(eq(webhookDeliveries.id, deliveryId));

      // Increment endpoint failure count
      await db
        .update(webhookEndpoints)
        .set({
          failureCount: delivery.attempts + 1,
          lastFailureAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(webhookEndpoints.id, delivery.endpointId));

      logger.warn({ deliveryId, endpointId: delivery.endpointId }, "Webhook delivery dead-lettered");
      return;
    }

    const delayMs = RETRY_DELAYS[Math.min(attempts - 1, RETRY_DELAYS.length - 1)] ?? 300_000;
    const nextRetryAt = new Date(Date.now() + delayMs);

    await db
      .update(webhookDeliveries)
      .set({
        status: "pending",
        httpStatus,
        responseExcerpt,
        attempts,
        nextRetryAt,
      })
      .where(eq(webhookDeliveries.id, deliveryId));
  }

  async function processRetries() {
    const pending = await db
      .select()
      .from(webhookDeliveries)
      .where(
        and(
          eq(webhookDeliveries.status, "pending"),
          lte(webhookDeliveries.nextRetryAt, new Date()),
        ),
      )
      .limit(50);

    for (const delivery of pending) {
      const endpoint = await db
        .select()
        .from(webhookEndpoints)
        .where(eq(webhookEndpoints.id, delivery.endpointId))
        .then((r) => r[0]);

      if (!endpoint || !endpoint.enabled) {
        await db
          .update(webhookDeliveries)
          .set({ status: "dead_letter" })
          .where(eq(webhookDeliveries.id, delivery.id));
        continue;
      }

      const payload = JSON.stringify(delivery.payload);
      await attemptDelivery(delivery.id, endpoint.url, endpoint.secret, payload);
    }
  }

  function startRetryProcessor() {
    if (retryTimerActive) return;
    retryTimerActive = true;
    setInterval(() => {
      void processRetries().catch((err) => {
        logger.error({ err }, "Webhook retry processing failed");
      });
    }, 30_000);
  }

  return { dispatch, processRetries, startRetryProcessor };
}
