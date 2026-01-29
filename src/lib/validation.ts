const INTERACTION_TYPES = [
  "UserInput", "ToolCall", "McpCall", "SkillCall", "Reasoning", "Result", "Error",
] as const;

export type InteractionType = typeof INTERACTION_TYPES[number];

export function isValidInteractionType(type: string): type is InteractionType {
  return INTERACTION_TYPES.includes(type as InteractionType);
}

export function isValidISOTimestamp(ts: string): boolean {
  const d = new Date(ts);
  return !isNaN(d.getTime());
}

export type EventInput = {
  agent_name: string;
  task_id: string;
  interaction_type: InteractionType;
  message?: string;
  payload_json?: unknown;
  result_json?: unknown;
  error_json?: unknown;
  ts: string;
};

export function validateEventInput(body: unknown): { valid: true; data: EventInput } | { valid: false; error: string } {
  if (!body || typeof body !== "object") return { valid: false, error: "Request body must be a JSON object" };
  const b = body as Record<string, unknown>;
  if (!b.agent_name || typeof b.agent_name !== "string") return { valid: false, error: "agent_name is required" };
  if (!b.task_id || typeof b.task_id !== "string") return { valid: false, error: "task_id is required" };
  if (!b.interaction_type || typeof b.interaction_type !== "string") return { valid: false, error: "interaction_type is required" };
  if (!isValidInteractionType(b.interaction_type)) return { valid: false, error: `Invalid interaction_type: ${b.interaction_type}` };
  if (!b.ts || typeof b.ts !== "string") return { valid: false, error: "ts is required" };
  if (!isValidISOTimestamp(b.ts)) return { valid: false, error: `Invalid timestamp: ${b.ts}` };
  return {
    valid: true,
    data: {
      agent_name: b.agent_name,
      task_id: b.task_id,
      interaction_type: b.interaction_type as InteractionType,
      message: typeof b.message === "string" ? b.message : undefined,
      payload_json: b.payload_json,
      result_json: b.result_json,
      error_json: b.error_json,
      ts: b.ts,
    },
  };
}
