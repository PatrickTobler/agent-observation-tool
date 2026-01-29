import { NextRequest, NextResponse } from "next/server";
import { eq, and, isNull } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { hashToken } from "./crypto";

export type ApiKeyContext = {
  workspaceId: string;
  apiKeyId: string;
};

export async function authenticateApiKey(req: NextRequest): Promise<ApiKeyContext | NextResponse> {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Missing or invalid Authorization header" }, { status: 401 });
  }
  const secret = authHeader.slice(7);
  const secretHash = hashToken(secret);
  const db = getDb();
  const key = db
    .select()
    .from(schema.apiKeys)
    .where(and(eq(schema.apiKeys.secretHash, secretHash), isNull(schema.apiKeys.revokedAt)))
    .get();
  if (!key) {
    return NextResponse.json({ error: "Invalid API key" }, { status: 401 });
  }
  db.update(schema.apiKeys)
    .set({ lastUsedAt: new Date().toISOString() })
    .where(eq(schema.apiKeys.id, key.id))
    .run();
  return { workspaceId: key.workspaceId, apiKeyId: key.id };
}

export type SessionContext = {
  userId: string;
  workspaceId: string;
  sessionId: string;
};

export async function authenticateSession(req: NextRequest): Promise<SessionContext | NextResponse> {
  const sessionId = req.cookies.get("session_id")?.value;
  if (!sessionId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  const db = getDb();
  const session = db
    .select()
    .from(schema.sessions)
    .where(and(eq(schema.sessions.id, sessionId), isNull(schema.sessions.revokedAt)))
    .get();
  if (!session) {
    return NextResponse.json({ error: "Invalid session" }, { status: 401 });
  }
  if (new Date(session.expiresAt) < new Date()) {
    return NextResponse.json({ error: "Session expired" }, { status: 401 });
  }
  return { userId: session.userId, workspaceId: session.workspaceId, sessionId: session.id };
}
