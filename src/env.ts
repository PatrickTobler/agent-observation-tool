export const env = {
  OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY || "",
  JUDGE_MODEL: process.env.JUDGE_MODEL || "anthropic/claude-3.5-haiku",
  INBOUND_NEW_API_KEY: process.env.INBOUND_NEW_API_KEY || "",
  SESSION_SECRET: process.env.SESSION_SECRET || "dev-secret-change-me",
  DATABASE_URL: process.env.DATABASE_URL || "sqlite.db",
};
