import { NextRequest, NextResponse } from "next/server";
import { authenticateApiKey } from "@/lib/auth";
import { validateEventInput } from "@/lib/validation";
import { generateId } from "@/lib/crypto";
import { getDb, schema } from "@/db";
import { scoreTaskIfNeeded } from "@/lib/scoring";

export async function POST(req: NextRequest) {
  const auth = await authenticateApiKey(req);
  if (auth instanceof NextResponse) return auth;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const validation = validateEventInput(body);
  if (!validation.valid) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  const { data } = validation;
  const eventId = generateId();
  const db = getDb();

  db.insert(schema.evalEvents)
    .values({
      id: eventId,
      workspaceId: auth.workspaceId,
      agentName: data.agent_name,
      taskId: data.task_id,
      interactionType: data.interaction_type,
      message: data.message,
      payloadJson: data.payload_json ? JSON.stringify(data.payload_json) : null,
      resultJson: data.result_json ? JSON.stringify(data.result_json) : null,
      errorJson: data.error_json ? JSON.stringify(data.error_json) : null,
      ts: data.ts,
    })
    .run();

  if (data.interaction_type === "Result") {
    await scoreTaskIfNeeded(db, auth.workspaceId, data.agent_name, data.task_id);
  }

  return NextResponse.json({ event_id: eventId, accepted: true }, { status: 201 });
}
