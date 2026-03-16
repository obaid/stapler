import { Router } from "express";
import { and, eq } from "drizzle-orm";
import type { Db } from "@stapler/db";
import { approvals } from "@stapler/db";
import { createApprovalSchema, decideApprovalSchema } from "@stapler/shared";
import { validate } from "../middleware/validate.js";
import { forbidden, notFound, conflict } from "../errors.js";
import { param } from "../params.js";

export function approvalRoutes(db: Db) {
  const router = Router();

  router.get("/companies/:companyId/approvals", async (req, res) => {
    const rows = await db
      .select()
      .from(approvals)
      .where(eq(approvals.companyId, param(req, "companyId")));
    res.json(rows);
  });

  router.post("/companies/:companyId/approvals", validate(createApprovalSchema), async (req, res) => {
    const [row] = await db.insert(approvals).values({
      type: req.body.type,
      payload: req.body.payload,
      companyId: param(req, "companyId"),
      requestedByAgentId: req.actor.type === "agent" ? req.actor.agentId : undefined,
      requestedByUserId: req.actor.type === "board" ? req.actor.userId : undefined,
    }).returning();
    res.status(201).json(row);
  });

  router.post(
    "/companies/:companyId/approvals/:approvalId/decide",
    validate(decideApprovalSchema),
    async (req, res) => {
      if (req.actor.type !== "board") throw forbidden();
      const approval = await db
        .select()
        .from(approvals)
        .where(and(eq(approvals.id, param(req, "approvalId")), eq(approvals.companyId, param(req, "companyId"))))
        .then((r) => r[0]);
      if (!approval) throw notFound("Approval not found");
      if (approval.status !== "pending") throw conflict("Approval already decided");

      const [row] = await db
        .update(approvals)
        .set({
          status: req.body.status,
          decisionNote: req.body.decisionNote,
          decidedByUserId: req.actor.userId,
          decidedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(approvals.id, param(req, "approvalId")))
        .returning();

      res.json(row);
    },
  );

  return router;
}
