import { describe, it, expect, beforeEach } from "vitest";
import { handleIngest } from "@/lib/handlers/ingest";
import { handleAgentsList, handleAgentTasks } from "@/lib/handlers/agents";
import { handleTaskDetail, handleTaskEvents } from "@/lib/handlers/tasks";
import { setupTestContext, validEventPayload, type TestContext } from "./helpers";
import { createTestDb } from "@/db/test-db";
import { workspaces, apiKeys } from "@/db/schema";
import { generateId, generateApiKeySecret } from "@/lib/id";
import { sha256 } from "@/lib/hash";

describe("Read APIs", () => {
  let ctx: TestContext;

  beforeEach(async () => {
    ctx = setupTestContext();

    // Seed events for two agents
    const auth = `Bearer ${ctx.apiKeySecret}`;

    await handleIngest(ctx.db, auth, validEventPayload({
      agent_name: "agent-a",
      task_id: "task-1",
      interaction_type: "UserInput",
      ts: "2024-01-01T00:00:00Z",
    }));
    await handleIngest(ctx.db, auth, validEventPayload({
      agent_name: "agent-a",
      task_id: "task-1",
      interaction_type: "ToolCall",
      ts: "2024-01-01T00:01:00Z",
    }));
    await handleIngest(ctx.db, auth, validEventPayload({
      agent_name: "agent-a",
      task_id: "task-1",
      interaction_type: "Result",
      ts: "2024-01-01T00:02:00Z",
    }));

    await handleIngest(ctx.db, auth, validEventPayload({
      agent_name: "agent-a",
      task_id: "task-2",
      interaction_type: "UserInput",
      ts: "2024-01-02T00:00:00Z",
    }));
    await handleIngest(ctx.db, auth, validEventPayload({
      agent_name: "agent-a",
      task_id: "task-2",
      interaction_type: "Error",
      ts: "2024-01-02T00:01:00Z",
    }));

    await handleIngest(ctx.db, auth, validEventPayload({
      agent_name: "agent-b",
      task_id: "task-3",
      interaction_type: "UserInput",
      ts: "2024-01-03T00:00:00Z",
    }));
  });

  it("task_status_failed_if_error_event_exists", async () => {
    const result = handleTaskDetail(ctx.db, ctx.workspaceId, "task-2");
    expect(result.status).toBe(200);
    if (result.status === 200) {
      expect(result.body.status).toBe("failed");
    }
  });

  it("task_status_succeeded_if_result_exists_and_no_error", async () => {
    const result = handleTaskDetail(ctx.db, ctx.workspaceId, "task-1");
    expect(result.status).toBe(200);
    if (result.status === 200) {
      expect(result.body.status).toBe("succeeded");
    }
  });

  it("task_status_unknown_otherwise", async () => {
    const result = handleTaskDetail(ctx.db, ctx.workspaceId, "task-3");
    expect(result.status).toBe(200);
    if (result.status === 200) {
      expect(result.body.status).toBe("unknown");
    }
  });

  it("task_events_are_sorted_by_ts", async () => {
    const result = handleTaskEvents(ctx.db, ctx.workspaceId, "task-1", null);
    expect(result.status).toBe(200);
    const events = result.body.events;
    expect(events.length).toBe(3);
    for (let i = 1; i < events.length; i++) {
      expect(new Date(events[i].ts).getTime()).toBeGreaterThanOrEqual(
        new Date(events[i - 1].ts).getTime()
      );
    }
  });

  it("agents_list_aggregates_correctly", async () => {
    const result = handleAgentsList(ctx.db, ctx.workspaceId, null);
    expect(result.status).toBe(200);
    const agents = result.body.agents;
    expect(agents.length).toBe(2);

    const agentA = agents.find((a) => a.agent_name === "agent-a");
    expect(agentA).toBeDefined();
    expect(agentA!.tasks_count).toBe(2);

    const agentB = agents.find((a) => a.agent_name === "agent-b");
    expect(agentB).toBeDefined();
    expect(agentB!.tasks_count).toBe(1);
  });

  it("agent_tasks_list_returns_expected_fields", async () => {
    const result = handleAgentTasks(ctx.db, ctx.workspaceId, "agent-a", null);
    expect(result.status).toBe(200);
    const tasks = result.body.tasks;
    expect(tasks.length).toBe(2);

    const task1 = tasks.find((t) => t.task_id === "task-1");
    expect(task1).toBeDefined();
    expect(task1!.status).toBe("succeeded");
    expect(task1!.events_count).toBe(3);
    expect(task1!.started_at).toBeDefined();
    expect(task1!.duration_ms).toBeGreaterThanOrEqual(0);
  });

  it("workspace_isolation_enforced_on_all_reads", async () => {
    // Create a second workspace
    const otherWorkspaceId = generateId();
    ctx.db.insert(workspaces).values({
      id: otherWorkspaceId,
      name: "Other Workspace",
      createdAt: new Date().toISOString(),
    }).run();

    // Agents list should be empty for the other workspace
    const agentsResult = handleAgentsList(ctx.db, otherWorkspaceId, null);
    expect(agentsResult.body.agents.length).toBe(0);

    // Task detail should return 404 for the other workspace
    const taskResult = handleTaskDetail(ctx.db, otherWorkspaceId, "task-1");
    expect(taskResult.status).toBe(404);

    // Task events should return empty for the other workspace
    const eventsResult = handleTaskEvents(ctx.db, otherWorkspaceId, "task-1", null);
    expect(eventsResult.body.events.length).toBe(0);
  });

  it("cursor pagination stable ordering and no duplicates", async () => {
    // Get first page with limit 1
    const page1 = handleAgentsList(ctx.db, ctx.workspaceId, null, 1);
    expect(page1.body.agents.length).toBe(1);
    expect(page1.body.next_cursor).not.toBeNull();

    // Get second page
    const page2 = handleAgentsList(
      ctx.db,
      ctx.workspaceId,
      page1.body.next_cursor,
      1
    );
    expect(page2.body.agents.length).toBe(1);
    expect(page2.body.next_cursor).toBeNull();

    // No duplicates
    expect(page1.body.agents[0].agent_name).not.toBe(
      page2.body.agents[0].agent_name
    );
  });
});
