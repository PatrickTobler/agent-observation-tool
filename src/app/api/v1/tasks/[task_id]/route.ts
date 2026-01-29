import { NextRequest, NextResponse } from "next/server";
import { authenticateSession } from "@/lib/auth";
import { getDb, schema } from "@/db";
import { eq, and } from "drizzle-orm";
import { deriveTaskSummary } from "@/lib/tasks";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ task_id: string }> }
) {
  const auth = await authenticateSession(req);
  if (auth instanceof NextResponse) return auth;
  const { task_id } = await params;
  const db = getDb();

  const events = db
    .select()
    .from(schema.evalEvents)
    .where(
      and(
        eq(schema.evalEvents.workspaceId, auth.workspaceId),
        eq(schema.evalEvents.taskId, task_id)
      )
    )
    .all();

  if (events.length === 0) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  const score = db
    .select()
    .from(schema.evalScores)
    .where(
      and(
        eq(schema.evalScores.workspaceId, auth.workspaceId),
        eq(schema.evalScores.taskId, task_id)
      )
    )
    .get();

  const summary = deriveTaskSummary(task_id, events[0].agentName, events, score);
  return NextResponse.json(summary);
}
