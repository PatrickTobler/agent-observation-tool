import type { EvalEvent } from "@/db/schema";

export type TaskStatus = "succeeded" | "failed" | "unknown";

export type TaskSummary = {
  taskId: string;
  agentName: string;
  status: TaskStatus;
  startedAt: string;
  lastEventAt: string;
  durationMs: number;
  totalEvents: number;
  totalErrors: number;
  totalToolCalls: number;
};

export function deriveTaskStatus(events: EvalEvent[]): TaskStatus {
  const hasError = events.some((e) => e.interactionType === "Error");
  if (hasError) return "failed";

  const hasResult = events.some((e) => e.interactionType === "Result");
  if (hasResult) return "succeeded";

  return "unknown";
}

export function deriveTaskSummary(
  taskId: string,
  events: EvalEvent[]
): TaskSummary | null {
  if (events.length === 0) return null;

  const sorted = [...events].sort(
    (a, b) => new Date(a.ts).getTime() - new Date(b.ts).getTime()
  );

  const startedAt = sorted[0].ts;
  const lastEventAt = sorted[sorted.length - 1].ts;
  const durationMs =
    new Date(lastEventAt).getTime() - new Date(startedAt).getTime();

  return {
    taskId,
    agentName: sorted[0].agentName,
    status: deriveTaskStatus(events),
    startedAt,
    lastEventAt,
    durationMs,
    totalEvents: events.length,
    totalErrors: events.filter((e) => e.interactionType === "Error").length,
    totalToolCalls: events.filter(
      (e) =>
        e.interactionType === "ToolCall" ||
        e.interactionType === "McpCall" ||
        e.interactionType === "SkillCall"
    ).length,
  };
}
