import Link from "next/link";
import { getDb, schema } from "@/db";
import { eq, sql } from "drizzle-orm";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Table, TableHead, TableBody, TableRow, TableHeaderCell, TableCell, TableHeaderRow } from "@/components/ui/table";
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
      <h1 className="text-lg font-semibold text-text mb-6">Agents</h1>
      {agents.length === 0 ? (
        <div className="border border-border rounded-lg bg-bg-surface p-8 text-center">
          <p className="text-sm text-text-tertiary mb-2">No agents yet</p>
          <p className="text-xs text-text-muted">
            Start sending events via the API to see your agents here.
          </p>
        </div>
      ) : (
        <Table>
          <TableHead>
            <TableHeaderRow>
              <TableHeaderCell>Agent</TableHeaderCell>
              <TableHeaderCell>Tasks</TableHeaderCell>
              <TableHeaderCell>Events</TableHeaderCell>
              <TableHeaderCell>Errors</TableHeaderCell>
              <TableHeaderCell>Last Seen</TableHeaderCell>
            </TableHeaderRow>
          </TableHead>
          <TableBody>
            {agents.map((agent) => (
              <TableRow key={agent.agentName}>
                <TableCell>
                  <Link
                    href={`/app/agents/${encodeURIComponent(agent.agentName)}`}
                    className="text-text hover:text-accent transition-colors font-medium"
                  >
                    {agent.agentName}
                  </Link>
                </TableCell>
                <TableCell mono>{agent.tasksCount}</TableCell>
                <TableCell mono>{agent.eventsCount}</TableCell>
                <TableCell mono className={agent.errorCount > 0 ? "text-error" : ""}>
                  {agent.errorCount}
                </TableCell>
                <TableCell className="text-text-muted">
                  {agent.lastSeen ? relativeTime(agent.lastSeen) : "—"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
