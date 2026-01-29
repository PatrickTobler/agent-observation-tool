import { eq, and } from "drizzle-orm";
import { agentEvaluations, evalEvents, evalScores } from "@/db/schema";
import { generateId } from "@/lib/id";
import { computePromptHash } from "@/lib/judge";
import type { Judge } from "@/lib/judge";
import type { DB } from "@/db";

let judgeInstance: Judge | null = null;

export function setJudge(judge: Judge) {
  judgeInstance = judge;
}

export function getJudge(): Judge | null {
  return judgeInstance;
}

export async function scoreTaskIfNeeded(
  db: DB,
  workspaceId: string,
  agentName: string,
  taskId: string
): Promise<void> {
  const judge = judgeInstance;
  if (!judge) return;

  const evaluation = db
    .select()
    .from(agentEvaluations)
    .where(
      and(
        eq(agentEvaluations.workspaceId, workspaceId),
        eq(agentEvaluations.agentName, agentName),
        eq(agentEvaluations.isEnabled, true)
      )
    )
    .get();

  if (!evaluation) return;

  const events = db
    .select()
    .from(evalEvents)
    .where(
      and(
        eq(evalEvents.workspaceId, workspaceId),
        eq(evalEvents.taskId, taskId)
      )
    )
    .all();

  const transcript = events
    .filter(
      (e) =>
        e.interactionType === "UserInput" || e.interactionType === "Result"
    )
    .map((e) => `[${e.interactionType}] ${e.message || ""}`)
    .join("\n");

  const rubric = evaluation.rubricText || "";
  const expected = evaluation.expectedText || "";
  const promptHash = computePromptHash(rubric, expected, transcript);

  try {
    const result = await judge.evaluate(rubric, expected, transcript);

    db.insert(evalScores)
      .values({
        id: generateId(),
        workspaceId,
        taskId,
        agentName,
        evaluationId: evaluation.id,
        evaluationVersion: evaluation.version,
        score1To10: result.score,
        verdictText: result.verdict,
        llmModel: judge.model,
        promptHash,
      })
      .run();
  } catch (err) {
    db.insert(evalScores)
      .values({
        id: generateId(),
        workspaceId,
        taskId,
        agentName,
        evaluationId: evaluation.id,
        evaluationVersion: evaluation.version,
        llmModel: judge.model,
        promptHash,
        errorJson: JSON.stringify({ error: (err as Error).message }),
      })
      .run();
  }
}
