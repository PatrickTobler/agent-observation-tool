import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

export const workspaces = sqliteTable("workspaces", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  workspaceId: text("workspace_id")
    .notNull()
    .references(() => workspaces.id),
  email: text("email").notNull(),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

export const magicLinks = sqliteTable("magic_links", {
  id: text("id").primaryKey(),
  workspaceId: text("workspace_id")
    .notNull()
    .references(() => workspaces.id),
  email: text("email").notNull(),
  tokenHash: text("token_hash").notNull(),
  expiresAt: text("expires_at").notNull(),
  usedAt: text("used_at"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

export const sessions = sqliteTable("sessions", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id),
  workspaceId: text("workspace_id")
    .notNull()
    .references(() => workspaces.id),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
  expiresAt: text("expires_at").notNull(),
  revokedAt: text("revoked_at"),
});

export const apiKeys = sqliteTable("api_keys", {
  id: text("id").primaryKey(),
  workspaceId: text("workspace_id")
    .notNull()
    .references(() => workspaces.id),
  name: text("name").notNull(),
  secretHash: text("secret_hash").notNull(),
  prefix: text("prefix").notNull(),
  scopes: text("scopes", { mode: "json" }).$type<string[]>().notNull().default([]),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
  lastUsedAt: text("last_used_at"),
  revokedAt: text("revoked_at"),
});

export const evalEvents = sqliteTable("eval_events", {
  id: text("id").primaryKey(),
  workspaceId: text("workspace_id")
    .notNull()
    .references(() => workspaces.id),
  agentName: text("agent_name").notNull(),
  taskId: text("task_id").notNull(),
  interactionType: text("interaction_type", {
    enum: [
      "UserInput",
      "ToolCall",
      "McpCall",
      "SkillCall",
      "Reasoning",
      "Result",
      "Error",
    ],
  }).notNull(),
  message: text("message"),
  payloadJson: text("payload_json"),
  resultJson: text("result_json"),
  errorJson: text("error_json"),
  ts: text("ts").notNull(),
  receivedAt: text("received_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

export const agentEvaluations = sqliteTable("agent_evaluations", {
  id: text("id").primaryKey(),
  workspaceId: text("workspace_id")
    .notNull()
    .references(() => workspaces.id),
  agentName: text("agent_name").notNull(),
  rubricText: text("rubric_text"),
  expectedText: text("expected_text"),
  isEnabled: integer("is_enabled", { mode: "boolean" }).notNull().default(true),
  version: integer("version").notNull().default(1),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

export const evalScores = sqliteTable("eval_scores", {
  id: text("id").primaryKey(),
  workspaceId: text("workspace_id")
    .notNull()
    .references(() => workspaces.id),
  taskId: text("task_id").notNull(),
  agentName: text("agent_name").notNull(),
  evaluationId: text("evaluation_id")
    .notNull()
    .references(() => agentEvaluations.id),
  evaluationVersion: integer("evaluation_version").notNull(),
  score1To10: integer("score_1_to_10"),
  verdictText: text("verdict_text"),
  llmModel: text("llm_model"),
  promptHash: text("prompt_hash"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
  errorJson: text("error_json"),
});

export const INTERACTION_TYPES = [
  "UserInput",
  "ToolCall",
  "McpCall",
  "SkillCall",
  "Reasoning",
  "Result",
  "Error",
] as const;

export type InteractionType = (typeof INTERACTION_TYPES)[number];

export type Workspace = typeof workspaces.$inferSelect;
export type User = typeof users.$inferSelect;
export type Session = typeof sessions.$inferSelect;
export type ApiKey = typeof apiKeys.$inferSelect;
export type EvalEvent = typeof evalEvents.$inferSelect;
export type AgentEvaluation = typeof agentEvaluations.$inferSelect;
export type EvalScore = typeof evalScores.$inferSelect;
