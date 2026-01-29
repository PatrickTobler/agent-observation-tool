import { createTestDb } from "@/db/test-db";
import { apiKeys, workspaces } from "@/db/schema";
import { generateId, generateApiKeySecret } from "@/lib/id";
import { sha256 } from "@/lib/hash";
import type { DB } from "@/db";

export type TestContext = {
  db: DB;
  workspaceId: string;
  apiKeySecret: string;
};

export function setupTestContext(): TestContext {
  const db = createTestDb();
  const workspaceId = generateId();
  const apiKeySecret = generateApiKeySecret();

  db.insert(workspaces)
    .values({
      id: workspaceId,
      name: "Test Workspace",
      createdAt: new Date().toISOString(),
    })
    .run();

  db.insert(apiKeys)
    .values({
      id: generateId(),
      workspaceId,
      name: "Test Key",
      secretHash: sha256(apiKeySecret),
      prefix: apiKeySecret.slice(0, 8),
      scopes: ["ingest"],
      createdAt: new Date().toISOString(),
    })
    .run();

  return { db, workspaceId, apiKeySecret };
}

export function validEventPayload(overrides: Record<string, unknown> = {}) {
  return {
    agent_name: "test-agent",
    task_id: "task-001",
    interaction_type: "UserInput",
    message: "Hello",
    ts: new Date().toISOString(),
    ...overrides,
  };
}
