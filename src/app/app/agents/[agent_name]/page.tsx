import Link from "next/link";
import { getDb, schema } from "@/db";
import { eq, and, sql } from "drizzle-orm";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { StatusBadge } from "@/components/ui/badge";
import { StatCard } from "@/components/ui/stat-card";
import { Button } from "@/components/ui/button";
import { Table, TableHead, TableBody, TableRow, TableHeaderCell, TableCell, TableHeaderRow } from "@/components/ui/table";
import { relativeTime, formatScore } from "@/lib/format";

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
      <Breadcrumb
        items={[
          { label: "Agents", href: "/app/agents" },
          { label: agentName },
        ]}
      />

      <div className="flex items-center justify-between mb-8">
        <h1 className="text-lg font-semibold text-text">{agentName}</h1>
        <Link href={`/app/agents/${encodeURIComponent(agentName)}/evaluation`}>
          <Button variant="secondary">Evaluation</Button>
        </Link>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-10">
        <StatCard value={tasks.length} label="Total Tasks" />
        <StatCard value={succeeded} label="Succeeded" color="success" />
        <StatCard value={failed} label="Failed" color="error" />
      </div>

      <div className="border-t border-border pt-6">
        <h2 className="text-xs font-normal text-text-muted mb-4">Tasks</h2>

        {tasksWithStatus.length === 0 ? (
          <p className="text-sm text-text-tertiary py-4">No tasks recorded yet.</p>
        ) : (
          <Table>
            <TableHead>
              <TableHeaderRow>
                <TableHeaderCell>Task</TableHeaderCell>
                <TableHeaderCell>Status</TableHeaderCell>
                <TableHeaderCell>Started</TableHeaderCell>
                <TableHeaderCell>Events</TableHeaderCell>
                <TableHeaderCell>Score</TableHeaderCell>
              </TableHeaderRow>
            </TableHead>
            <TableBody>
              {tasksWithStatus.map((task) => {
                const score = formatScore(task.score);
                return (
                  <TableRow key={task.taskId}>
                    <TableCell>
                      <Link
                        href={`/app/tasks/${encodeURIComponent(task.taskId)}`}
                        className="font-mono text-xs text-text hover:text-accent transition-colors"
                      >
                        {task.taskId}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={task.status} />
                    </TableCell>
                    <TableCell className="text-text-muted text-xs">
                      {task.startedAt ? relativeTime(task.startedAt) : "—"}
                    </TableCell>
                    <TableCell mono>{task.eventsCount}</TableCell>
                    <TableCell>
                      <span className={`text-xs font-mono ${score.className}`}>{score.text}</span>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
