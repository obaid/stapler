import { describe, it, expect } from "vitest";

// Unit test for the atomic checkout SQL logic concept
describe("atomic checkout logic", () => {
  it("should only allow checkout when execution_locked_at is null", () => {
    // Simulates the WHERE clause logic
    const issue = {
      id: "test-1",
      status: "todo",
      executionLockedAt: null,
    };

    const canCheckout =
      issue.executionLockedAt === null &&
      ["todo", "backlog"].includes(issue.status);

    expect(canCheckout).toBe(true);
  });

  it("should reject checkout when already locked", () => {
    const issue = {
      id: "test-1",
      status: "in_progress",
      executionLockedAt: new Date(),
    };

    const canCheckout =
      issue.executionLockedAt === null &&
      ["todo", "backlog"].includes(issue.status);

    expect(canCheckout).toBe(false);
  });

  it("should reject checkout when status is not actionable", () => {
    const issue = {
      id: "test-1",
      status: "done",
      executionLockedAt: null,
    };

    const canCheckout =
      issue.executionLockedAt === null &&
      ["todo", "backlog"].includes(issue.status);

    expect(canCheckout).toBe(false);
  });
});
