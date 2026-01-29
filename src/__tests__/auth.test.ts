import { setupTestFixtures, type TestFixtures } from "@/lib/test-helpers";
import { eq } from "drizzle-orm";
import * as schema from "@/db/schema";
import { hashToken, generateApiKey, generateId } from "@/lib/crypto";

describe("API key authentication", () => {
  let fixtures: TestFixtures;

  beforeEach(() => {
    fixtures = setupTestFixtures();
  });

  it("valid API key resolves workspace via hash match", () => {
    const secretHash = hashToken(fixtures.apiKeySecret);
    const row = fixtures.db
      .select()
      .from(schema.apiKeys)
      .where(eq(schema.apiKeys.secretHash, secretHash))
      .get();

    expect(row).toBeDefined();
    expect(row!.workspaceId).toBe(fixtures.workspaceId);
    expect(row!.revokedAt).toBeNull();
  });

  it("invalid key returns no match", () => {
    const badHash = hashToken("aot_wrong_key_value");
    const row = fixtures.db
      .select()
      .from(schema.apiKeys)
      .where(eq(schema.apiKeys.secretHash, badHash))
      .get();

    expect(row).toBeUndefined();
  });

  it("revoked key is detectable", () => {
    fixtures.db
      .update(schema.apiKeys)
      .set({ revokedAt: new Date().toISOString() })
      .where(eq(schema.apiKeys.id, fixtures.apiKeyId))
      .run();

    const secretHash = hashToken(fixtures.apiKeySecret);
    const row = fixtures.db
      .select()
      .from(schema.apiKeys)
      .where(eq(schema.apiKeys.secretHash, secretHash))
      .get();

    expect(row).toBeDefined();
    expect(row!.revokedAt).not.toBeNull();
  });

  it("last_used_at is updated on key use", () => {
    const before = fixtures.db
      .select()
      .from(schema.apiKeys)
      .where(eq(schema.apiKeys.id, fixtures.apiKeyId))
      .get();
    expect(before!.lastUsedAt).toBeNull();

    const now = new Date().toISOString();
    fixtures.db
      .update(schema.apiKeys)
      .set({ lastUsedAt: now })
      .where(eq(schema.apiKeys.id, fixtures.apiKeyId))
      .run();

    const after = fixtures.db
      .select()
      .from(schema.apiKeys)
      .where(eq(schema.apiKeys.id, fixtures.apiKeyId))
      .get();
    expect(after!.lastUsedAt).toBe(now);
  });
});

describe("Session authentication", () => {
  let fixtures: TestFixtures;

  beforeEach(() => {
    fixtures = setupTestFixtures();
  });

  it("valid session resolves user", () => {
    const session = fixtures.db
      .select()
      .from(schema.sessions)
      .where(eq(schema.sessions.id, fixtures.sessionId))
      .get();

    expect(session).toBeDefined();
    expect(session!.userId).toBe(fixtures.userId);
    expect(session!.workspaceId).toBe(fixtures.workspaceId);
    expect(new Date(session!.expiresAt).getTime()).toBeGreaterThan(Date.now());
    expect(session!.revokedAt).toBeNull();
  });

  it("expired session is detectable", () => {
    const expiredSessionId = generateId();
    fixtures.db
      .insert(schema.sessions)
      .values({
        id: expiredSessionId,
        userId: fixtures.userId,
        workspaceId: fixtures.workspaceId,
        expiresAt: new Date(Date.now() - 86400000).toISOString(),
      })
      .run();

    const session = fixtures.db
      .select()
      .from(schema.sessions)
      .where(eq(schema.sessions.id, expiredSessionId))
      .get();

    expect(session).toBeDefined();
    expect(new Date(session!.expiresAt).getTime()).toBeLessThan(Date.now());
  });

  it("revoked session is detectable", () => {
    fixtures.db
      .update(schema.sessions)
      .set({ revokedAt: new Date().toISOString() })
      .where(eq(schema.sessions.id, fixtures.sessionId))
      .run();

    const session = fixtures.db
      .select()
      .from(schema.sessions)
      .where(eq(schema.sessions.id, fixtures.sessionId))
      .get();

    expect(session).toBeDefined();
    expect(session!.revokedAt).not.toBeNull();
  });
});
