import { NextRequest, NextResponse } from "next/server";
import { authenticateSession } from "@/lib/auth";
import { getDb, schema } from "@/db";
import { eq, and } from "drizzle-orm";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ key_id: string }> }
) {
  const auth = await authenticateSession(req);
  if (auth instanceof NextResponse) return auth;
  const { key_id } = await params;
  const db = getDb();

  const key = db
    .select()
    .from(schema.apiKeys)
    .where(and(eq(schema.apiKeys.id, key_id), eq(schema.apiKeys.workspaceId, auth.workspaceId)))
    .get();

  if (!key) {
    return NextResponse.json({ error: "API key not found" }, { status: 404 });
  }

  db.update(schema.apiKeys)
    .set({ revokedAt: new Date().toISOString() })
    .where(eq(schema.apiKeys.id, key_id))
    .run();

  return NextResponse.json({ ok: true });
}
