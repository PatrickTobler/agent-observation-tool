import { eq, sql, and, gt } from "drizzle-orm";
import { evalEvents, evalScores } from "@/db/schema";
import type { DB } from "@/db";

type AgentStats = {
  agent_name: string;
  tasks_count: number;
  success_count: number;
  error_count: number;
  last_seen: string;
};

type AgentsListResult = {
  status: 200;
  body: { agents: AgentStats[]; next_cursor: string | null };
};

export function handleAgentsList(
  db: DB,
  workspaceId: string,
  cursor: string | null,
  limit: number = 20
): AgentsListResult {
  const agents = db
    .select({
      agentName: evalEvents.agentName,
      tasksCount: sql<number>`COUNT(DISTINCT ${evalEvents.taskId})`,
      totalEvents: sql<number>`COUNT(*)`,
      errorCount: sql<number>`SUM(CASE WHEN ${evalEvents.interactionType} = 'Error' THEN 1 ELSE 0 END)`,
      lastSeen: sql<string>`MAX(${evalEvents.ts})`,
    })
    .from(evalEvents)
    .where(
      cursor
        ? and(
            eq(evalEvents.workspaceId, workspaceId),
            gt(evalEvents.agentName, cursor)
          )
        : eq(evalEvents.workspaceId, workspaceId)
    )
    .groupBy(evalEvents.agentName)
    .orderBy(evalEvents.agentName)
    .limit(limit + 1)
    .all();

  const hasMore = agents.length > limit;
  const pageAgents = hasMore ? agents.slice(0, limit) : agents;
  const nextCursor = hasMore ? pageAgents[pageAgents.length - 1].agentName : null;

  // For each agent, count tasks with Result vs tasks with Error
  const result: AgentStats[] = pageAgents.map((a) => {
    // Count tasks that have at least one Result event and no Error events
    const successCount = db
      .select({
        count: sql<number>`COUNT(DISTINCT ${evalEvents.taskId})`,
      })
      .from(evalEvents)
      .where(
        and(
          eq(evalEvents.workspaceId, workspaceId),
          eq(evalEvents.agentName, a.agentName),
          eq(evalEvents.interactionType, "Result")
        )
      )
      .get()!.count;

    return {
      agent_name: a.agentName,
      tasks_count: a.tasksCount,
      success_count: successCount,
      error_count: a.errorCount,
      last_seen: a.lastSeen,
    };
  });

  return {
    status: 200,
    body: { agents: result, next_cursor: nextCursor },
  };
}

type TaskRow = {
  task_id: string;
  status: string;
  started_at: string;
  last_event_at: string;
  duration_ms: number;
  events_count: number;
  score: number | null;
};

type AgentTasksResult = {
  status: 200;
  body: { tasks: TaskRow[]; next_cursor: string | null };
};

export function handleAgentTasks(
  db: DB,
  workspaceId: string,
  agentName: string,
  cursor: string | null,
  limit: number = 20
): AgentTasksResult {
  const taskRows = db
    .select({
      taskId: evalEvents.taskId,
      startedAt: sql<string>`MIN(${evalEvents.ts})`,
      lastEventAt: sql<string>`MAX(${evalEvents.ts})`,
      eventsCount: sql<number>`COUNT(*)`,
      hasError: sql<number>`SUM(CASE WHEN ${evalEvents.interactionType} = 'Error' THEN 1 ELSE 0 END)`,
      hasResult: sql<number>`SUM(CASE WHEN ${evalEvents.interactionType} = 'Result' THEN 1 ELSE 0 END)`,
    })
    .from(evalEvents)
    .where(
      cursor
        ? and(
            eq(evalEvents.workspaceId, workspaceId),
            eq(evalEvents.agentName, agentName),
            gt(evalEvents.taskId, cursor)
          )
        : and(
            eq(evalEvents.workspaceId, workspaceId),
            eq(evalEvents.agentName, agentName)
          )
    )
    .groupBy(evalEvents.taskId)
    .orderBy(evalEvents.taskId)
    .limit(limit + 1)
    .all();

  const hasMore = taskRows.length > limit;
  const pageTasks = hasMore ? taskRows.slice(0, limit) : taskRows;
  const nextCursor = hasMore
    ? pageTasks[pageTasks.length - 1].taskId
    : null;

  const tasks: TaskRow[] = pageTasks.map((t) => {
    const score = db
      .select({ score: evalScores.score1To10 })
      .from(evalScores)
      .where(
        and(
          eq(evalScores.workspaceId, workspaceId),
          eq(evalScores.taskId, t.taskId)
        )
      )
      .get();

    const status =
      t.hasError > 0 ? "failed" : t.hasResult > 0 ? "succeeded" : "unknown";

    return {
      task_id: t.taskId,
      status,
      started_at: t.startedAt,
      last_event_at: t.lastEventAt,
      duration_ms:
        new Date(t.lastEventAt).getTime() - new Date(t.startedAt).getTime(),
      events_count: t.eventsCount,
      score: score?.score ?? null,
    };
  });

  return {
    status: 200,
    body: { tasks, next_cursor: nextCursor },
  };
}
