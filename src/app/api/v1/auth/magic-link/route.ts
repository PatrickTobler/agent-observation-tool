import { NextRequest, NextResponse } from "next/server";
import { getDb, schema } from "@/db";
import { generateId, hashToken } from "@/lib/crypto";
import { randomBytes } from "crypto";
import { eq } from "drizzle-orm";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const email = body.email;
  if (!email || typeof email !== "string") {
    return NextResponse.json({ error: "email is required" }, { status: 400 });
  }

  const db = getDb();

  // Find or create workspace + user for this email
  let user = db
    .select()
    .from(schema.users)
    .where(eq(schema.users.email, email))
    .get();

  let workspaceId: string;
  if (!user) {
    workspaceId = generateId();
    const userId = generateId();
    db.insert(schema.workspaces).values({ id: workspaceId, name: `${email}'s Workspace` }).run();
    db.insert(schema.users).values({ id: userId, workspaceId, email }).run();
    user = { id: userId, workspaceId, email, createdAt: new Date().toISOString() };
  } else {
    workspaceId = user.workspaceId;
  }

  const token = randomBytes(32).toString("hex");
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // 15 min

  db.insert(schema.magicLinks)
    .values({
      id: generateId(),
      workspaceId,
      email,
      tokenHash,
      expiresAt,
    })
    .run();

  // TODO: Send email via inbound.new
  // For now, in dev, return the token in response (remove in production)
  const isDev = process.env.NODE_ENV !== "production";

  return NextResponse.json({
    sent: true,
    ...(isDev ? { token } : {}),
  });
}
