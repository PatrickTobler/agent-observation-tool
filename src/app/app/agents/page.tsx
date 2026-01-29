import Link from "next/link";
import { getDb, schema } from "@/db";
import { eq, sql } from "drizzle-orm";
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
      <h1 className="text-xl font-medium mb-6">Agents</h1>
      {agents.length === 0 ? (
        <p className="text-neutral-500 text-sm">
          No agents yet. Start sending events via the API.
        </p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-neutral-200 text-left text-neutral-500">
              <th className="pb-2 font-medium">Agent</th>
              <th className="pb-2 font-medium">Tasks</th>
              <th className="pb-2 font-medium">Events</th>
              <th className="pb-2 font-medium">Errors</th>
              <th className="pb-2 font-medium">Last Seen</th>
            </tr>
          </thead>
          <tbody>
            {agents.map((agent) => (
              <tr key={agent.agentName} className="border-b border-neutral-100">
                <td className="py-2.5">
                  <Link
                    href={`/app/agents/${encodeURIComponent(agent.agentName)}`}
                    className="text-black hover:underline"
                  >
                    {agent.agentName}
                  </Link>
                </td>
                <td className="py-2.5 text-neutral-600">{agent.tasksCount}</td>
                <td className="py-2.5 text-neutral-600">{agent.eventsCount}</td>
                <td className="py-2.5 text-neutral-600">{agent.errorCount}</td>
                <td className="py-2.5 text-neutral-500">
                  {agent.lastSeen ? new Date(agent.lastSeen).toLocaleString() : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
