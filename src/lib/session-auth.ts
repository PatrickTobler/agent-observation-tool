import { eq, and, isNull } from "drizzle-orm";
import { sessions } from "@/db/schema";
import type { DB } from "@/db";
import { cookies } from "next/headers";

export type SessionContext = {
  userId: string;
  workspaceId: string;
  sessionId: string;
};

export async function authenticateSession(
  db: DB
): Promise<SessionContext | null> {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get("session_id")?.value;
  if (!sessionId) return null;

  const session = db
    .select()
    .from(sessions)
    .where(and(eq(sessions.id, sessionId), isNull(sessions.revokedAt)))
    .get();

  if (!session) return null;
  if (new Date(session.expiresAt) < new Date()) return null;

  return {
    userId: session.userId,
    workspaceId: session.workspaceId,
    sessionId: session.id,
  };
}

export function authenticateSessionFromHeader(
  db: DB,
  sessionId: string | null
): SessionContext | null {
  if (!sessionId) return null;

  const session = db
    .select()
    .from(sessions)
    .where(and(eq(sessions.id, sessionId), isNull(sessions.revokedAt)))
    .get();

  if (!session) return null;
  if (new Date(session.expiresAt) < new Date()) return null;

  return {
    userId: session.userId,
    workspaceId: session.workspaceId,
    sessionId: session.id,
  };
}
