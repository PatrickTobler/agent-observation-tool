import { describe, it, expect, beforeEach } from "vitest";
import {
  handleCreateApiKey,
  handleListApiKeys,
  handleRevokeApiKey,
} from "@/lib/handlers/api-keys";
import { handleIngest } from "@/lib/handlers/ingest";
import { authenticateApiKey } from "@/lib/api-key-auth";
import { createTestDb } from "@/db/test-db";
import { workspaces, apiKeys } from "@/db/schema";
import { generateId } from "@/lib/id";
import { eq } from "drizzle-orm";
import { validEventPayload } from "./helpers";
import type { DB } from "@/db";

describe("API Key Management", () => {
  let db: DB;
  let workspaceId: string;

  beforeEach(() => {
    db = createTestDb();
    workspaceId = generateId();
    db.insert(workspaces)
      .values({
        id: workspaceId,
        name: "Test Workspace",
        createdAt: new Date().toISOString(),
      })
      .run();
  });

  it("create_api_key_returns_secret_once", () => {
    const result = handleCreateApiKey(db, workspaceId, "My Key", ["ingest"]);
    expect(result.status).toBe(201);
    expect(result.body).toHaveProperty("secret");
    expect(result.body).toHaveProperty("id");
    expect(result.body).toHaveProperty("prefix");
    expect(result.body.secret).toMatch(/^aot_/);
  });

  it("list_api_keys_does_not_return_secret", () => {
    handleCreateApiKey(db, workspaceId, "Key 1", ["ingest"]);
    handleCreateApiKey(db, workspaceId, "Key 2", ["ingest"]);

    const result = handleListApiKeys(db, workspaceId);
    expect(result.status).toBe(200);
    expect(result.body.keys.length).toBe(2);

    for (const key of result.body.keys) {
      expect(key).not.toHaveProperty("secret");
      expect(key).not.toHaveProperty("secretHash");
      expect(key).toHaveProperty("prefix");
    }
  });

  it("revoke_api_key_blocks_ingest", async () => {
    const createResult = handleCreateApiKey(db, workspaceId, "Key", ["ingest"]);
    const secret = (createResult.body as { secret: string }).secret;
    const keyId = (createResult.body as { id: string }).id;

    // Key works before revocation
    const auth1 = await authenticateApiKey(db, `Bearer ${secret}`);
    expect(auth1).not.toBeNull();

    // Revoke
    handleRevokeApiKey(db, workspaceId, keyId);

    // Key should fail after revocation
    const auth2 = await authenticateApiKey(db, `Bearer ${secret}`);
    expect(auth2).toBeNull();
  });

  it("last_used_at_updates_on_ingest", async () => {
    const createResult = handleCreateApiKey(db, workspaceId, "Key", ["ingest"]);
    const secret = (createResult.body as { secret: string }).secret;
    const keyId = (createResult.body as { id: string }).id;

    // Before ingest, lastUsedAt should be null
    const beforeKey = db
      .select()
      .from(apiKeys)
      .where(eq(apiKeys.id, keyId))
      .get();
    expect(beforeKey!.lastUsedAt).toBeNull();

    // Do an ingest
    await handleIngest(db, `Bearer ${secret}`, validEventPayload());

    // After ingest, lastUsedAt should be set
    const afterKey = db
      .select()
      .from(apiKeys)
      .where(eq(apiKeys.id, keyId))
      .get();
    expect(afterKey!.lastUsedAt).not.toBeNull();
  });
});
