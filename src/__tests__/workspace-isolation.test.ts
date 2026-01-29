import { setupTestFixtures, createTestDb } from "@/lib/test-helpers";
import { eq, and } from "drizzle-orm";
import * as schema from "@/db/schema";
import { generateId, hashToken, generateApiKey } from "@/lib/crypto";
import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";

describe("Workspace isolation", () => {
  let db: BetterSQLite3Database<typeof schema>;
  let wsA: string;
  let wsB: string;

  beforeEach(() => {
    db = createTestDb();

    wsA = generateId();
    wsB = generateId();

    db.insert(schema.workspaces).values({ id: wsA, name: "Workspace A" }).run();
    db.insert(schema.workspaces).values({ id: wsB, name: "Workspace B" }).run();
  });

  function insertEvent(workspaceId: string, agentName: string, taskId: string, type: string) {
    db.insert(schema.evalEvents)
      .values({
        id: generateId(),
        workspaceId,
        agentName,
        taskId,
        interactionType: type as any,
        ts: new Date().toISOString(),
      })
      .run();
  }

  it("events from workspace A are not visible to workspace B", () => {
    insertEvent(wsA, "agent-1", "task-a1", "UserInput");
    insertEvent(wsA, "agent-1", "task-a2", "Result");
    insertEvent(wsB, "agent-1", "task-b1", "UserInput");

    const eventsA = db
      .select()
      .from(schema.evalEvents)
      .where(eq(schema.evalEvents.workspaceId, wsA))
      .all();

    const eventsB = db
      .select()
      .from(schema.evalEvents)
      .where(eq(schema.evalEvents.workspaceId, wsB))
      .all();

    expect(eventsA).toHaveLength(2);
    expect(eventsB).toHaveLength(1);

    expect(eventsA.every((e) => e.workspaceId === wsA)).toBe(true);
    expect(eventsB.every((e) => e.workspaceId === wsB)).toBe(true);
  });

  it("two workspaces with same agent name see only their own data", () => {
    const sharedAgentName = "shared-agent";

    insertEvent(wsA, sharedAgentName, "task-a", "UserInput");
    insertEvent(wsA, sharedAgentName, "task-a", "Result");
    insertEvent(wsB, sharedAgentName, "task-b", "UserInput");
    insertEvent(wsB, sharedAgentName, "task-b", "ToolCall");
    insertEvent(wsB, sharedAgentName, "task-b", "Error");

    const eventsA = db
      .select()
      .from(schema.evalEvents)
      .where(
        and(
          eq(schema.evalEvents.workspaceId, wsA),
          eq(schema.evalEvents.agentName, sharedAgentName)
        )
      )
      .all();

    const eventsB = db
      .select()
      .from(schema.evalEvents)
      .where(
        and(
          eq(schema.evalEvents.workspaceId, wsB),
          eq(schema.evalEvents.agentName, sharedAgentName)
        )
      )
      .all();

    expect(eventsA).toHaveLength(2);
    expect(eventsB).toHaveLength(3);

    expect(eventsA.map((e) => e.taskId)).toEqual(["task-a", "task-a"]);
    expect(eventsB.every((e) => e.taskId === "task-b")).toBe(true);
  });

  it("evaluations are isolated per workspace", () => {
    const agentName = "shared-agent";

    db.insert(schema.agentEvaluations)
      .values({
        id: generateId(),
        workspaceId: wsA,
        agentName,
        rubricText: "Rubric A",
        isEnabled: true,
        version: 1,
      })
      .run();

    db.insert(schema.agentEvaluations)
      .values({
        id: generateId(),
        workspaceId: wsB,
        agentName,
        rubricText: "Rubric B",
        isEnabled: true,
        version: 1,
      })
      .run();

    const evalA = db
      .select()
      .from(schema.agentEvaluations)
      .where(
        and(
          eq(schema.agentEvaluations.workspaceId, wsA),
          eq(schema.agentEvaluations.agentName, agentName)
        )
      )
      .get();

    const evalB = db
      .select()
      .from(schema.agentEvaluations)
      .where(
        and(
          eq(schema.agentEvaluations.workspaceId, wsB),
          eq(schema.agentEvaluations.agentName, agentName)
        )
      )
      .get();

    expect(evalA!.rubricText).toBe("Rubric A");
    expect(evalB!.rubricText).toBe("Rubric B");
  });

  it("API keys are isolated per workspace", () => {
    const userA = generateId();
    const userB = generateId();
    db.insert(schema.users).values({ id: userA, workspaceId: wsA, email: "a@test.com" }).run();
    db.insert(schema.users).values({ id: userB, workspaceId: wsB, email: "b@test.com" }).run();

    const keyA = generateApiKey();
    const keyB = generateApiKey();

    db.insert(schema.apiKeys)
      .values({
        id: generateId(),
        workspaceId: wsA,
        name: "Key A",
        secretHash: hashToken(keyA.secret),
        prefix: keyA.prefix,
      })
      .run();

    db.insert(schema.apiKeys)
      .values({
        id: generateId(),
        workspaceId: wsB,
        name: "Key B",
        secretHash: hashToken(keyB.secret),
        prefix: keyB.prefix,
      })
      .run();

    const resolvedA = db
      .select()
      .from(schema.apiKeys)
      .where(eq(schema.apiKeys.secretHash, hashToken(keyA.secret)))
      .get();

    const resolvedB = db
      .select()
      .from(schema.apiKeys)
      .where(eq(schema.apiKeys.secretHash, hashToken(keyB.secret)))
      .get();

    expect(resolvedA!.workspaceId).toBe(wsA);
    expect(resolvedB!.workspaceId).toBe(wsB);
    expect(resolvedA!.workspaceId).not.toBe(resolvedB!.workspaceId);
  });
});
