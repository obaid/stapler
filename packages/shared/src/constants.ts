export const COMPANY_STATUSES = ["active", "suspended"] as const;
export type CompanyStatus = (typeof COMPANY_STATUSES)[number];

export const AGENT_STATUSES = ["idle", "running", "paused", "terminated", "pending_approval"] as const;
export type AgentStatus = (typeof AGENT_STATUSES)[number];

export const AGENT_ROLES = ["general", "lead", "specialist", "coordinator"] as const;
export type AgentRole = (typeof AGENT_ROLES)[number];

export const AGENT_ADAPTER_TYPES = ["openclaw_gateway", "process"] as const;
export type AgentAdapterType = (typeof AGENT_ADAPTER_TYPES)[number];

export const ISSUE_STATUSES = ["backlog", "todo", "in_progress", "in_review", "done", "blocked", "cancelled"] as const;
export type IssueStatus = (typeof ISSUE_STATUSES)[number];

export const ISSUE_PRIORITIES = ["critical", "high", "medium", "low"] as const;
export type IssuePriority = (typeof ISSUE_PRIORITIES)[number];

export const GOAL_LEVELS = ["company", "team", "agent", "task"] as const;
export type GoalLevel = (typeof GOAL_LEVELS)[number];

export const GOAL_STATUSES = ["planned", "active", "achieved", "abandoned"] as const;
export type GoalStatus = (typeof GOAL_STATUSES)[number];

export const PROJECT_STATUSES = ["backlog", "active", "completed", "archived"] as const;
export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

export const APPROVAL_TYPES = ["hire_agent", "agent_registration", "budget_override", "task_execution"] as const;
export type ApprovalType = (typeof APPROVAL_TYPES)[number];

export const APPROVAL_STATUSES = ["pending", "approved", "rejected"] as const;
export type ApprovalStatus = (typeof APPROVAL_STATUSES)[number];

export const HEARTBEAT_RUN_STATUSES = ["queued", "running", "completed", "failed", "cancelled", "timed_out"] as const;
export type HeartbeatRunStatus = (typeof HEARTBEAT_RUN_STATUSES)[number];

export const REGISTRATION_STATUSES = ["pending", "approved", "rejected", "claimed"] as const;
export type RegistrationStatus = (typeof REGISTRATION_STATUSES)[number];

export const WEBHOOK_EVENT_TYPES = [
  "task.assigned",
  "task.updated",
  "task.comment",
  "approval.decided",
  "registration.approved",
  "agent.wakeup",
] as const;
export type WebhookEventType = (typeof WEBHOOK_EVENT_TYPES)[number];

export const WEBHOOK_DELIVERY_STATUSES = ["pending", "delivered", "failed", "dead_letter"] as const;
export type WebhookDeliveryStatus = (typeof WEBHOOK_DELIVERY_STATUSES)[number];

export const LIVE_EVENT_TYPES = [
  "agent.status",
  "agent.registered",
  "agent.heartbeat",
  "task.assigned",
  "task.status_changed",
  "activity.logged",
  "registration.pending",
  "registration.approved",
  "registration.rejected",
  "heartbeat.run.started",
  "heartbeat.run.completed",
  "heartbeat.run.failed",
] as const;
export type LiveEventType = (typeof LIVE_EVENT_TYPES)[number];

export type DeploymentMode = "local_trusted" | "authenticated";
export type DeploymentExposure = "private" | "public";
