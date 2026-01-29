import { getDb, schema } from "@/db";
import { eq, and } from "drizzle-orm";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { JsonViewer } from "@/components/json-viewer";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { StatusBadge, InteractionBadge } from "@/components/ui/badge";
import { formatScore, relativeTime } from "@/lib/format";

async function getWorkspaceId() {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get("session_id")?.value;
  if (!sessionId) redirect("/login");

  const db = getDb();
  const session = db
    .select()
    .from(schema.sessions)
    .where(eq(schema.sessions.id, sessionId))
    .get();

  if (!session || session.revokedAt || new Date(session.expiresAt) < new Date()) {
    redirect("/login");
  }

  return session.workspaceId;
}

const typeColors: Record<string, string> = {
  UserInput: "border-l-blue-500",
  ToolCall: "border-l-purple-500",
  McpCall: "border-l-purple-500",
  SkillCall: "border-l-violet-500",
  Reasoning: "border-l-border",
  Result: "border-l-success",
  Error: "border-l-error",
};

export default async function TaskDetailPage({
  params,
}: {
  params: Promise<{ task_id: string }>;
}) {
  const { task_id } = await params;
  const taskId = decodeURIComponent(task_id);
  const workspaceId = await getWorkspaceId();
  const db = getDb();

  const events = db
    .select()
    .from(schema.evalEvents)
    .where(
      and(
        eq(schema.evalEvents.workspaceId, workspaceId),
        eq(schema.evalEvents.taskId, taskId)
      )
    )
    .orderBy(schema.evalEvents.ts)
    .all();

  if (events.length === 0) {
    return (
      <div>
        <Breadcrumb
          items={[
            { label: "Agents", href: "/app/agents" },
            { label: "Task not found" },
          ]}
        />
        <div className="border border-border rounded-lg bg-bg-surface p-8 text-center">
          <p className="text-sm text-text-tertiary">No events found for this task.</p>
        </div>
      </div>
    );
  }

  const agentName = events[0].agentName;
  const hasError = events.some((e) => e.interactionType === "Error");
  const hasResult = events.some((e) => e.interactionType === "Result");
  const status = hasError ? "failed" : hasResult ? "succeeded" : "unknown";

  const scoreRow = db
    .select({
      score: schema.evalScores.score1To10,
      verdict: schema.evalScores.verdictText,
    })
    .from(schema.evalScores)
    .where(
      and(
        eq(schema.evalScores.workspaceId, workspaceId),
        eq(schema.evalScores.taskId, taskId)
      )
    )
    .get();

  const score = formatScore(scoreRow?.score ?? null);

  return (
    <div>
      <Breadcrumb
        items={[
          { label: "Agents", href: "/app/agents" },
          { label: agentName, href: `/app/agents/${encodeURIComponent(agentName)}` },
          { label: "Task" },
        ]}
      />

      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <h1 className="text-lg font-semibold text-text">Task</h1>
          <StatusBadge status={status} />
        </div>
        <div className="text-sm text-text-muted font-mono">{taskId}</div>
        <div className="text-sm text-text-tertiary mt-1">
          Agent: <Link href={`/app/agents/${encodeURIComponent(agentName)}`} className="text-text hover:text-accent transition-colors">{agentName}</Link>
        </div>
        {scoreRow && (
          <div className="flex items-center gap-4 mt-3">
            <span className={`text-sm font-medium ${score.className}`}>{score.text}</span>
            {scoreRow.verdict && (
              <span className="text-sm text-text-tertiary">{scoreRow.verdict}</span>
            )}
          </div>
        )}
      </div>

      <h2 className="text-xs font-medium text-text-tertiary uppercase tracking-wider mb-4">
        Event Timeline ({events.length})
      </h2>

      <div className="flex flex-col gap-2">
        {events.map((event) => (
          <div
            key={event.id}
            className={`border-l-2 pl-4 py-3 ${typeColors[event.interactionType] || "border-l-border"}`}
          >
            <div className="flex items-center gap-2 mb-1.5">
              <InteractionBadge type={event.interactionType} />
              <span className="text-xs text-text-muted font-mono tabular-nums">
                {relativeTime(event.ts)}
              </span>
            </div>
            {event.message && (
              <p className="text-sm text-text-secondary mb-2">{event.message}</p>
            )}
            <div className="flex flex-col gap-1">
              <JsonViewer data={event.payloadJson} label="Payload" />
              <JsonViewer data={event.resultJson} label="Result" />
              <JsonViewer data={event.errorJson} label="Error" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
