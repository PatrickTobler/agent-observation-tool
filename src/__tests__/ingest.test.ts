import { setupTestFixtures, type TestFixtures } from "@/lib/test-helpers";
import { eq, and } from "drizzle-orm";
import * as schema from "@/db/schema";
import { generateId } from "@/lib/crypto";

describe("Event ingest", () => {
  let fixtures: TestFixtures;

  beforeEach(() => {
    fixtures = setupTestFixtures();
  });

  it("inserts an event and persists it with correct workspace_id", () => {
    const eventId = generateId();
    fixtures.db
      .insert(schema.evalEvents)
      .values({
        id: eventId,
        workspaceId: fixtures.workspaceId,
        agentName: "my-agent",
        taskId: "task-001",
        interactionType: "UserInput",
        message: "Hello",
        ts: "2025-01-15T10:00:00.000Z",
      })
      .run();

    const row = fixtures.db
      .select()
      .from(schema.evalEvents)
      .where(eq(schema.evalEvents.id, eventId))
      .get();

    expect(row).toBeDefined();
    expect(row!.workspaceId).toBe(fixtures.workspaceId);
    expect(row!.agentName).toBe("my-agent");
    expect(row!.taskId).toBe("task-001");
  });

  it("stores all fields correctly", () => {
    const eventId = generateId();
    const payloadJson = JSON.stringify({ tool: "search", args: { q: "test" } });
    const resultJson = JSON.stringify({ output: "found" });
    const errorJson = JSON.stringify({ code: "TIMEOUT" });

    fixtures.db
      .insert(schema.evalEvents)
      .values({
        id: eventId,
        workspaceId: fixtures.workspaceId,
        agentName: "agent-x",
        taskId: "task-002",
        interactionType: "ToolCall",
        message: "Calling search tool",
        payloadJson,
        resultJson,
        errorJson,
        ts: "2025-01-15T12:00:00.000Z",
      })
      .run();

    const row = fixtures.db
      .select()
      .from(schema.evalEvents)
      .where(eq(schema.evalEvents.id, eventId))
      .get();

    expect(row).toBeDefined();
    expect(row!.agentName).toBe("agent-x");
    expect(row!.taskId).toBe("task-002");
    expect(row!.interactionType).toBe("ToolCall");
    expect(row!.message).toBe("Calling search tool");
    expect(row!.payloadJson).toBe(payloadJson);
    expect(row!.resultJson).toBe(resultJson);
    expect(row!.errorJson).toBe(errorJson);
    expect(row!.ts).toBe("2025-01-15T12:00:00.000Z");
    expect(row!.receivedAt).toBeDefined();
  });

  it("can insert multiple events for the same task", () => {
    const taskId = "task-multi";
    for (let i = 0; i < 5; i++) {
      fixtures.db
        .insert(schema.evalEvents)
        .values({
          id: generateId(),
          workspaceId: fixtures.workspaceId,
          agentName: "agent-1",
          taskId,
          interactionType: "ToolCall",
          ts: `2025-01-15T10:0${i}:00.000Z`,
        })
        .run();
    }

    const rows = fixtures.db
      .select()
      .from(schema.evalEvents)
      .where(
        and(
          eq(schema.evalEvents.workspaceId, fixtures.workspaceId),
          eq(schema.evalEvents.taskId, taskId)
        )
      )
      .all();

    expect(rows).toHaveLength(5);
  });

  it("Result event can trigger scoring when evaluation exists", async () => {
    const { MockJudge } = await import("@/lib/judge");
    const { scoreTaskIfNeeded, setJudge } = await import("@/lib/scoring");

    const mockJudge = new MockJudge();
    setJudge(mockJudge);

    const evalId = generateId();
    fixtures.db
      .insert(schema.agentEvaluations)
      .values({
        id: evalId,
        workspaceId: fixtures.workspaceId,
        agentName: "scored-agent",
        rubricText: "Be helpful",
        expectedText: "A good answer",
        isEnabled: true,
        version: 1,
      })
      .run();

    const taskId = "task-scored";
    fixtures.db
      .insert(schema.evalEvents)
      .values({
        id: generateId(),
        workspaceId: fixtures.workspaceId,
        agentName: "scored-agent",
        taskId,
        interactionType: "UserInput",
        message: "What is 2+2?",
        ts: "2025-01-15T10:00:00.000Z",
      })
      .run();

    fixtures.db
      .insert(schema.evalEvents)
      .values({
        id: generateId(),
        workspaceId: fixtures.workspaceId,
        agentName: "scored-agent",
        taskId,
        interactionType: "Result",
        message: "4",
        ts: "2025-01-15T10:01:00.000Z",
      })
      .run();

    await scoreTaskIfNeeded(fixtures.db, fixtures.workspaceId, "scored-agent", taskId);

    const scores = fixtures.db
      .select()
      .from(schema.evalScores)
      .where(eq(schema.evalScores.taskId, taskId))
      .all();

    expect(scores).toHaveLength(1);
    expect(scores[0].score1To10).toBe(8);

    setJudge(null as any);
  });
});
