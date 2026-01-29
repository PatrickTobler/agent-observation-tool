import { deriveTaskStatus, deriveTaskSummary } from "@/lib/tasks";
import type { EvalEvent, EvalScore } from "@/db/schema";

function makeEvent(overrides: Partial<EvalEvent> = {}): EvalEvent {
  return {
    id: "evt-1",
    workspaceId: "ws-1",
    agentName: "agent-1",
    taskId: "task-1",
    interactionType: "UserInput",
    message: null,
    payloadJson: null,
    resultJson: null,
    errorJson: null,
    ts: "2025-01-15T10:00:00.000Z",
    receivedAt: "2025-01-15T10:00:01.000Z",
    ...overrides,
  };
}

describe("deriveTaskStatus", () => {
  it("returns 'failed' when an Error event exists", () => {
    const events = [
      makeEvent({ interactionType: "UserInput" }),
      makeEvent({ interactionType: "Error" }),
    ];
    expect(deriveTaskStatus(events)).toBe("failed");
  });

  it("returns 'failed' even when both Error and Result exist", () => {
    const events = [
      makeEvent({ interactionType: "Result" }),
      makeEvent({ interactionType: "Error" }),
    ];
    expect(deriveTaskStatus(events)).toBe("failed");
  });

  it("returns 'succeeded' when Result exists without Error", () => {
    const events = [
      makeEvent({ interactionType: "UserInput" }),
      makeEvent({ interactionType: "Result" }),
    ];
    expect(deriveTaskStatus(events)).toBe("succeeded");
  });

  it("returns 'unknown' when neither Result nor Error exist", () => {
    const events = [
      makeEvent({ interactionType: "UserInput" }),
      makeEvent({ interactionType: "ToolCall" }),
    ];
    expect(deriveTaskStatus(events)).toBe("unknown");
  });

  it("returns 'unknown' for empty events", () => {
    expect(deriveTaskStatus([])).toBe("unknown");
  });
});

describe("deriveTaskSummary", () => {
  it("sorts events by ts and calculates duration", () => {
    const events = [
      makeEvent({ id: "e2", ts: "2025-01-15T10:05:00.000Z", interactionType: "Result" }),
      makeEvent({ id: "e1", ts: "2025-01-15T10:00:00.000Z", interactionType: "UserInput" }),
    ];
    const summary = deriveTaskSummary("task-1", "agent-1", events);
    expect(summary.started_at).toBe("2025-01-15T10:00:00.000Z");
    expect(summary.last_event_at).toBe("2025-01-15T10:05:00.000Z");
    expect(summary.duration_ms).toBe(5 * 60 * 1000);
  });

  it("returns correct event and error counts", () => {
    const events = [
      makeEvent({ id: "e1", interactionType: "UserInput" }),
      makeEvent({ id: "e2", interactionType: "Error" }),
      makeEvent({ id: "e3", interactionType: "Error" }),
    ];
    const summary = deriveTaskSummary("task-1", "agent-1", events);
    expect(summary.event_count).toBe(3);
    expect(summary.error_count).toBe(2);
    expect(summary.status).toBe("failed");
  });

  it("includes score and verdict from EvalScore", () => {
    const events = [makeEvent({ interactionType: "Result" })];
    const score = {
      id: "s-1",
      workspaceId: "ws-1",
      taskId: "task-1",
      agentName: "agent-1",
      evaluationId: "eval-1",
      evaluationVersion: 1,
      score1To10: 9,
      verdictText: "Excellent",
      llmModel: "gpt-4",
      promptHash: "abc",
      createdAt: "2025-01-15T10:00:00.000Z",
      errorJson: null,
    } satisfies EvalScore;
    const summary = deriveTaskSummary("task-1", "agent-1", events, score);
    expect(summary.score).toBe(9);
    expect(summary.verdict).toBe("Excellent");
  });

  it("returns null score/verdict when no score provided", () => {
    const events = [makeEvent({ interactionType: "Result" })];
    const summary = deriveTaskSummary("task-1", "agent-1", events);
    expect(summary.score).toBeNull();
    expect(summary.verdict).toBeNull();
  });

  it("handles empty events list", () => {
    const summary = deriveTaskSummary("task-1", "agent-1", []);
    expect(summary.started_at).toBeNull();
    expect(summary.last_event_at).toBeNull();
    expect(summary.duration_ms).toBeNull();
    expect(summary.event_count).toBe(0);
  });
});
