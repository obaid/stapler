import { z } from "zod";
import {
  AGENT_ADAPTER_TYPES,
  AGENT_ROLES,
  APPROVAL_STATUSES,
  APPROVAL_TYPES,
  GOAL_LEVELS,
  GOAL_STATUSES,
  ISSUE_PRIORITIES,
  ISSUE_STATUSES,
  PROJECT_STATUSES,
  REGISTRATION_STATUSES,
} from "../constants.js";

// Companies
export const createCompanySchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(2000).optional(),
  issuePrefix: z.string().min(1).max(10).optional(),
  autoApproveRegistrations: z.boolean().optional(),
});

export const updateCompanySchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(2000).nullable().optional(),
  autoApproveRegistrations: z.boolean().optional(),
  budgetMonthlyCents: z.number().int().min(0).optional(),
  brandColor: z.string().max(7).nullable().optional(),
});

// Agents
export const createAgentSchema = z.object({
  name: z.string().min(1).max(255),
  role: z.enum(AGENT_ROLES).optional(),
  title: z.string().max(255).optional(),
  capabilities: z.string().max(5000).optional(),
  adapterType: z.enum(AGENT_ADAPTER_TYPES).optional(),
  adapterConfig: z.record(z.unknown()).optional(),
  reportsTo: z.string().uuid().optional(),
  pollingIntervalSec: z.number().int().min(5).max(3600).optional(),
  webhookUrl: z.string().url().optional(),
  budgetMonthlyCents: z.number().int().min(0).optional(),
});

export const updateAgentSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  role: z.enum(AGENT_ROLES).optional(),
  title: z.string().max(255).nullable().optional(),
  capabilities: z.string().max(5000).nullable().optional(),
  adapterConfig: z.record(z.unknown()).optional(),
  reportsTo: z.string().uuid().nullable().optional(),
  pollingIntervalSec: z.number().int().min(5).max(3600).optional(),
  webhookUrl: z.string().url().nullable().optional(),
  budgetMonthlyCents: z.number().int().min(0).optional(),
  status: z.enum(["idle", "paused", "terminated"]).optional(),
});

// Agent Registration
export const registerAgentSchema = z.object({
  companyId: z.string().uuid(),
  agentName: z.string().min(1).max(255),
  openclawGatewayUrl: z.string().url().optional(),
  capabilities: z.string().max(5000).optional(),
  webhookUrl: z.string().url().optional(),
  metadata: z.record(z.unknown()).optional(),
});

// Issues
export const createIssueSchema = z.object({
  title: z.string().min(1).max(500),
  description: z.string().max(50000).optional(),
  status: z.enum(ISSUE_STATUSES).optional(),
  priority: z.enum(ISSUE_PRIORITIES).optional(),
  assigneeAgentId: z.string().uuid().optional(),
  projectId: z.string().uuid().optional(),
  goalId: z.string().uuid().optional(),
  parentId: z.string().uuid().optional(),
});

export const updateIssueSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(50000).nullable().optional(),
  status: z.enum(ISSUE_STATUSES).optional(),
  priority: z.enum(ISSUE_PRIORITIES).optional(),
  assigneeAgentId: z.string().uuid().nullable().optional(),
  projectId: z.string().uuid().nullable().optional(),
  goalId: z.string().uuid().nullable().optional(),
});

// Projects
export const createProjectSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(5000).optional(),
  status: z.enum(PROJECT_STATUSES).optional(),
  leadAgentId: z.string().uuid().optional(),
  goalId: z.string().uuid().optional(),
  targetDate: z.string().optional(),
  color: z.string().max(7).optional(),
});

export const updateProjectSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(5000).nullable().optional(),
  status: z.enum(PROJECT_STATUSES).optional(),
  leadAgentId: z.string().uuid().nullable().optional(),
  targetDate: z.string().nullable().optional(),
  color: z.string().max(7).nullable().optional(),
});

// Goals
export const createGoalSchema = z.object({
  title: z.string().min(1).max(500),
  description: z.string().max(5000).optional(),
  level: z.enum(GOAL_LEVELS).optional(),
  status: z.enum(GOAL_STATUSES).optional(),
  parentId: z.string().uuid().optional(),
  ownerAgentId: z.string().uuid().optional(),
});

export const updateGoalSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(5000).nullable().optional(),
  level: z.enum(GOAL_LEVELS).optional(),
  status: z.enum(GOAL_STATUSES).optional(),
  parentId: z.string().uuid().nullable().optional(),
  ownerAgentId: z.string().uuid().nullable().optional(),
});

// Approvals
export const createApprovalSchema = z.object({
  type: z.enum(APPROVAL_TYPES),
  payload: z.record(z.unknown()),
});

export const decideApprovalSchema = z.object({
  status: z.enum(["approved", "rejected"]),
  decisionNote: z.string().max(2000).optional(),
});

// Webhooks
export const createWebhookEndpointSchema = z.object({
  url: z.string().url(),
  description: z.string().max(500).optional(),
  eventFilter: z.array(z.string()).optional(),
});

// Agent Heartbeat
export const agentHeartbeatSchema = z.object({
  status: z.enum(["idle", "running", "paused"]).optional(),
  currentTaskId: z.string().uuid().optional(),
  progress: z.number().min(0).max(100).optional(),
  metadata: z.record(z.unknown()).optional(),
});

// Agent Task Progress
export const taskProgressSchema = z.object({
  progress: z.number().min(0).max(100),
  message: z.string().max(2000).optional(),
});

// Agent Task Complete
export const taskCompleteSchema = z.object({
  summary: z.string().max(5000).optional(),
  costReport: z.object({
    provider: z.string(),
    model: z.string(),
    inputTokens: z.number().int().min(0),
    outputTokens: z.number().int().min(0),
    costCents: z.number().int().min(0),
  }).optional(),
});

// Agent Task Fail
export const taskFailSchema = z.object({
  error: z.string().max(5000),
  retryable: z.boolean().optional(),
});

// Issue Comment
export const createIssueCommentSchema = z.object({
  body: z.string().min(1).max(50000),
});
