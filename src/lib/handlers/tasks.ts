import { eq, and, gt } from "drizzle-orm";
import { evalEvents, evalScores } from "@/db/schema";
import { deriveTaskSummary } from "@/lib/task-derivation";
import type { DB } from "@/db";

export function handleTaskDetail(
  db: DB,
  workspaceId: string,
  taskId: string
) {
  const events = db
    .select()
    .from(evalEvents)
    .where(
      and(
        eq(evalEvents.workspaceId, workspaceId),
        eq(evalEvents.taskId, taskId)
      )
    )
    .orderBy(evalEvents.ts)
    .all();

  if (events.length === 0) {
    return { status: 404 as const, body: { error: "Task not found" } };
  }

  const summary = deriveTaskSummary(taskId, events);

  const score = db
    .select()
    .from(evalScores)
    .where(
      and(
        eq(evalScores.workspaceId, workspaceId),
        eq(evalScores.taskId, taskId)
      )
    )
    .get();

  return {
    status: 200 as const,
    body: {
      ...summary,
      score: score?.score1To10 ?? null,
      verdict: score?.verdictText ?? null,
    },
  };
}

export function handleTaskEvents(
  db: DB,
  workspaceId: string,
  taskId: string,
  cursor: string | null,
  limit: number = 50
) {
  const baseWhere = and(
    eq(evalEvents.workspaceId, workspaceId),
    eq(evalEvents.taskId, taskId)
  );

  const events = db
    .select()
    .from(evalEvents)
    .where(
      cursor
        ? and(baseWhere, gt(evalEvents.id, cursor))
        : baseWhere
    )
    .orderBy(evalEvents.ts, evalEvents.id)
    .limit(limit + 1)
    .all();

  const hasMore = events.length > limit;
  const pageEvents = hasMore ? events.slice(0, limit) : events;
  const nextCursor = hasMore
    ? pageEvents[pageEvents.length - 1].id
    : null;

  return {
    status: 200 as const,
    body: {
      events: pageEvents.map((e) => ({
        id: e.id,
        agent_name: e.agentName,
        task_id: e.taskId,
        interaction_type: e.interactionType,
        message: e.message,
        payload_json: e.payloadJson ? JSON.parse(e.payloadJson) : null,
        result_json: e.resultJson ? JSON.parse(e.resultJson) : null,
        error_json: e.errorJson ? JSON.parse(e.errorJson) : null,
        ts: e.ts,
      })),
      next_cursor: nextCursor,
    },
  };
}
