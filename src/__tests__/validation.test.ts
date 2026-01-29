import { validateEventInput } from "@/lib/validation";

describe("validateEventInput", () => {
  const validEvent = {
    agent_name: "test-agent",
    task_id: "task-001",
    interaction_type: "UserInput",
    ts: "2025-01-15T10:00:00.000Z",
  };

  it("returns valid:true for a valid event", () => {
    const result = validateEventInput(validEvent);
    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.data.agent_name).toBe("test-agent");
      expect(result.data.task_id).toBe("task-001");
      expect(result.data.interaction_type).toBe("UserInput");
      expect(result.data.ts).toBe("2025-01-15T10:00:00.000Z");
    }
  });

  it("returns error when agent_name is missing", () => {
    const result = validateEventInput({ ...validEvent, agent_name: undefined });
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.error).toContain("agent_name");
    }
  });

  it("returns error when task_id is missing", () => {
    const result = validateEventInput({ ...validEvent, task_id: undefined });
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.error).toContain("task_id");
    }
  });

  it("returns error for invalid interaction_type", () => {
    const result = validateEventInput({ ...validEvent, interaction_type: "InvalidType" });
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.error).toContain("Invalid interaction_type");
    }
  });

  it("returns error for invalid timestamp", () => {
    const result = validateEventInput({ ...validEvent, ts: "not-a-date" });
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.error).toContain("Invalid timestamp");
    }
  });

  it("returns error when ts is missing", () => {
    const result = validateEventInput({ ...validEvent, ts: undefined });
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.error).toContain("ts");
    }
  });

  it("returns error for null body", () => {
    const result = validateEventInput(null);
    expect(result.valid).toBe(false);
  });

  it("returns error for non-object body", () => {
    const result = validateEventInput("string");
    expect(result.valid).toBe(false);
  });

  it("accepts all valid interaction types", () => {
    const types = ["UserInput", "ToolCall", "McpCall", "SkillCall", "Reasoning", "Result", "Error"];
    for (const type of types) {
      const result = validateEventInput({ ...validEvent, interaction_type: type });
      expect(result.valid).toBe(true);
    }
  });

  it("preserves optional fields when provided", () => {
    const result = validateEventInput({
      ...validEvent,
      message: "hello",
      payload_json: { key: "value" },
      result_json: { output: 42 },
      error_json: { err: "oops" },
    });
    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.data.message).toBe("hello");
      expect(result.data.payload_json).toEqual({ key: "value" });
      expect(result.data.result_json).toEqual({ output: 42 });
      expect(result.data.error_json).toEqual({ err: "oops" });
    }
  });

  it("sets message to undefined when not a string", () => {
    const result = validateEventInput({ ...validEvent, message: 123 });
    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.data.message).toBeUndefined();
    }
  });
});
