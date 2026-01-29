import { evalEvents, INTERACTION_TYPES } from "@/db/schema";
import { authenticateApiKey } from "@/lib/api-key-auth";
import { generateId } from "@/lib/id";
import { scoreTaskIfNeeded } from "@/lib/scoring";
import type { DB } from "@/db";

type IngestResult =
  | { status: 201; body: { event_id: string; accepted: true } }
  | { status: 400 | 401; body: { error: string } };

export async function handleIngest(
  db: DB,
  authHeader: string | null,
  body: unknown
): Promise<IngestResult> {
  const auth = await authenticateApiKey(db, authHeader);
  if (!auth) {
    return { status: 401, body: { error: "Unauthorized" } };
  }

  if (!body || typeof body !== "object") {
    return { status: 400, body: { error: "Invalid JSON body" } };
  }

  const event = body as Record<string, unknown>;

  if (!event.agent_name || typeof event.agent_name !== "string") {
    return {
      status: 400,
      body: { error: "Missing required field: agent_name" },
    };
  }
  if (!event.task_id || typeof event.task_id !== "string") {
    return {
      status: 400,
      body: { error: "Missing required field: task_id" },
    };
  }
  if (!event.interaction_type || typeof event.interaction_type !== "string") {
    return {
      status: 400,
      body: { error: "Missing required field: interaction_type" },
    };
  }
  if (
    !INTERACTION_TYPES.includes(
      event.interaction_type as (typeof INTERACTION_TYPES)[number]
    )
  ) {
    return {
      status: 400,
      body: {
        error: `Invalid interaction_type. Must be one of: ${INTERACTION_TYPES.join(", ")}`,
      },
    };
  }
  if (!event.ts || typeof event.ts !== "string") {
    return { status: 400, body: { error: "Missing required field: ts" } };
  }

  const tsDate = new Date(event.ts);
  if (isNaN(tsDate.getTime())) {
    return {
      status: 400,
      body: { error: "Invalid ts: must be a valid ISO 8601 timestamp" },
    };
  }

  const eventId = generateId();
  const now = new Date().toISOString();

  db.insert(evalEvents)
    .values({
      id: eventId,
      workspaceId: auth.workspaceId,
      agentName: event.agent_name as string,
      taskId: event.task_id as string,
      interactionType: event.interaction_type as (typeof INTERACTION_TYPES)[number],
      message: (event.message as string) || null,
      payloadJson: event.payload_json
        ? JSON.stringify(event.payload_json)
        : null,
      resultJson: event.result_json ? JSON.stringify(event.result_json) : null,
      errorJson: event.error_json ? JSON.stringify(event.error_json) : null,
      ts: tsDate.toISOString(),
      receivedAt: now,
    })
    .run();

  if (event.interaction_type === "Result") {
    await scoreTaskIfNeeded(
      db,
      auth.workspaceId,
      event.agent_name as string,
      event.task_id as string
    );
  }

  return { status: 201, body: { event_id: eventId, accepted: true } };
}
