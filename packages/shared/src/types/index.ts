export interface Company {
  id: string;
  name: string;
  description: string | null;
  status: string;
  issuePrefix: string;
  issueCounter: number;
  budgetMonthlyCents: number;
  spentMonthlyCents: number;
  autoApproveRegistrations: boolean;
  webhookSecret: string | null;
  brandColor: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Agent {
  id: string;
  companyId: string;
  name: string;
  role: string;
  title: string | null;
  icon: string | null;
  status: string;
  reportsTo: string | null;
  capabilities: string | null;
  adapterType: string;
  adapterConfig: Record<string, unknown>;
  runtimeConfig: Record<string, unknown>;
  budgetMonthlyCents: number;
  spentMonthlyCents: number;
  permissions: Record<string, unknown>;
  pollingIntervalSec: number;
  webhookUrl: string | null;
  lastHeartbeatAt: Date | null;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface AgentRegistration {
  id: string;
  companyId: string;
  agentName: string;
  openclawGatewayUrl: string | null;
  capabilities: string | null;
  webhookUrl: string | null;
  status: string;
  approvedAgentId: string | null;
  decidedByUserId: string | null;
  decidedAt: Date | null;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Issue {
  id: string;
  companyId: string;
  projectId: string | null;
  goalId: string | null;
  parentId: string | null;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  assigneeAgentId: string | null;
  assigneeUserId: string | null;
  executionLockedAt: Date | null;
  issueNumber: number | null;
  identifier: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Project {
  id: string;
  companyId: string;
  goalId: string | null;
  name: string;
  description: string | null;
  status: string;
  leadAgentId: string | null;
  targetDate: string | null;
  color: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Goal {
  id: string;
  companyId: string;
  title: string;
  description: string | null;
  level: string;
  status: string;
  parentId: string | null;
  ownerAgentId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Approval {
  id: string;
  companyId: string;
  type: string;
  status: string;
  payload: Record<string, unknown>;
  decisionNote: string | null;
  decidedByUserId: string | null;
  decidedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CostEvent {
  id: string;
  companyId: string;
  agentId: string;
  provider: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  costCents: number;
  occurredAt: Date;
}

export interface ActivityEvent {
  id: string;
  companyId: string;
  actorType: string;
  actorId: string;
  action: string;
  entityType: string;
  entityId: string;
  details: Record<string, unknown> | null;
  createdAt: Date;
}

export interface PollResponse {
  tasks: PollTask[];
  notifications: PollNotification[];
  nextPollSec: number;
}

export interface PollTask {
  id: string;
  identifier: string | null;
  title: string;
  description: string | null;
  priority: string;
  comments: Array<{ id: string; body: string; createdAt: string }>;
  documents: Array<{ id: string; title: string | null; body: string }>;
}

export interface PollNotification {
  type: string;
  message: string;
  createdAt: string;
}

export interface WebhookEndpoint {
  id: string;
  companyId: string;
  url: string;
  description: string | null;
  eventFilter: string[];
  enabled: boolean;
  failureCount: number;
  createdAt: Date;
}

export interface WebhookDelivery {
  id: string;
  endpointId: string;
  eventType: string;
  payload: Record<string, unknown>;
  status: string;
  httpStatus: number | null;
  attempts: number;
  deliveredAt: Date | null;
  createdAt: Date;
}
