import { eq, and, desc } from "drizzle-orm";
import { agentEvaluations, evalScores } from "@/db/schema";
import { generateId } from "@/lib/id";
import type { DB } from "@/db";

export function handlePutEvaluation(
  db: DB,
  workspaceId: string,
  agentName: string,
  body: { rubric_text?: string; expected_text?: string; is_enabled?: boolean }
) {
  const existing = db
    .select()
    .from(agentEvaluations)
    .where(
      and(
        eq(agentEvaluations.workspaceId, workspaceId),
        eq(agentEvaluations.agentName, agentName)
      )
    )
    .get();

  const now = new Date().toISOString();

  if (existing) {
    const newVersion = existing.version + 1;
    db.update(agentEvaluations)
      .set({
        rubricText: body.rubric_text ?? existing.rubricText,
        expectedText: body.expected_text ?? existing.expectedText,
        isEnabled: body.is_enabled ?? existing.isEnabled,
        version: newVersion,
        updatedAt: now,
      })
      .where(eq(agentEvaluations.id, existing.id))
      .run();

    return {
      status: 200 as const,
      body: { id: existing.id, version: newVersion },
    };
  }

  const id = generateId();
  db.insert(agentEvaluations)
    .values({
      id,
      workspaceId,
      agentName,
      rubricText: body.rubric_text || null,
      expectedText: body.expected_text || null,
      isEnabled: body.is_enabled ?? true,
      version: 1,
      createdAt: now,
      updatedAt: now,
    })
    .run();

  return { status: 201 as const, body: { id, version: 1 } };
}

export function handleGetEvaluation(
  db: DB,
  workspaceId: string,
  agentName: string
) {
  const evaluation = db
    .select()
    .from(agentEvaluations)
    .where(
      and(
        eq(agentEvaluations.workspaceId, workspaceId),
        eq(agentEvaluations.agentName, agentName)
      )
    )
    .get();

  if (!evaluation) {
    return { status: 404 as const, body: { error: "No evaluation found" } };
  }

  return {
    status: 200 as const,
    body: {
      id: evaluation.id,
      agent_name: evaluation.agentName,
      rubric_text: evaluation.rubricText,
      expected_text: evaluation.expectedText,
      is_enabled: evaluation.isEnabled,
      version: evaluation.version,
      created_at: evaluation.createdAt,
      updated_at: evaluation.updatedAt,
    },
  };
}

export function handleGetScores(
  db: DB,
  workspaceId: string,
  agentName: string,
  cursor: string | null,
  limit: number = 20
) {
  const baseWhere = and(
    eq(evalScores.workspaceId, workspaceId),
    eq(evalScores.agentName, agentName)
  );

  const scores = db
    .select()
    .from(evalScores)
    .where(baseWhere)
    .orderBy(desc(evalScores.createdAt))
    .limit(limit + 1)
    .all();

  // Simple cursor: skip past the cursor ID
  let filtered = scores;
  if (cursor) {
    const idx = scores.findIndex((s) => s.id === cursor);
    if (idx >= 0) {
      filtered = scores.slice(idx + 1);
    }
  }

  const hasMore = filtered.length > limit;
  const pageScores = hasMore ? filtered.slice(0, limit) : filtered;
  const nextCursor = hasMore
    ? pageScores[pageScores.length - 1].id
    : null;

  return {
    status: 200 as const,
    body: {
      scores: pageScores.map((s) => ({
        id: s.id,
        task_id: s.taskId,
        score: s.score1To10,
        verdict: s.verdictText,
        evaluation_version: s.evaluationVersion,
        llm_model: s.llmModel,
        created_at: s.createdAt,
        error: s.errorJson ? JSON.parse(s.errorJson) : null,
      })),
      next_cursor: nextCursor,
    },
  };
}
