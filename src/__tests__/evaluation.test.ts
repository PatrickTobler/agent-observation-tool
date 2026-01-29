import { setupTestFixtures, type TestFixtures } from "@/lib/test-helpers";
import { eq, and } from "drizzle-orm";
import * as schema from "@/db/schema";
import { generateId } from "@/lib/crypto";

describe("Evaluation CRUD", () => {
  let fixtures: TestFixtures;

  beforeEach(() => {
    fixtures = setupTestFixtures();
  });

  it("creates evaluation version 1", () => {
    const evalId = generateId();
    fixtures.db
      .insert(schema.agentEvaluations)
      .values({
        id: evalId,
        workspaceId: fixtures.workspaceId,
        agentName: "agent-1",
        rubricText: "Answer accurately",
        expectedText: "Correct output",
        isEnabled: true,
        version: 1,
      })
      .run();

    const row = fixtures.db
      .select()
      .from(schema.agentEvaluations)
      .where(eq(schema.agentEvaluations.id, evalId))
      .get();

    expect(row).toBeDefined();
    expect(row!.version).toBe(1);
    expect(row!.rubricText).toBe("Answer accurately");
    expect(row!.expectedText).toBe("Correct output");
    expect(row!.isEnabled).toBeTruthy();
  });

  it("update increments version", () => {
    const evalId = generateId();
    fixtures.db
      .insert(schema.agentEvaluations)
      .values({
        id: evalId,
        workspaceId: fixtures.workspaceId,
        agentName: "agent-1",
        rubricText: "v1 rubric",
        version: 1,
        isEnabled: true,
      })
      .run();

    fixtures.db
      .update(schema.agentEvaluations)
      .set({
        rubricText: "v2 rubric",
        version: 2,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(schema.agentEvaluations.id, evalId))
      .run();

    const row = fixtures.db
      .select()
      .from(schema.agentEvaluations)
      .where(eq(schema.agentEvaluations.id, evalId))
      .get();

    expect(row!.version).toBe(2);
    expect(row!.rubricText).toBe("v2 rubric");
  });

  it("get returns the evaluation for a workspace and agent", () => {
    const evalId = generateId();
    fixtures.db
      .insert(schema.agentEvaluations)
      .values({
        id: evalId,
        workspaceId: fixtures.workspaceId,
        agentName: "agent-1",
        rubricText: "Be helpful",
        isEnabled: true,
        version: 3,
      })
      .run();

    const row = fixtures.db
      .select()
      .from(schema.agentEvaluations)
      .where(
        and(
          eq(schema.agentEvaluations.workspaceId, fixtures.workspaceId),
          eq(schema.agentEvaluations.agentName, "agent-1")
        )
      )
      .get();

    expect(row).toBeDefined();
    expect(row!.version).toBe(3);
  });

  it("disabled evaluation is queryable but marked as not enabled", () => {
    const evalId = generateId();
    fixtures.db
      .insert(schema.agentEvaluations)
      .values({
        id: evalId,
        workspaceId: fixtures.workspaceId,
        agentName: "agent-disabled",
        rubricText: "Some rubric",
        isEnabled: false,
        version: 1,
      })
      .run();

    const enabledRow = fixtures.db
      .select()
      .from(schema.agentEvaluations)
      .where(
        and(
          eq(schema.agentEvaluations.workspaceId, fixtures.workspaceId),
          eq(schema.agentEvaluations.agentName, "agent-disabled"),
          eq(schema.agentEvaluations.isEnabled, true)
        )
      )
      .get();

    expect(enabledRow).toBeUndefined();

    const allRow = fixtures.db
      .select()
      .from(schema.agentEvaluations)
      .where(eq(schema.agentEvaluations.id, evalId))
      .get();

    expect(allRow).toBeDefined();
    expect(allRow!.isEnabled).toBeFalsy();
  });
});
