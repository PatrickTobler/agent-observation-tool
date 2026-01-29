import { getDb, schema } from "@/db";
import { eq, and, sql } from "drizzle-orm";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { JsonViewer } from "@/components/json-viewer";

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

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    succeeded: "bg-black text-white",
    failed: "bg-neutral-200 text-black",
    unknown: "bg-neutral-100 text-neutral-500",
  };
  return (
    <span className={`text-xs px-2 py-0.5 rounded ${styles[status] || styles.unknown}`}>
      {status}
    </span>
  );
}

const typeStyles: Record<string, string> = {
  UserInput: "border-l-neutral-400",
  ToolCall: "border-l-neutral-600",
  McpCall: "border-l-neutral-600",
  SkillCall: "border-l-neutral-600",
  Reasoning: "border-l-neutral-300",
  Result: "border-l-black",
  Error: "border-l-red-400",
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
        <div className="text-sm text-neutral-500 mb-4">
          <Link href="/app/agents" className="hover:text-black">
            Agents
          </Link>
          <span className="mx-1.5">/</span>
          <span className="text-black">Task not found</span>
        </div>
        <p className="text-neutral-500 text-sm">No events found for this task.</p>
      </div>
    );
  }

  const agentName = events[0].agentName;
  const hasError = events.some((e) => e.interactionType === "Error");
  const hasResult = events.some((e) => e.interactionType === "Result");
  const status = hasError ? "failed" : hasResult ? "succeeded" : "unknown";

  const score = db
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

  return (
    <div>
      <div className="text-sm text-neutral-500 mb-4">
        <Link href="/app/agents" className="hover:text-black">
          Agents
        </Link>
        <span className="mx-1.5">/</span>
        <Link
          href={`/app/agents/${encodeURIComponent(agentName)}`}
          className="hover:text-black"
        >
          {agentName}
        </Link>
        <span className="mx-1.5">/</span>
        <span className="text-black">Task</span>
      </div>

      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <h1 className="text-xl font-medium">Task</h1>
          <StatusBadge status={status} />
        </div>
        <div className="text-sm text-neutral-500 font-mono">{taskId}</div>
        <div className="text-sm text-neutral-500 mt-1">
          Agent: <span className="text-black">{agentName}</span>
        </div>
        {score && (
          <div className="flex items-center gap-4 mt-3">
            {score.score !== null && (
              <div className="text-sm">
                Score: <span className="font-medium">{score.score}/10</span>
              </div>
            )}
            {score.verdict && (
              <div className="text-sm text-neutral-600">{score.verdict}</div>
            )}
          </div>
        )}
      </div>

      <h2 className="text-sm font-medium text-neutral-500 mb-4">
        Event Timeline ({events.length})
      </h2>

      <div className="flex flex-col gap-3">
        {events.map((event) => (
          <div
            key={event.id}
            className={`border-l-2 pl-4 py-2 ${typeStyles[event.interactionType] || "border-l-neutral-200"}`}
          >
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-medium text-neutral-600">
                {event.interactionType}
              </span>
              <span className="text-xs text-neutral-400">
                {new Date(event.ts).toLocaleString()}
              </span>
            </div>
            {event.message && (
              <p className="text-sm text-neutral-800 mb-2">{event.message}</p>
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
