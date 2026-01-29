import Database from "better-sqlite3";
import { drizzle, BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import * as schema from "@/db/schema";
import { generateId, hashToken, generateApiKey } from "./crypto";

export function createTestDb(): BetterSQLite3Database<typeof schema> {
  const sqlite = new Database(":memory:");
  sqlite.pragma("foreign_keys = ON");
  const db = drizzle(sqlite, { schema });

  // Create tables manually for in-memory DB
  sqlite.exec(`
    CREATE TABLE workspaces (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE users (
      id TEXT PRIMARY KEY,
      workspace_id TEXT NOT NULL REFERENCES workspaces(id),
      email TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE magic_links (
      id TEXT PRIMARY KEY,
      workspace_id TEXT NOT NULL REFERENCES workspaces(id),
      email TEXT NOT NULL,
      token_hash TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      used_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      workspace_id TEXT NOT NULL REFERENCES workspaces(id),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      expires_at TEXT NOT NULL,
      revoked_at TEXT
    );
    CREATE TABLE api_keys (
      id TEXT PRIMARY KEY,
      workspace_id TEXT NOT NULL REFERENCES workspaces(id),
      name TEXT NOT NULL,
      secret_hash TEXT NOT NULL,
      prefix TEXT NOT NULL,
      scopes TEXT NOT NULL DEFAULT '[]',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      last_used_at TEXT,
      revoked_at TEXT
    );
    CREATE TABLE eval_events (
      id TEXT PRIMARY KEY,
      workspace_id TEXT NOT NULL REFERENCES workspaces(id),
      agent_name TEXT NOT NULL,
      task_id TEXT NOT NULL,
      interaction_type TEXT NOT NULL,
      message TEXT,
      payload_json TEXT,
      result_json TEXT,
      error_json TEXT,
      ts TEXT NOT NULL,
      received_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE agent_evaluations (
      id TEXT PRIMARY KEY,
      workspace_id TEXT NOT NULL REFERENCES workspaces(id),
      agent_name TEXT NOT NULL,
      rubric_text TEXT,
      expected_text TEXT,
      is_enabled INTEGER NOT NULL DEFAULT 1,
      version INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE eval_scores (
      id TEXT PRIMARY KEY,
      workspace_id TEXT NOT NULL REFERENCES workspaces(id),
      task_id TEXT NOT NULL,
      agent_name TEXT NOT NULL,
      evaluation_id TEXT NOT NULL REFERENCES agent_evaluations(id),
      evaluation_version INTEGER NOT NULL,
      score_1_to_10 INTEGER,
      verdict_text TEXT,
      llm_model TEXT,
      prompt_hash TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      error_json TEXT
    );
    CREATE INDEX idx_events_workspace_agent ON eval_events(workspace_id, agent_name, ts);
    CREATE INDEX idx_events_workspace_task ON eval_events(workspace_id, task_id, ts);
  `);

  return db;
}

export type TestFixtures = {
  db: BetterSQLite3Database<typeof schema>;
  workspaceId: string;
  apiKeySecret: string;
  apiKeyId: string;
  userId: string;
  sessionId: string;
};

export function setupTestFixtures(): TestFixtures {
  const db = createTestDb();
  const workspaceId = generateId();
  const userId = generateId();
  const apiKeyId = generateId();
  const sessionId = generateId();
  const { secret, prefix } = generateApiKey();

  db.insert(schema.workspaces).values({ id: workspaceId, name: "Test Workspace" }).run();
  db.insert(schema.users).values({ id: userId, workspaceId, email: "test@example.com" }).run();
  db.insert(schema.apiKeys)
    .values({
      id: apiKeyId,
      workspaceId,
      name: "Test Key",
      secretHash: hashToken(secret),
      prefix,
    })
    .run();
  db.insert(schema.sessions)
    .values({
      id: sessionId,
      userId,
      workspaceId,
      expiresAt: new Date(Date.now() + 86400000).toISOString(),
    })
    .run();

  return { db, workspaceId, apiKeySecret: secret, apiKeyId, userId, sessionId };
}
