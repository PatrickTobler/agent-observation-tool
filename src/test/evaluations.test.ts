import { describe, it, expect, beforeEach } from "vitest";
import {
  handlePutEvaluation,
  handleGetEvaluation,
} from "@/lib/handlers/evaluations";
import { createTestDb } from "@/db/test-db";
import { workspaces } from "@/db/schema";
import { generateId } from "@/lib/id";
import type { DB } from "@/db";

describe("Evaluation CRUD", () => {
  let db: DB;
  let workspaceId: string;

  beforeEach(() => {
    db = createTestDb();
    workspaceId = generateId();
    db.insert(workspaces)
      .values({
        id: workspaceId,
        name: "Test Workspace",
        createdAt: new Date().toISOString(),
      })
      .run();
  });

  it("put_evaluation_creates_version_1", () => {
    const result = handlePutEvaluation(db, workspaceId, "my-agent", {
      rubric_text: "Check if output is correct",
      expected_text: "Expected answer",
    });

    expect(result.status).toBe(201);
    expect(result.body.version).toBe(1);
  });

  it("put_evaluation_updates_increments_version", () => {
    handlePutEvaluation(db, workspaceId, "my-agent", {
      rubric_text: "V1 rubric",
    });

    const result = handlePutEvaluation(db, workspaceId, "my-agent", {
      rubric_text: "V2 rubric",
    });

    expect(result.status).toBe(200);
    expect(result.body.version).toBe(2);
  });

  it("get_evaluation_returns_latest", () => {
    handlePutEvaluation(db, workspaceId, "my-agent", {
      rubric_text: "V1",
    });
    handlePutEvaluation(db, workspaceId, "my-agent", {
      rubric_text: "V2",
    });

    const result = handleGetEvaluation(db, workspaceId, "my-agent");
    expect(result.status).toBe(200);
    if (result.status === 200) {
      expect(result.body.version).toBe(2);
      expect(result.body.rubric_text).toBe("V2");
    }
  });

  it("disabled_evaluation_is_respected", () => {
    handlePutEvaluation(db, workspaceId, "my-agent", {
      rubric_text: "Rubric",
      is_enabled: false,
    });

    const result = handleGetEvaluation(db, workspaceId, "my-agent");
    expect(result.status).toBe(200);
    if (result.status === 200) {
      expect(result.body.is_enabled).toBe(false);
    }
  });
});
