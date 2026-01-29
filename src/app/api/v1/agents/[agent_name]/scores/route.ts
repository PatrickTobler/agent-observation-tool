import { NextRequest, NextResponse } from "next/server";
import { authenticateSession } from "@/lib/auth";
import { getDb, schema } from "@/db";
import { eq, and, gt } from "drizzle-orm";

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

  const rows = db
    .select()
    .from(schema.evalScores)
    .where(
      cursor
        ? and(
            eq(schema.evalScores.workspaceId, auth.workspaceId),
            eq(schema.evalScores.agentName, agent_name),
            gt(schema.evalScores.id, cursor)
          )
        : and(
            eq(schema.evalScores.workspaceId, auth.workspaceId),
            eq(schema.evalScores.agentName, agent_name)
          )
    )
    .orderBy(schema.evalScores.id)
    .limit(limit + 1)
    .all();

  const hasMore = rows.length > limit;
  const data = rows.slice(0, limit).map((r) => ({
    id: r.id,
    task_id: r.taskId,
    score: r.score1To10,
    verdict: r.verdictText,
    evaluation_version: r.evaluationVersion,
    llm_model: r.llmModel,
    created_at: r.createdAt,
    error: r.errorJson ? JSON.parse(r.errorJson) : null,
  }));

  return NextResponse.json({
    data,
    next_cursor: hasMore ? data[data.length - 1].id : null,
  });
}
