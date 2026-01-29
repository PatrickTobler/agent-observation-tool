import Link from "next/link";
import { getDb, schema } from "@/db";
import { eq, and, sql } from "drizzle-orm";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

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

export default async function AgentDetailPage({
  params,
}: {
  params: Promise<{ agent_name: string }>;
}) {
  const { agent_name } = await params;
  const agentName = decodeURIComponent(agent_name);
  const workspaceId = await getWorkspaceId();
  const db = getDb();

  const tasks = db
    .select({
      taskId: schema.evalEvents.taskId,
      eventsCount: sql<number>`COUNT(*)`,
      hasError: sql<number>`SUM(CASE WHEN ${schema.evalEvents.interactionType} = 'Error' THEN 1 ELSE 0 END)`,
      hasResult: sql<number>`SUM(CASE WHEN ${schema.evalEvents.interactionType} = 'Result' THEN 1 ELSE 0 END)`,
      startedAt: sql<string>`MIN(${schema.evalEvents.ts})`,
    })
    .from(schema.evalEvents)
    .where(
      and(
        eq(schema.evalEvents.workspaceId, workspaceId),
        eq(schema.evalEvents.agentName, agentName)
      )
    )
    .groupBy(schema.evalEvents.taskId)
    .orderBy(sql`MIN(${schema.evalEvents.ts}) DESC`)
    .all();

  const scores = db
    .select({
      taskId: schema.evalScores.taskId,
      score: schema.evalScores.score1To10,
    })
    .from(schema.evalScores)
    .where(
      and(
        eq(schema.evalScores.workspaceId, workspaceId),
        eq(schema.evalScores.agentName, agentName)
      )
    )
    .all();

  const scoreMap = new Map(scores.map((s) => [s.taskId, s.score]));

  const tasksWithStatus = tasks.map((t) => ({
    ...t,
    status: t.hasError > 0 ? "failed" : t.hasResult > 0 ? "succeeded" : "unknown",
    score: scoreMap.get(t.taskId) ?? null,
  }));

  const succeeded = tasksWithStatus.filter((t) => t.status === "succeeded").length;
  const failed = tasksWithStatus.filter((t) => t.status === "failed").length;

  return (
    <div>
      <div className="text-sm text-neutral-500 mb-4">
        <Link href="/app/agents" className="hover:text-black">
          Agents
        </Link>
        <span className="mx-1.5">/</span>
        <span className="text-black">{agentName}</span>
      </div>

      <div className="flex items-center justify-between mb-8">
        <h1 className="text-xl font-medium">{agentName}</h1>
        <Link
          href={`/app/agents/${encodeURIComponent(agentName)}/evaluation`}
          className="text-sm text-neutral-500 hover:text-black border border-neutral-200 px-3 py-1.5 rounded"
        >
          Evaluation Config
        </Link>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="border border-neutral-200 rounded p-4">
          <div className="text-2xl font-medium">{tasks.length}</div>
          <div className="text-xs text-neutral-500 mt-1">Total Tasks</div>
        </div>
        <div className="border border-neutral-200 rounded p-4">
          <div className="text-2xl font-medium">{succeeded}</div>
          <div className="text-xs text-neutral-500 mt-1">Succeeded</div>
        </div>
        <div className="border border-neutral-200 rounded p-4">
          <div className="text-2xl font-medium">{failed}</div>
          <div className="text-xs text-neutral-500 mt-1">Failed</div>
        </div>
      </div>

      {tasksWithStatus.length === 0 ? (
        <p className="text-neutral-500 text-sm">No tasks recorded yet.</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-neutral-200 text-left text-neutral-500">
              <th className="pb-2 font-medium">Task ID</th>
              <th className="pb-2 font-medium">Status</th>
              <th className="pb-2 font-medium">Started</th>
              <th className="pb-2 font-medium">Events</th>
              <th className="pb-2 font-medium">Score</th>
            </tr>
          </thead>
          <tbody>
            {tasksWithStatus.map((task) => (
              <tr key={task.taskId} className="border-b border-neutral-100">
                <td className="py-2.5">
                  <Link
                    href={`/app/tasks/${encodeURIComponent(task.taskId)}`}
                    className="text-black hover:underline font-mono text-xs"
                  >
                    {task.taskId}
                  </Link>
                </td>
                <td className="py-2.5">
                  <StatusBadge status={task.status} />
                </td>
                <td className="py-2.5 text-neutral-500">
                  {task.startedAt ? new Date(task.startedAt).toLocaleString() : "—"}
                </td>
                <td className="py-2.5 text-neutral-600">{task.eventsCount}</td>
                <td className="py-2.5 text-neutral-600">
                  {task.score !== null ? `${task.score}/10` : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
