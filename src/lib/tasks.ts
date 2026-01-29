import { EvalEvent, EvalScore } from "@/db/schema";

export type TaskStatus = "running" | "succeeded" | "failed" | "unknown";

export type TaskSummary = {
  task_id: string;
  agent_name: string;
  status: TaskStatus;
  started_at: string | null;
  last_event_at: string | null;
  duration_ms: number | null;
  event_count: number;
  error_count: number;
  score: number | null;
  verdict: string | null;
};

export function deriveTaskStatus(events: Pick<EvalEvent, "interactionType">[]): TaskStatus {
  const hasError = events.some((e) => e.interactionType === "Error");
  const hasResult = events.some((e) => e.interactionType === "Result");
  if (hasError) return "failed";
  if (hasResult) return "succeeded";
  return "unknown";
}

export function deriveTaskSummary(
  taskId: string,
  agentName: string,
  events: EvalEvent[],
  score?: EvalScore | null
): TaskSummary {
  const sorted = [...events].sort((a, b) => a.ts.localeCompare(b.ts));
  const startedAt = sorted.length > 0 ? sorted[0].ts : null;
  const lastEventAt = sorted.length > 0 ? sorted[sorted.length - 1].ts : null;
  const durationMs =
    startedAt && lastEventAt
      ? new Date(lastEventAt).getTime() - new Date(startedAt).getTime()
      : null;
  return {
    task_id: taskId,
    agent_name: agentName,
    status: deriveTaskStatus(events),
    started_at: startedAt,
    last_event_at: lastEventAt,
    duration_ms: durationMs,
    event_count: events.length,
    error_count: events.filter((e) => e.interactionType === "Error").length,
    score: score?.score1To10 ?? null,
    verdict: score?.verdictText ?? null,
  };
}
