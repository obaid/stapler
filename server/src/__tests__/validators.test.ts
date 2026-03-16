import { describe, it, expect } from "vitest";
import {
  createCompanySchema,
  createAgentSchema,
  createIssueSchema,
  registerAgentSchema,
  createProjectSchema,
  createGoalSchema,
  agentHeartbeatSchema,
  taskProgressSchema,
  taskCompleteSchema,
  taskFailSchema,
} from "@stapler/shared";

describe("createCompanySchema", () => {
  it("accepts valid company", () => {
    const result = createCompanySchema.safeParse({ name: "Acme" });
    expect(result.success).toBe(true);
  });

  it("rejects empty name", () => {
    const result = createCompanySchema.safeParse({ name: "" });
    expect(result.success).toBe(false);
  });

  it("accepts optional fields", () => {
    const result = createCompanySchema.safeParse({
      name: "Acme",
      description: "A test company",
      issuePrefix: "ACM",
      autoApproveRegistrations: true,
    });
    expect(result.success).toBe(true);
  });
});

describe("createAgentSchema", () => {
  it("accepts valid agent", () => {
    const result = createAgentSchema.safeParse({ name: "Bot-1" });
    expect(result.success).toBe(true);
  });

  it("accepts full agent config", () => {
    const result = createAgentSchema.safeParse({
      name: "Bot-1",
      role: "general",
      capabilities: "code review",
      adapterType: "openclaw_gateway",
      pollingIntervalSec: 60,
      budgetMonthlyCents: 1000,
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid polling interval", () => {
    const result = createAgentSchema.safeParse({
      name: "Bot",
      pollingIntervalSec: 2, // min is 5
    });
    expect(result.success).toBe(false);
  });
});

describe("createIssueSchema", () => {
  it("accepts valid issue", () => {
    const result = createIssueSchema.safeParse({ title: "Fix bug" });
    expect(result.success).toBe(true);
  });

  it("accepts all fields", () => {
    const result = createIssueSchema.safeParse({
      title: "Fix bug",
      description: "Detailed description",
      status: "todo",
      priority: "high",
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid status", () => {
    const result = createIssueSchema.safeParse({
      title: "Fix bug",
      status: "invalid_status",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid priority", () => {
    const result = createIssueSchema.safeParse({
      title: "Fix bug",
      priority: "extreme",
    });
    expect(result.success).toBe(false);
  });
});

describe("registerAgentSchema", () => {
  it("accepts valid registration", () => {
    const result = registerAgentSchema.safeParse({
      companyId: "550e8400-e29b-41d4-a716-446655440000",
      agentName: "Worker-1",
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing companyId", () => {
    const result = registerAgentSchema.safeParse({ agentName: "Worker-1" });
    expect(result.success).toBe(false);
  });

  it("accepts optional fields", () => {
    const result = registerAgentSchema.safeParse({
      companyId: "550e8400-e29b-41d4-a716-446655440000",
      agentName: "Worker-1",
      openclawGatewayUrl: "ws://localhost:8080",
      capabilities: "testing",
      webhookUrl: "http://localhost:9090/hook",
    });
    expect(result.success).toBe(true);
  });
});

describe("createProjectSchema", () => {
  it("accepts valid project", () => {
    const result = createProjectSchema.safeParse({ name: "Project Alpha" });
    expect(result.success).toBe(true);
  });

  it("rejects invalid status", () => {
    const result = createProjectSchema.safeParse({
      name: "Project",
      status: "invalid",
    });
    expect(result.success).toBe(false);
  });
});

describe("createGoalSchema", () => {
  it("accepts valid goal", () => {
    const result = createGoalSchema.safeParse({ title: "Ship v1" });
    expect(result.success).toBe(true);
  });

  it("validates level enum", () => {
    const result = createGoalSchema.safeParse({
      title: "Ship v1",
      level: "company",
    });
    expect(result.success).toBe(true);
  });
});

describe("agentHeartbeatSchema", () => {
  it("accepts empty heartbeat", () => {
    const result = agentHeartbeatSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it("accepts status", () => {
    const result = agentHeartbeatSchema.safeParse({ status: "running" });
    expect(result.success).toBe(true);
  });
});

describe("taskProgressSchema", () => {
  it("accepts valid progress", () => {
    const result = taskProgressSchema.safeParse({ progress: 50 });
    expect(result.success).toBe(true);
  });

  it("rejects progress over 100", () => {
    const result = taskProgressSchema.safeParse({ progress: 101 });
    expect(result.success).toBe(false);
  });
});

describe("taskCompleteSchema", () => {
  it("accepts empty completion", () => {
    const result = taskCompleteSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it("accepts cost report", () => {
    const result = taskCompleteSchema.safeParse({
      summary: "Done",
      costReport: {
        provider: "anthropic",
        model: "claude-4",
        inputTokens: 1000,
        outputTokens: 500,
        costCents: 5,
      },
    });
    expect(result.success).toBe(true);
  });
});

describe("taskFailSchema", () => {
  it("accepts error", () => {
    const result = taskFailSchema.safeParse({ error: "Something broke" });
    expect(result.success).toBe(true);
  });

  it("rejects missing error", () => {
    const result = taskFailSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});
