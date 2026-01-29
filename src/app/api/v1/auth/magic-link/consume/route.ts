import { NextRequest, NextResponse } from "next/server";
import { getDb, schema } from "@/db";
import { hashToken, generateId } from "@/lib/crypto";
import { eq, and, isNull } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  if (!token) {
    return NextResponse.json({ error: "token is required" }, { status: 400 });
  }

  const db = getDb();
  const tokenHash = hashToken(token);

  const magicLink = db
    .select()
    .from(schema.magicLinks)
    .where(and(eq(schema.magicLinks.tokenHash, tokenHash), isNull(schema.magicLinks.usedAt)))
    .get();

  if (!magicLink) {
    return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 });
  }

  if (new Date(magicLink.expiresAt) < new Date()) {
    return NextResponse.json({ error: "Token expired" }, { status: 401 });
  }

  // Mark as used
  db.update(schema.magicLinks)
    .set({ usedAt: new Date().toISOString() })
    .where(eq(schema.magicLinks.id, magicLink.id))
    .run();

  // Find user
  const user = db
    .select()
    .from(schema.users)
    .where(eq(schema.users.email, magicLink.email))
    .get();

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // Create session
  const sessionId = generateId();
  db.insert(schema.sessions)
    .values({
      id: sessionId,
      userId: user.id,
      workspaceId: magicLink.workspaceId,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
    })
    .run();

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || req.url;
  const response = NextResponse.redirect(new URL("/app/agents", baseUrl));
  response.cookies.set("session_id", sessionId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 30 * 24 * 60 * 60,
    path: "/",
  });

  return response;
}
