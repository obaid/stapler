import { Router } from "express";
import { and, eq, inArray, isNull, sql } from "drizzle-orm";
import type { Db } from "@stapler/db";
import { agents, issues, issueComments, documents } from "@stapler/db";
import { agentHeartbeatSchema, taskProgressSchema, taskCompleteSchema, taskFailSchema, createIssueCommentSchema } from "@stapler/shared";
import { validate } from "../middleware/validate.js";
import { unauthorized, notFound, conflict } from "../errors.js";
import { publishCompanyEvent } from "../services/live-events.js";
import { activityLogService } from "../services/activity-log.js";
import { param } from "../params.js";

export function agentPollRoutes(db: Db) {
  const router = Router();
  const activity = activityLogService(db);

  // Require agent auth for all routes
  function requireAgent(req: Express.Request) {
    if (req.actor.type !== "agent" || !req.actor.agentId || !req.actor.companyId) {
      throw unauthorized("Agent authentication required");
    }
    return { agentId: req.actor.agentId, companyId: req.actor.companyId };
  }

  // Poll for tasks
  router.get("/agent/poll", async (req, res) => {
    const { agentId, companyId } = requireAgent(req);

    // Get agent config for polling interval
    const agent = await db
      .select()
      .from(agents)
      .where(eq(agents.id, agentId))
      .then((r) => r[0]);
    if (!agent) throw notFound("Agent not found");

    // Find tasks assigned to this agent in actionable states
    const assignedIssues = await db
      .select()
      .from(issues)
      .where(
        and(
          eq(issues.assigneeAgentId, agentId),
          eq(issues.companyId, companyId),
          inArray(issues.status, ["todo", "backlog", "in_progress"]),
        ),
      );

    // Build enriched task list with comments and documents
    const tasks = await Promise.all(
      assignedIssues.map(async (issue) => {
        const comments = await db
          .select()
          .from(issueComments)
          .where(eq(issueComments.issueId, issue.id));

        return {
          id: issue.id,
          identifier: issue.identifier,
          title: issue.title,
          description: issue.description,
          priority: issue.priority,
          status: issue.status,
          comments: comments.map((c) => ({
            id: c.id,
            body: c.body,
            createdAt: c.createdAt.toISOString(),
          })),
          documents: [],
        };
      }),
    );

    // Adaptive polling: shorter interval when tasks are available
    const nextPollSec = tasks.length > 0 ? 10 : agent.pollingIntervalSec;

    res.json({
      tasks,
      notifications: [],
      nextPollSec,
    });
  });

  // Heartbeat
  router.post("/agent/heartbeat", validate(agentHeartbeatSchema), async (req, res) => {
    const { agentId, companyId } = requireAgent(req);

    await db
      .update(agents)
      .set({
        lastHeartbeatAt: new Date(),
        status: req.body.status || "idle",
        updatedAt: new Date(),
      })
      .where(eq(agents.id, agentId));

    publishCompanyEvent(companyId, "agent.heartbeat", {
      agentId,
      status: req.body.status,
    });

    res.json({ ok: true });
  });

  // Atomic task checkout
  router.post("/agent/tasks/:taskId/checkout", async (req, res) => {
    const { agentId, companyId } = requireAgent(req);

    // Atomic checkout - only succeeds if not already locked
    const result = await db
      .update(issues)
      .set({
        status: "in_progress",
        executionLockedAt: new Date(),
        assigneeAgentId: agentId,
        startedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(issues.id, param(req, "taskId")),
          eq(issues.companyId, companyId),
          isNull(issues.executionLockedAt),
          inArray(issues.status, ["todo", "backlog"]),
        ),
      )
      .returning();

    if (result.length === 0) {
      throw conflict("Task already checked out or not available");
    }

    await activity.log({
      companyId,
      actorType: "agent",
      actorId: agentId,
      action: "checkout",
      entityType: "issue",
      entityId: param(req, "taskId"),
    });

    publishCompanyEvent(companyId, "task.status_changed", {
      issueId: param(req, "taskId"),
      status: "in_progress",
      agentId,
    });

    res.json(result[0]);
  });

  // Report progress
  router.post("/agent/tasks/:taskId/progress", validate(taskProgressSchema), async (req, res) => {
    const { agentId, companyId } = requireAgent(req);

    const issue = await db
      .select()
      .from(issues)
      .where(and(eq(issues.id, param(req, "taskId")), eq(issues.assigneeAgentId, agentId)))
      .then((r) => r[0]);
    if (!issue) throw notFound("Task not found or not assigned to you");

    // Add progress as a comment
    if (req.body.message) {
      await db.insert(issueComments).values({
        companyId,
        issueId: param(req, "taskId"),
        authorAgentId: agentId,
        body: `[Progress ${req.body.progress}%] ${req.body.message}`,
      });
    }

    publishCompanyEvent(companyId, "task.updated", {
      issueId: param(req, "taskId"),
      progress: req.body.progress,
      agentId,
    });

    res.json({ ok: true });
  });

  // Complete task
  router.post("/agent/tasks/:taskId/complete", validate(taskCompleteSchema), async (req, res) => {
    const { agentId, companyId } = requireAgent(req);

    const [updated] = await db
      .update(issues)
      .set({
        status: "done",
        completedAt: new Date(),
        executionLockedAt: null,
        updatedAt: new Date(),
      })
      .where(and(eq(issues.id, param(req, "taskId")), eq(issues.assigneeAgentId, agentId)))
      .returning();

    if (!updated) throw notFound("Task not found or not assigned to you");

    await activity.log({
      companyId,
      actorType: "agent",
      actorId: agentId,
      action: "complete",
      entityType: "issue",
      entityId: param(req, "taskId"),
    });

    publishCompanyEvent(companyId, "task.status_changed", {
      issueId: param(req, "taskId"),
      status: "done",
      agentId,
    });

    res.json(updated);
  });

  // Fail task
  router.post("/agent/tasks/:taskId/fail", validate(taskFailSchema), async (req, res) => {
    const { agentId, companyId } = requireAgent(req);

    const [updated] = await db
      .update(issues)
      .set({
        status: "blocked",
        executionLockedAt: null,
        updatedAt: new Date(),
      })
      .where(and(eq(issues.id, param(req, "taskId")), eq(issues.assigneeAgentId, agentId)))
      .returning();

    if (!updated) throw notFound("Task not found or not assigned to you");

    // Log error as comment
    await db.insert(issueComments).values({
      companyId,
      issueId: param(req, "taskId"),
      authorAgentId: agentId,
      body: `[Error] ${req.body.error}`,
    });

    await activity.log({
      companyId,
      actorType: "agent",
      actorId: agentId,
      action: "fail",
      entityType: "issue",
      entityId: param(req, "taskId"),
      details: { error: req.body.error },
    });

    res.json(updated);
  });

  // Add comment to task
  router.post("/agent/tasks/:taskId/comment", validate(createIssueCommentSchema), async (req, res) => {
    const { agentId, companyId } = requireAgent(req);

    const [comment] = await db
      .insert(issueComments)
      .values({
        companyId,
        issueId: param(req, "taskId"),
        authorAgentId: agentId,
        body: req.body.body,
      })
      .returning();

    publishCompanyEvent(companyId, "task.comment", {
      issueId: param(req, "taskId"),
      comment,
    });

    res.status(201).json(comment);
  });

  return router;
}
