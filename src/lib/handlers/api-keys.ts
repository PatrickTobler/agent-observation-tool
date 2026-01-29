import { eq, and, isNull } from "drizzle-orm";
import { apiKeys } from "@/db/schema";
import { generateId, generateApiKeySecret } from "@/lib/id";
import { sha256 } from "@/lib/hash";
import type { DB } from "@/db";

export function handleCreateApiKey(
  db: DB,
  workspaceId: string,
  name: string,
  scopes: string[] = []
) {
  if (!name || typeof name !== "string") {
    return { status: 400 as const, body: { error: "Missing name" } };
  }

  const secret = generateApiKeySecret();
  const id = generateId();

  db.insert(apiKeys)
    .values({
      id,
      workspaceId,
      name,
      secretHash: sha256(secret),
      prefix: secret.slice(0, 8),
      scopes: scopes as string[],
      createdAt: new Date().toISOString(),
    })
    .run();

  return {
    status: 201 as const,
    body: { id, name, prefix: secret.slice(0, 8), secret, scopes },
  };
}

export function handleListApiKeys(db: DB, workspaceId: string) {
  const keys = db
    .select({
      id: apiKeys.id,
      name: apiKeys.name,
      prefix: apiKeys.prefix,
      scopes: apiKeys.scopes,
      createdAt: apiKeys.createdAt,
      lastUsedAt: apiKeys.lastUsedAt,
      revokedAt: apiKeys.revokedAt,
    })
    .from(apiKeys)
    .where(eq(apiKeys.workspaceId, workspaceId))
    .all();

  return { status: 200 as const, body: { keys } };
}

export function handleRevokeApiKey(
  db: DB,
  workspaceId: string,
  keyId: string
) {
  const key = db
    .select()
    .from(apiKeys)
    .where(
      and(
        eq(apiKeys.id, keyId),
        eq(apiKeys.workspaceId, workspaceId)
      )
    )
    .get();

  if (!key) {
    return { status: 404 as const, body: { error: "API key not found" } };
  }

  db.update(apiKeys)
    .set({ revokedAt: new Date().toISOString() })
    .where(eq(apiKeys.id, keyId))
    .run();

  return { status: 200 as const, body: { revoked: true } };
}
