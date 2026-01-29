import { NextRequest, NextResponse } from "next/server";
import { authenticateSession } from "@/lib/auth";
import { getDb, schema } from "@/db";
import { eq, and, gt, sql, desc } from "drizzle-orm";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ agent_name: string }> }
) {
  const auth = await authenticateSession(req);
  if (auth instanceof NextResponse) return auth;

  const { agent_name } = await params;
  const db = getDb();
  const cursor = req.nextUrl.searchParams.get("cursor");
  const limit = Math.min(parseInt(req.nextUrl.searchParams.get("limit") || "50"), 100);

  const tasks = db
    .select({
      taskId: schema.evalEvents.taskId,
      eventCount: sql<number>`COUNT(*)`,
      errorCount: sql<number>`SUM(CASE WHEN ${schema.evalEvents.interactionType} = 'Error' THEN 1 ELSE 0 END)`,
      hasResult: sql<number>`SUM(CASE WHEN ${schema.evalEvents.interactionType} = 'Result' THEN 1 ELSE 0 END)`,
      startedAt: sql<string>`MIN(${schema.evalEvents.ts})`,
      lastEventAt: sql<string>`MAX(${schema.evalEvents.ts})`,
    })
    .from(schema.evalEvents)
    .where(
      cursor
        ? and(
            eq(schema.evalEvents.workspaceId, auth.workspaceId),
            eq(schema.evalEvents.agentName, agent_name),
            gt(schema.evalEvents.taskId, cursor)
          )
        : and(
            eq(schema.evalEvents.workspaceId, auth.workspaceId),
            eq(schema.evalEvents.agentName, agent_name)
          )
    )
    .groupBy(schema.evalEvents.taskId)
    .orderBy(schema.evalEvents.taskId)
    .limit(limit + 1)
    .all();

  // Get scores for these tasks
  const taskIds = tasks.slice(0, limit).map((t) => t.taskId);
  const scores = taskIds.length > 0
    ? db
        .select()
        .from(schema.evalScores)
        .where(eq(schema.evalScores.workspaceId, auth.workspaceId))
        .all()
        .filter((s) => taskIds.includes(s.taskId))
    : [];
  const scoreMap = new Map(scores.map((s) => [s.taskId, s]));

  const hasMore = tasks.length > limit;
  const data = tasks.slice(0, limit).map((t) => {
    const score = scoreMap.get(t.taskId);
    const status = t.errorCount > 0 ? "failed" : t.hasResult > 0 ? "succeeded" : "unknown";
    const durationMs = t.startedAt && t.lastEventAt
      ? new Date(t.lastEventAt).getTime() - new Date(t.startedAt).getTime()
      : null;
    return {
      task_id: t.taskId,
      status,
      started_at: t.startedAt,
      last_event_at: t.lastEventAt,
      duration_ms: durationMs,
      event_count: t.eventCount,
      error_count: t.errorCount,
      score: score?.score1To10 ?? null,
      verdict: score?.verdictText ?? null,
    };
  });

  return NextResponse.json({
    data,
    next_cursor: hasMore ? data[data.length - 1].task_id : null,
  });
}
