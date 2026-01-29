import { NextRequest, NextResponse } from "next/server";
import { getDb, schema } from "@/db";
import { eq } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const sessionId = req.cookies.get("session_id")?.value;
  if (sessionId) {
    const db = getDb();
    db.update(schema.sessions)
      .set({ revokedAt: new Date().toISOString() })
      .where(eq(schema.sessions.id, sessionId))
      .run();
  }

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || req.url;
  const response = NextResponse.redirect(new URL("/", baseUrl));
  response.cookies.delete("session_id");
  return response;
}
