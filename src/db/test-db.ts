import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { sql } from "drizzle-orm";
import * as schema from "./schema";
import type { DB } from "./index";

export function createTestDb(): DB {
  const sqlite = new Database(":memory:");
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  const testDb = drizzle(sqlite, { schema });

  testDb.run(sql`CREATE TABLE IF NOT EXISTS workspaces (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    created_at TEXT NOT NULL
  )`);

  testDb.run(sql`CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    workspace_id TEXT NOT NULL REFERENCES workspaces(id),
    email TEXT NOT NULL,
    created_at TEXT NOT NULL
  )`);

  testDb.run(sql`CREATE TABLE IF NOT EXISTS magic_links (
    id TEXT PRIMARY KEY,
    workspace_id TEXT NOT NULL REFERENCES workspaces(id),
    email TEXT NOT NULL,
    token_hash TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    used_at TEXT,
    created_at TEXT NOT NULL
  )`);

  testDb.run(sql`CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id),
    workspace_id TEXT NOT NULL REFERENCES workspaces(id),
    created_at TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    revoked_at TEXT
  )`);

  testDb.run(sql`CREATE TABLE IF NOT EXISTS api_keys (
    id TEXT PRIMARY KEY,
    workspace_id TEXT NOT NULL REFERENCES workspaces(id),
    name TEXT NOT NULL,
    secret_hash TEXT NOT NULL,
    prefix TEXT NOT NULL,
    scopes TEXT NOT NULL DEFAULT '[]',
    created_at TEXT NOT NULL,
    last_used_at TEXT,
    revoked_at TEXT
  )`);

  testDb.run(sql`CREATE TABLE IF NOT EXISTS eval_events (
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
    received_at TEXT NOT NULL
  )`);

  testDb.run(sql`CREATE INDEX IF NOT EXISTS idx_events_workspace_agent_ts
    ON eval_events(workspace_id, agent_name, ts)`);

  testDb.run(sql`CREATE INDEX IF NOT EXISTS idx_events_workspace_task_ts
    ON eval_events(workspace_id, task_id, ts)`);

  testDb.run(sql`CREATE TABLE IF NOT EXISTS agent_evaluations (
    id TEXT PRIMARY KEY,
    workspace_id TEXT NOT NULL REFERENCES workspaces(id),
    agent_name TEXT NOT NULL,
    rubric_text TEXT,
    expected_text TEXT,
    is_enabled INTEGER NOT NULL DEFAULT 1,
    version INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`);

  testDb.run(sql`CREATE TABLE IF NOT EXISTS eval_scores (
    id TEXT PRIMARY KEY,
    workspace_id TEXT NOT NULL REFERENCES workspaces(id),
    task_id TEXT NOT NULL,
    agent_name TEXT NOT NULL,
    evaluation_id TEXT NOT NULL REFERENCES agent_evaluations(id),
    evaluation_version INTEGER NOT NULL,
    score_1_to_10 INTEGER,
    verdict_text TEXT,
    llm_model TEXT NOT NULL,
    prompt_hash TEXT NOT NULL,
    created_at TEXT NOT NULL,
    error_json TEXT
  )`);

  return testDb;
}
