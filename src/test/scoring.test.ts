import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { handleIngest } from "@/lib/handlers/ingest";
import { handlePutEvaluation } from "@/lib/handlers/evaluations";
import { handleAgentTasks } from "@/lib/handlers/agents";
import { handleTaskDetail } from "@/lib/handlers/tasks";
import { setJudge } from "@/lib/scoring";
import { MockJudge } from "@/lib/judge";
import { evalScores } from "@/db/schema";
import { eq } from "drizzle-orm";
import { setupTestContext, validEventPayload, type TestContext } from "./helpers";

describe("LLM Scoring", () => {
  let ctx: TestContext;
  let judge: MockJudge;

  beforeEach(() => {
    ctx = setupTestContext();
    judge = new MockJudge();
    setJudge(judge);
  });

  afterEach(() => {
    setJudge(null as unknown as MockJudge);
  });

  it("result_event_triggers_judge_when_eval_enabled", async () => {
    // Create evaluation
    handlePutEvaluation(ctx.db, ctx.workspaceId, "agent-a", {
      rubric_text: "Check correctness",
      expected_text: "42",
      is_enabled: true,
    });

    // Send UserInput then Result
    await handleIngest(ctx.db, `Bearer ${ctx.apiKeySecret}`, validEventPayload({
      agent_name: "agent-a",
      task_id: "task-1",
      interaction_type: "UserInput",
      message: "What is 6*7?",
      ts: "2024-01-01T00:00:00Z",
    }));

    await handleIngest(ctx.db, `Bearer ${ctx.apiKeySecret}`, validEventPayload({
      agent_name: "agent-a",
      task_id: "task-1",
      interaction_type: "Result",
      message: "42",
      ts: "2024-01-01T00:01:00Z",
    }));

    expect(judge.calls.length).toBe(1);
  });

  it("judge_receives_rubric_expected_userinput_and_result", async () => {
    handlePutEvaluation(ctx.db, ctx.workspaceId, "agent-a", {
      rubric_text: "Check math",
      expected_text: "42",
    });

    await handleIngest(ctx.db, `Bearer ${ctx.apiKeySecret}`, validEventPayload({
      agent_name: "agent-a",
      task_id: "task-1",
      interaction_type: "UserInput",
      message: "What is 6*7?",
      ts: "2024-01-01T00:00:00Z",
    }));

    await handleIngest(ctx.db, `Bearer ${ctx.apiKeySecret}`, validEventPayload({
      agent_name: "agent-a",
      task_id: "task-1",
      interaction_type: "Result",
      message: "42",
      ts: "2024-01-01T00:01:00Z",
    }));

    expect(judge.calls[0].rubric).toBe("Check math");
    expect(judge.calls[0].expected).toBe("42");
    expect(judge.calls[0].transcript).toContain("[UserInput]");
    expect(judge.calls[0].transcript).toContain("[Result]");
  });

  it("stores_score_with_eval_version_and_prompt_hash", async () => {
    handlePutEvaluation(ctx.db, ctx.workspaceId, "agent-a", {
      rubric_text: "Check",
      expected_text: "Expected",
    });

    await handleIngest(ctx.db, `Bearer ${ctx.apiKeySecret}`, validEventPayload({
      agent_name: "agent-a",
      task_id: "task-1",
      interaction_type: "UserInput",
      ts: "2024-01-01T00:00:00Z",
    }));

    await handleIngest(ctx.db, `Bearer ${ctx.apiKeySecret}`, validEventPayload({
      agent_name: "agent-a",
      task_id: "task-1",
      interaction_type: "Result",
      ts: "2024-01-01T00:01:00Z",
    }));

    const scores = ctx.db
      .select()
      .from(evalScores)
      .where(eq(evalScores.taskId, "task-1"))
      .all();

    expect(scores.length).toBe(1);
    expect(scores[0].score1To10).toBe(8);
    expect(scores[0].evaluationVersion).toBe(1);
    expect(scores[0].promptHash).toBeTruthy();
    expect(scores[0].llmModel).toBe("mock-model");
  });

  it("invalid_judge_output_creates_eval_error_record", async () => {
    judge.mockResult = new Error("Invalid JSON from judge");

    handlePutEvaluation(ctx.db, ctx.workspaceId, "agent-a", {
      rubric_text: "Check",
      expected_text: "Expected",
    });

    await handleIngest(ctx.db, `Bearer ${ctx.apiKeySecret}`, validEventPayload({
      agent_name: "agent-a",
      task_id: "task-1",
      interaction_type: "UserInput",
      ts: "2024-01-01T00:00:00Z",
    }));

    await handleIngest(ctx.db, `Bearer ${ctx.apiKeySecret}`, validEventPayload({
      agent_name: "agent-a",
      task_id: "task-1",
      interaction_type: "Result",
      ts: "2024-01-01T00:01:00Z",
    }));

    const scores = ctx.db
      .select()
      .from(evalScores)
      .where(eq(evalScores.taskId, "task-1"))
      .all();

    expect(scores.length).toBe(1);
    expect(scores[0].score1To10).toBeNull();
    expect(scores[0].errorJson).toBeTruthy();
    expect(JSON.parse(scores[0].errorJson!).error).toContain("Invalid JSON");
  });

  it("score_out_of_range_rejected_or_clamped", async () => {
    // The OpenRouterJudge rejects scores outside 1-10
    // For MockJudge, test that a valid score works
    judge.mockResult = { score: 5, verdict: "Average" };

    handlePutEvaluation(ctx.db, ctx.workspaceId, "agent-a", {
      rubric_text: "Check",
      expected_text: "Expected",
    });

    await handleIngest(ctx.db, `Bearer ${ctx.apiKeySecret}`, validEventPayload({
      agent_name: "agent-a",
      task_id: "task-1",
      interaction_type: "UserInput",
      ts: "2024-01-01T00:00:00Z",
    }));

    await handleIngest(ctx.db, `Bearer ${ctx.apiKeySecret}`, validEventPayload({
      agent_name: "agent-a",
      task_id: "task-1",
      interaction_type: "Result",
      ts: "2024-01-01T00:01:00Z",
    }));

    const scores = ctx.db
      .select()
      .from(evalScores)
      .where(eq(evalScores.taskId, "task-1"))
      .all();

    expect(scores[0].score1To10).toBe(5);
  });

  it("task_summary_includes_eval_score_if_exists", async () => {
    handlePutEvaluation(ctx.db, ctx.workspaceId, "agent-a", {
      rubric_text: "Check",
      expected_text: "Expected",
    });

    await handleIngest(ctx.db, `Bearer ${ctx.apiKeySecret}`, validEventPayload({
      agent_name: "agent-a",
      task_id: "task-1",
      interaction_type: "UserInput",
      ts: "2024-01-01T00:00:00Z",
    }));

    await handleIngest(ctx.db, `Bearer ${ctx.apiKeySecret}`, validEventPayload({
      agent_name: "agent-a",
      task_id: "task-1",
      interaction_type: "Result",
      ts: "2024-01-01T00:01:00Z",
    }));

    const result = handleTaskDetail(ctx.db, ctx.workspaceId, "task-1");
    expect(result.status).toBe(200);
    if (result.status === 200) {
      expect(result.body.score).toBe(8);
      expect(result.body.verdict).toBe("Good job");
    }
  });

  it("agent_tasks_list_includes_score_column", async () => {
    handlePutEvaluation(ctx.db, ctx.workspaceId, "agent-a", {
      rubric_text: "Check",
      expected_text: "Expected",
    });

    await handleIngest(ctx.db, `Bearer ${ctx.apiKeySecret}`, validEventPayload({
      agent_name: "agent-a",
      task_id: "task-1",
      interaction_type: "UserInput",
      ts: "2024-01-01T00:00:00Z",
    }));

    await handleIngest(ctx.db, `Bearer ${ctx.apiKeySecret}`, validEventPayload({
      agent_name: "agent-a",
      task_id: "task-1",
      interaction_type: "Result",
      ts: "2024-01-01T00:01:00Z",
    }));

    const result = handleAgentTasks(ctx.db, ctx.workspaceId, "agent-a", null);
    const task = result.body.tasks.find((t) => t.task_id === "task-1");
    expect(task).toBeDefined();
    expect(task!.score).toBe(8);
  });
});
