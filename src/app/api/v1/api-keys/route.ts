import { NextRequest, NextResponse } from "next/server";
import { authenticateSession } from "@/lib/auth";
import { getDb, schema } from "@/db";
import { eq, and, isNull } from "drizzle-orm";
import { generateId, generateApiKey, hashToken } from "@/lib/crypto";

export async function POST(req: NextRequest) {
  const auth = await authenticateSession(req);
  if (auth instanceof NextResponse) return auth;

  const body = await req.json();
  if (!body.name || typeof body.name !== "string") {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  const { secret, prefix } = generateApiKey();
  const id = generateId();
  const db = getDb();

  db.insert(schema.apiKeys)
    .values({
      id,
      workspaceId: auth.workspaceId,
      name: body.name,
      secretHash: hashToken(secret),
      prefix,
      scopes: body.scopes || [],
    })
    .run();

  return NextResponse.json({ id, secret, prefix, name: body.name }, { status: 201 });
}

export async function GET(req: NextRequest) {
  const auth = await authenticateSession(req);
  if (auth instanceof NextResponse) return auth;

  const db = getDb();
  const keys = db
    .select({
      id: schema.apiKeys.id,
      name: schema.apiKeys.name,
      prefix: schema.apiKeys.prefix,
      scopes: schema.apiKeys.scopes,
      createdAt: schema.apiKeys.createdAt,
      lastUsedAt: schema.apiKeys.lastUsedAt,
      revokedAt: schema.apiKeys.revokedAt,
    })
    .from(schema.apiKeys)
    .where(eq(schema.apiKeys.workspaceId, auth.workspaceId))
    .all();

  return NextResponse.json({ data: keys });
}
