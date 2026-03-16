import { Router } from "express";
import { and, eq, sql, isNull } from "drizzle-orm";
import type { Db } from "@stapler/db";
import { issues, issueComments, companies } from "@stapler/db";
import { createIssueSchema, updateIssueSchema, createIssueCommentSchema } from "@stapler/shared";
import { validate } from "../middleware/validate.js";
import { forbidden, notFound, conflict } from "../errors.js";
import { activityLogService } from "../services/activity-log.js";
import { publishCompanyEvent } from "../services/live-events.js";
import { param } from "../params.js";

export function issueRoutes(db: Db) {
  const router = Router();
  const activity = activityLogService(db);

  // List issues for a company
  router.get("/companies/:companyId/issues", async (req, res) => {
    const rows = await db
      .select()
      .from(issues)
      .where(eq(issues.companyId, param(req, "companyId")));
    res.json(rows);
  });

  // Get single issue
  router.get("/companies/:companyId/issues/:issueId", async (req, res) => {
    const row = await db
      .select()
      .from(issues)
      .where(and(eq(issues.id, param(req, "issueId")), eq(issues.companyId, param(req, "companyId"))))
      .then((r) => r[0]);
    if (!row) throw notFound("Issue not found");
    res.json(row);
  });

  // Create issue
  router.post("/companies/:companyId/issues", validate(createIssueSchema), async (req, res) => {
    // Auto-increment issue number
    const [company] = await db
      .update(companies)
      .set({ issueCounter: sql`${companies.issueCounter} + 1` })
      .where(eq(companies.id, param(req, "companyId")))
      .returning();
    if (!company) throw notFound("Company not found");

    const issueNumber = company.issueCounter;
    const identifier = `${company.issuePrefix}-${issueNumber}`;

    const [row] = await db.insert(issues).values({
      title: req.body.title,
      description: req.body.description,
      status: req.body.status,
      priority: req.body.priority,
      assigneeAgentId: req.body.assigneeAgentId,
      projectId: req.body.projectId,
      goalId: req.body.goalId,
      parentId: req.body.parentId,
      companyId: param(req, "companyId"),
      issueNumber,
      identifier,
      createdByUserId: req.actor.type === "board" ? req.actor.userId : undefined,
      createdByAgentId: req.actor.type === "agent" ? req.actor.agentId : undefined,
    }).returning();

    await activity.log({
      companyId: param(req, "companyId"),
      actorType: req.actor.type,
      actorId: req.actor.userId || req.actor.agentId || "system",
      action: "create",
      entityType: "issue",
      entityId: row.id,
      details: { identifier },
    });

    publishCompanyEvent(param(req, "companyId"), "task.assigned", { issue: row });
    res.status(201).json(row);
  });

  // Update issue
  router.patch("/companies/:companyId/issues/:issueId", validate(updateIssueSchema), async (req, res) => {
    const [row] = await db
      .update(issues)
      .set({ ...req.body, updatedAt: new Date() })
      .where(and(eq(issues.id, param(req, "issueId")), eq(issues.companyId, param(req, "companyId"))))
      .returning();
    if (!row) throw notFound("Issue not found");

    if (req.body.status) {
      publishCompanyEvent(param(req, "companyId"), "task.status_changed", {
        issueId: row.id,
        status: row.status,
      });
    }

    res.json(row);
  });

  // Delete issue
  router.delete("/companies/:companyId/issues/:issueId", async (req, res) => {
    if (req.actor.type !== "board") throw forbidden();
    const [row] = await db
      .delete(issues)
      .where(and(eq(issues.id, param(req, "issueId")), eq(issues.companyId, param(req, "companyId"))))
      .returning();
    if (!row) throw notFound("Issue not found");
    res.json({ deleted: true });
  });

  // List comments
  router.get("/companies/:companyId/issues/:issueId/comments", async (req, res) => {
    const rows = await db
      .select()
      .from(issueComments)
      .where(
        and(eq(issueComments.issueId, param(req, "issueId")), eq(issueComments.companyId, param(req, "companyId"))),
      );
    res.json(rows);
  });

  // Add comment
  router.post(
    "/companies/:companyId/issues/:issueId/comments",
    validate(createIssueCommentSchema),
    async (req, res) => {
      const [row] = await db.insert(issueComments).values({
        companyId: param(req, "companyId"),
        issueId: param(req, "issueId"),
        body: req.body.body,
        authorUserId: req.actor.type === "board" ? req.actor.userId : undefined,
        authorAgentId: req.actor.type === "agent" ? req.actor.agentId : undefined,
      }).returning();
      publishCompanyEvent(param(req, "companyId"), "task.comment", {
        issueId: param(req, "issueId"),
        comment: row,
      });
      res.status(201).json(row);
    },
  );

  return router;
}
