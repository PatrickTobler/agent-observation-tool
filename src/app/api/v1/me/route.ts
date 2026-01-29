import { NextRequest, NextResponse } from "next/server";
import { authenticateSession } from "@/lib/auth";
import { getDb, schema } from "@/db";
import { eq } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const auth = await authenticateSession(req);
  if (auth instanceof NextResponse) return auth;

  const db = getDb();
  const user = db.select().from(schema.users).where(eq(schema.users.id, auth.userId)).get();
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json({
    user_id: user.id,
    email: user.email,
    workspace_id: auth.workspaceId,
  });
}
