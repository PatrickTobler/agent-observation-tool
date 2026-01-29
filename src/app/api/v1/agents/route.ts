import { NextRequest, NextResponse } from "next/server";
import { authenticateSession } from "@/lib/auth";
import { getDb, schema } from "@/db";
import { eq, sql, and, gt } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const auth = await authenticateSession(req);
  if (auth instanceof NextResponse) return auth;

  const db = getDb();
  const cursor = req.nextUrl.searchParams.get("cursor");
  const limit = Math.min(parseInt(req.nextUrl.searchParams.get("limit") || "50"), 100);

  let query = db
    .select({
      agentName: schema.evalEvents.agentName,
      taskCount: sql<number>`COUNT(DISTINCT ${schema.evalEvents.taskId})`,
      eventCount: sql<number>`COUNT(*)`,
      errorCount: sql<number>`SUM(CASE WHEN ${schema.evalEvents.interactionType} = 'Error' THEN 1 ELSE 0 END)`,
      lastSeen: sql<string>`MAX(${schema.evalEvents.ts})`,
    })
    .from(schema.evalEvents)
    .where(
      cursor
        ? and(eq(schema.evalEvents.workspaceId, auth.workspaceId), gt(schema.evalEvents.agentName, cursor))
        : eq(schema.evalEvents.workspaceId, auth.workspaceId)
    )
    .groupBy(schema.evalEvents.agentName)
    .orderBy(schema.evalEvents.agentName)
    .limit(limit + 1);

  const rows = query.all();
  const hasMore = rows.length > limit;
  const data = rows.slice(0, limit).map((r) => ({
    agent_name: r.agentName,
    task_count: r.taskCount,
    event_count: r.eventCount,
    error_count: r.errorCount,
    last_seen: r.lastSeen,
  }));

  return NextResponse.json({
    data,
    next_cursor: hasMore ? data[data.length - 1].agent_name : null,
  });
}
