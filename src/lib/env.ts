export const env = {
  get DATABASE_URL() {
    return process.env.DATABASE_URL || "./data/app.db";
  },
  get SESSION_SECRET() {
    return process.env.SESSION_SECRET || "dev-secret";
  },
  get OPENROUTER_API_KEY() {
    return process.env.OPENROUTER_API_KEY || "";
  },
  get JUDGE_MODEL() {
    return process.env.JUDGE_MODEL || "anthropic/claude-3.5-haiku";
  },
  get INBOUND_NEW_API_KEY() {
    return process.env.INBOUND_NEW_API_KEY || "";
  },
  get BASE_URL() {
    return process.env.BASE_URL || "http://localhost:3000";
  },
};
