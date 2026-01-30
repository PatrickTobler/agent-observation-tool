import { getDb, schema } from "@/db";
import { eq, and } from "drizzle-orm";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { JsonViewer } from "@/components/json-viewer";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { InteractionBadge } from "@/components/ui/badge";
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

const dotColors: Record<string, string> = {
  UserInput: "bg-blue-500",
  ToolCall: "bg-purple-500",
  McpCall: "bg-purple-500",
  SkillCall: "bg-violet-500",
  Reasoning: "bg-text-muted",
  Result: "bg-success",
  Error: "bg-error",
};

function formatTimestamp(ts: string) {
  const d = new Date(ts);
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

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
        <p className="text-sm text-text-tertiary py-8">No events found for this task.</p>
      </div>
    );
  }

  const agentName = events[0].agentName;
  const hasError = events.some((e) => e.interactionType === "Error");
  const hasResult = events.some((e) => e.interactionType === "Result");
  const status = hasError ? "failed" : hasResult ? "succeeded" : "pending";

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
  const statusDot = status === "succeeded" ? "bg-success" : status === "failed" ? "bg-error" : "bg-text-muted";

  return (
    <div>
      <Breadcrumb
        items={[
          { label: "Agents", href: "/app/agents" },
          { label: agentName, href: `/app/agents/${encodeURIComponent(agentName)}` },
          { label: "Task" },
        ]}
      />

      <div className="mb-10">
        <div className="flex items-center gap-2 mb-1">
          <span className={`w-2 h-2 rounded-full ${statusDot}`} />
          <h1 className="text-lg font-semibold text-text">{status}</h1>
        </div>
        <p className="text-xs text-text-muted font-mono mb-4">{taskId}</p>

        {scoreRow && (
          <div className="rounded-lg bg-bg-surface p-5 inline-flex items-baseline gap-3">
            <span className={`text-3xl font-semibold tabular-nums ${score.className}`}>
              {score.text}
            </span>
            {scoreRow.verdict && (
              <span className="text-sm text-text-tertiary max-w-md">
                {scoreRow.verdict}
              </span>
            )}
          </div>
        )}
      </div>

      <div className="border-t border-border pt-6">
        <h2 className="text-xs font-normal text-text-muted mb-6">
          Timeline ({events.length})
        </h2>

        <div className="relative">
          {events.map((event, i) => {
            const isLast = i === events.length - 1;
            const dot = dotColors[event.interactionType] || "bg-text-muted";

            return (
              <div key={event.id} className="flex gap-4 relative">
                <div className="flex flex-col items-center w-3 shrink-0">
                  <div className={`w-2 h-2 rounded-full mt-1.5 ${dot}`} />
                  {!isLast && (
                    <div className="w-px flex-1 bg-border-subtle mt-1" />
                  )}
                </div>

                <div className={`flex-1 pb-6 ${isLast ? "pb-0" : ""}`}>
                  <div className="flex items-center gap-2 mb-1">
                    <InteractionBadge type={event.interactionType} />
                    <span className="text-[11px] text-text-muted font-mono tabular-nums">
                      {formatTimestamp(event.ts)}
                    </span>
                  </div>
                  {event.message && (
                    <p className="text-sm text-text-secondary mt-1">{event.message}</p>
                  )}
                  <div className="flex flex-col gap-1 mt-1">
                    <JsonViewer data={event.payloadJson} label="Payload" />
                    <JsonViewer data={event.resultJson} label="Result" />
                    <JsonViewer data={event.errorJson} label="Error" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
