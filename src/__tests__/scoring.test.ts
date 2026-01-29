import { setupTestFixtures, type TestFixtures } from "@/lib/test-helpers";
import { eq, and } from "drizzle-orm";
import * as schema from "@/db/schema";
import { generateId } from "@/lib/crypto";
import { MockJudge } from "@/lib/judge";
import { scoreTaskIfNeeded, setJudge } from "@/lib/scoring";

describe("Scoring flow", () => {
  let fixtures: TestFixtures;
  let mockJudge: MockJudge;

  beforeEach(() => {
    fixtures = setupTestFixtures();
    mockJudge = new MockJudge();
    setJudge(mockJudge);
  });

  afterEach(() => {
    setJudge(null as any);
  });

  function insertEvaluation(agentName: string, opts: Partial<{ isEnabled: boolean; rubricText: string; expectedText: string; version: number }> = {}) {
    const evalId = generateId();
    fixtures.db
      .insert(schema.agentEvaluations)
      .values({
        id: evalId,
        workspaceId: fixtures.workspaceId,
        agentName,
        rubricText: opts.rubricText ?? "Be helpful",
        expectedText: opts.expectedText ?? "Expected answer",
        isEnabled: opts.isEnabled ?? true,
        version: opts.version ?? 1,
      })
      .run();
    return evalId;
  }

  function insertEvent(taskId: string, agentName: string, type: string, message?: string) {
    fixtures.db
      .insert(schema.evalEvents)
      .values({
        id: generateId(),
        workspaceId: fixtures.workspaceId,
        agentName,
        taskId,
        interactionType: type as any,
        message: message ?? null,
        ts: new Date().toISOString(),
      })
      .run();
  }

  it("Result event triggers judge when eval is enabled", async () => {
    insertEvaluation("agent-1");
    insertEvent("task-1", "agent-1", "UserInput", "What is 2+2?");
    insertEvent("task-1", "agent-1", "Result", "4");

    await scoreTaskIfNeeded(fixtures.db, fixtures.workspaceId, "agent-1", "task-1");

    expect(mockJudge.calls).toHaveLength(1);

    const scores = fixtures.db
      .select()
      .from(schema.evalScores)
      .where(eq(schema.evalScores.taskId, "task-1"))
      .all();

    expect(scores).toHaveLength(1);
    expect(scores[0].score1To10).toBe(8);
    expect(scores[0].verdictText).toBe("Good job");
  });

  it("judge receives correct rubric, expected, and transcript inputs", async () => {
    insertEvaluation("agent-1", {
      rubricText: "Custom rubric",
      expectedText: "Custom expected",
    });
    insertEvent("task-1", "agent-1", "UserInput", "Question");
    insertEvent("task-1", "agent-1", "Result", "Answer");

    await scoreTaskIfNeeded(fixtures.db, fixtures.workspaceId, "agent-1", "task-1");

    expect(mockJudge.calls).toHaveLength(1);
    const call = mockJudge.calls[0];
    expect(call.rubric).toBe("Custom rubric");
    expect(call.expected).toBe("Custom expected");
    expect(call.transcript).toContain("[UserInput] Question");
    expect(call.transcript).toContain("[Result] Answer");
  });

  it("score is stored with version and prompt_hash", async () => {
    const evalId = insertEvaluation("agent-1", { version: 3 });
    insertEvent("task-1", "agent-1", "UserInput", "Hi");
    insertEvent("task-1", "agent-1", "Result", "Hello");

    await scoreTaskIfNeeded(fixtures.db, fixtures.workspaceId, "agent-1", "task-1");

    const score = fixtures.db
      .select()
      .from(schema.evalScores)
      .where(eq(schema.evalScores.taskId, "task-1"))
      .get();

    expect(score).toBeDefined();
    expect(score!.evaluationVersion).toBe(3);
    expect(score!.evaluationId).toBe(evalId);
    expect(score!.promptHash).toBeDefined();
    expect(score!.promptHash!.length).toBeGreaterThan(0);
    expect(score!.llmModel).toBe("mock-model");
  });

  it("invalid judge output creates error record", async () => {
    mockJudge.mockResult = new Error("LLM returned garbage");
    insertEvaluation("agent-1");
    insertEvent("task-1", "agent-1", "UserInput", "Hi");
    insertEvent("task-1", "agent-1", "Result", "Hello");

    await scoreTaskIfNeeded(fixtures.db, fixtures.workspaceId, "agent-1", "task-1");

    const score = fixtures.db
      .select()
      .from(schema.evalScores)
      .where(eq(schema.evalScores.taskId, "task-1"))
      .get();

    expect(score).toBeDefined();
    expect(score!.score1To10).toBeNull();
    expect(score!.verdictText).toBeNull();
    expect(score!.errorJson).toBeDefined();
    const errorData = JSON.parse(score!.errorJson!);
    expect(errorData.error).toBe("LLM returned garbage");
  });

  it("no scoring when no evaluation exists", async () => {
    insertEvent("task-1", "agent-1", "UserInput", "Hi");
    insertEvent("task-1", "agent-1", "Result", "Hello");

    await scoreTaskIfNeeded(fixtures.db, fixtures.workspaceId, "agent-1", "task-1");

    expect(mockJudge.calls).toHaveLength(0);

    const scores = fixtures.db
      .select()
      .from(schema.evalScores)
      .all();

    expect(scores).toHaveLength(0);
  });

  it("no scoring when evaluation is disabled", async () => {
    insertEvaluation("agent-1", { isEnabled: false });
    insertEvent("task-1", "agent-1", "UserInput", "Hi");
    insertEvent("task-1", "agent-1", "Result", "Hello");

    await scoreTaskIfNeeded(fixtures.db, fixtures.workspaceId, "agent-1", "task-1");

    expect(mockJudge.calls).toHaveLength(0);

    const scores = fixtures.db
      .select()
      .from(schema.evalScores)
      .all();

    expect(scores).toHaveLength(0);
  });

  it("no scoring when judge is not set", async () => {
    setJudge(null as any);
    insertEvaluation("agent-1");
    insertEvent("task-1", "agent-1", "UserInput", "Hi");
    insertEvent("task-1", "agent-1", "Result", "Hello");

    await scoreTaskIfNeeded(fixtures.db, fixtures.workspaceId, "agent-1", "task-1");

    const scores = fixtures.db
      .select()
      .from(schema.evalScores)
      .all();

    expect(scores).toHaveLength(0);
  });
});
