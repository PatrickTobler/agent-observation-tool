import Link from "next/link";
import { getDb, schema } from "@/db";
import { eq, sql } from "drizzle-orm";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { relativeTime } from "@/lib/format";

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

export default async function AgentsPage() {
  const workspaceId = await getWorkspaceId();
  const db = getDb();

  const agents = db
    .select({
      agentName: schema.evalEvents.agentName,
      tasksCount: sql<number>`COUNT(DISTINCT ${schema.evalEvents.taskId})`,
      eventsCount: sql<number>`COUNT(*)`,
      errorCount: sql<number>`SUM(CASE WHEN ${schema.evalEvents.interactionType} = 'Error' THEN 1 ELSE 0 END)`,
      lastSeen: sql<string>`MAX(${schema.evalEvents.ts})`,
    })
    .from(schema.evalEvents)
    .where(eq(schema.evalEvents.workspaceId, workspaceId))
    .groupBy(schema.evalEvents.agentName)
    .orderBy(schema.evalEvents.agentName)
    .all();

  return (
    <div>
      <h1 className="text-lg font-semibold text-text mb-8">Agents</h1>
      {agents.length === 0 ? (
        <div className="border border-border rounded-lg bg-bg-surface p-8">
          <p className="text-sm text-text-tertiary mb-1">No agents yet</p>
          <p className="text-xs text-text-muted mb-6">
            Send your first event to get started:
          </p>
          <div className="border border-border-subtle rounded-md bg-bg overflow-hidden">
            <div className="flex items-center gap-2 px-3 py-2 border-b border-border-subtle">
              <span className="w-2 h-2 rounded-full bg-error/60" />
              <span className="w-2 h-2 rounded-full bg-warning/60" />
              <span className="w-2 h-2 rounded-full bg-success/60" />
              <span className="ml-2 text-[11px] text-text-muted font-mono">bash</span>
            </div>
            <pre className="p-4 text-xs font-mono text-text-secondary overflow-x-auto leading-relaxed">
{`curl -X POST /api/v1/eval-events \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "agent_name": "my-agent",
    "task_id": "task_1",
    "interaction_type": "Result",
    "message": "Completed the task successfully",
    "ts": "2026-01-30T12:00:00Z"
  }'`}
            </pre>
          </div>
          <p className="text-xs text-text-muted mt-4">
            Create an API key in{" "}
            <Link href="/app/settings/api-keys" className="text-text-secondary hover:text-text transition-colors underline underline-offset-2">
              Settings
            </Link>{" "}
            first. See the{" "}
            <Link href="/docs" className="text-text-secondary hover:text-text transition-colors underline underline-offset-2">
              API docs
            </Link>{" "}
            for the full reference.
          </p>
        </div>
      ) : (
        <div className="flex flex-col">
          {agents.map((agent) => (
            <Link
              key={agent.agentName}
              href={`/app/agents/${encodeURIComponent(agent.agentName)}`}
              className="group flex items-center justify-between py-4 border-b border-border-subtle hover:bg-bg-surface-hover/50 -mx-2 px-2 rounded-md transition-colors"
            >
              <div>
                <span className="text-sm font-medium text-text group-hover:text-accent transition-colors">
                  {agent.agentName}
                </span>
              </div>
              <div className="flex items-center gap-4 text-xs text-text-muted tabular-nums">
                <span>{agent.tasksCount} {agent.tasksCount === 1 ? "task" : "tasks"}</span>
                <span>{agent.eventsCount} {agent.eventsCount === 1 ? "event" : "events"}</span>
                {agent.errorCount > 0 && (
                  <span className="text-error">{agent.errorCount} {agent.errorCount === 1 ? "error" : "errors"}</span>
                )}
                <span className="w-20 text-right">
                  {agent.lastSeen ? relativeTime(agent.lastSeen) : "—"}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
