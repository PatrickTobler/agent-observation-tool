import { describe, it, expect, beforeEach } from "vitest";
import { handleIngest } from "@/lib/handlers/ingest";
import { evalEvents } from "@/db/schema";
import { eq } from "drizzle-orm";
import { setupTestContext, validEventPayload, type TestContext } from "./helpers";

describe("POST /v1/eval-events", () => {
  let ctx: TestContext;

  beforeEach(() => {
    ctx = setupTestContext();
  });

  it("ingest_valid_event_returns_201_and_event_id", async () => {
    const result = await handleIngest(
      ctx.db,
      `Bearer ${ctx.apiKeySecret}`,
      validEventPayload()
    );

    expect(result.status).toBe(201);
    expect(result.body).toHaveProperty("event_id");
    expect(result.body).toHaveProperty("accepted", true);
  });

  it("missing_auth_returns_401", async () => {
    const result = await handleIngest(ctx.db, null, validEventPayload());
    expect(result.status).toBe(401);
  });

  it("invalid_api_key_returns_401", async () => {
    const result = await handleIngest(
      ctx.db,
      "Bearer invalid-key",
      validEventPayload()
    );
    expect(result.status).toBe(401);
  });

  it("missing_required_fields_returns_400", async () => {
    const result = await handleIngest(
      ctx.db,
      `Bearer ${ctx.apiKeySecret}`,
      { ts: new Date().toISOString() }
    );
    expect(result.status).toBe(400);
    expect(result.body).toHaveProperty("error");
  });

  it("invalid_interaction_type_returns_400", async () => {
    const result = await handleIngest(
      ctx.db,
      `Bearer ${ctx.apiKeySecret}`,
      validEventPayload({ interaction_type: "InvalidType" })
    );
    expect(result.status).toBe(400);
    expect(result.body.error).toContain("Invalid interaction_type");
  });

  it("invalid_ts_returns_400", async () => {
    const result = await handleIngest(
      ctx.db,
      `Bearer ${ctx.apiKeySecret}`,
      validEventPayload({ ts: "not-a-date" })
    );
    expect(result.status).toBe(400);
    expect(result.body.error).toContain("Invalid ts");
  });

  it("persists_event_with_workspace_scope", async () => {
    const payload = validEventPayload({
      agent_name: "my-agent",
      task_id: "task-123",
    });
    const result = await handleIngest(
      ctx.db,
      `Bearer ${ctx.apiKeySecret}`,
      payload
    );

    expect(result.status).toBe(201);

    const eventId = (result.body as { event_id: string }).event_id;
    const stored = ctx.db
      .select()
      .from(evalEvents)
      .where(eq(evalEvents.id, eventId))
      .get();

    expect(stored).toBeDefined();
    expect(stored!.workspaceId).toBe(ctx.workspaceId);
    expect(stored!.agentName).toBe("my-agent");
    expect(stored!.taskId).toBe("task-123");
    expect(stored!.interactionType).toBe("UserInput");
  });
});
