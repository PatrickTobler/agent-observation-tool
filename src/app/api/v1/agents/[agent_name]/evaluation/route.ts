import { NextRequest, NextResponse } from "next/server";
import { authenticateSession } from "@/lib/auth";
import { getDb, schema } from "@/db";
import { eq, and } from "drizzle-orm";
import { generateId } from "@/lib/crypto";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ agent_name: string }> }
) {
  const auth = await authenticateSession(req);
  if (auth instanceof NextResponse) return auth;
  const { agent_name } = await params;
  const db = getDb();
  const evaluation = db
    .select()
    .from(schema.agentEvaluations)
    .where(
      and(
        eq(schema.agentEvaluations.workspaceId, auth.workspaceId),
        eq(schema.agentEvaluations.agentName, agent_name)
      )
    )
    .get();
  if (!evaluation) {
    return NextResponse.json({ error: "No evaluation found" }, { status: 404 });
  }
  return NextResponse.json({
    id: evaluation.id,
    agent_name: evaluation.agentName,
    rubric_text: evaluation.rubricText,
    expected_text: evaluation.expectedText,
    is_enabled: evaluation.isEnabled,
    version: evaluation.version,
  });
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ agent_name: string }> }
) {
  const auth = await authenticateSession(req);
  if (auth instanceof NextResponse) return auth;
  const { agent_name } = await params;
  const body = await req.json();
  const db = getDb();

  const existing = db
    .select()
    .from(schema.agentEvaluations)
    .where(
      and(
        eq(schema.agentEvaluations.workspaceId, auth.workspaceId),
        eq(schema.agentEvaluations.agentName, agent_name)
      )
    )
    .get();

  if (existing) {
    const newVersion = existing.version + 1;
    db.update(schema.agentEvaluations)
      .set({
        rubricText: body.rubric_text ?? existing.rubricText,
        expectedText: body.expected_text ?? existing.expectedText,
        isEnabled: body.is_enabled ?? existing.isEnabled,
        version: newVersion,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(schema.agentEvaluations.id, existing.id))
      .run();
    return NextResponse.json({ id: existing.id, version: newVersion });
  }

  const id = generateId();
  db.insert(schema.agentEvaluations)
    .values({
      id,
      workspaceId: auth.workspaceId,
      agentName: agent_name,
      rubricText: body.rubric_text || null,
      expectedText: body.expected_text || null,
      isEnabled: body.is_enabled ?? true,
    })
    .run();
  return NextResponse.json({ id, version: 1 }, { status: 201 });
}
