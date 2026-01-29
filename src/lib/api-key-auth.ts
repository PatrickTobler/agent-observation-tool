import { eq, and, isNull } from "drizzle-orm";
import { apiKeys } from "@/db/schema";
import { sha256 } from "@/lib/hash";
import type { DB } from "@/db";

export type ApiKeyContext = {
  workspaceId: string;
  keyId: string;
  scopes: string[];
};

export async function authenticateApiKey(
  db: DB,
  authHeader: string | null
): Promise<ApiKeyContext | null> {
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }

  const secret = authHeader.slice(7);
  const hash = sha256(secret);

  const key = db
    .select()
    .from(apiKeys)
    .where(and(eq(apiKeys.secretHash, hash), isNull(apiKeys.revokedAt)))
    .get();

  if (!key) {
    return null;
  }

  db.update(apiKeys)
    .set({ lastUsedAt: new Date().toISOString() })
    .where(eq(apiKeys.id, key.id))
    .run();

  return {
    workspaceId: key.workspaceId,
    keyId: key.id,
    scopes: (key.scopes as string[]) || [],
  };
}
