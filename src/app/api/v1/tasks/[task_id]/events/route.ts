import { NextRequest, NextResponse } from "next/server";
import { authenticateSession } from "@/lib/auth";
import { getDb, schema } from "@/db";
import { eq, and, gt } from "drizzle-orm";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ task_id: string }> }
) {
  const auth = await authenticateSession(req);
  if (auth instanceof NextResponse) return auth;
  const { task_id } = await params;
  const db = getDb();
  const cursor = req.nextUrl.searchParams.get("cursor");
  const limit = Math.min(parseInt(req.nextUrl.searchParams.get("limit") || "50"), 100);

  const rows = db
    .select()
    .from(schema.evalEvents)
    .where(
      cursor
        ? and(
            eq(schema.evalEvents.workspaceId, auth.workspaceId),
            eq(schema.evalEvents.taskId, task_id),
            gt(schema.evalEvents.id, cursor)
          )
        : and(
            eq(schema.evalEvents.workspaceId, auth.workspaceId),
            eq(schema.evalEvents.taskId, task_id)
          )
    )
    .orderBy(schema.evalEvents.ts)
    .limit(limit + 1)
    .all();

  const hasMore = rows.length > limit;
  const data = rows.slice(0, limit).map((e) => ({
    id: e.id,
    interaction_type: e.interactionType,
    message: e.message,
    payload_json: e.payloadJson ? JSON.parse(e.payloadJson) : null,
    result_json: e.resultJson ? JSON.parse(e.resultJson) : null,
    error_json: e.errorJson ? JSON.parse(e.errorJson) : null,
    ts: e.ts,
  }));

  return NextResponse.json({
    data,
    next_cursor: hasMore ? data[data.length - 1].id : null,
  });
}
