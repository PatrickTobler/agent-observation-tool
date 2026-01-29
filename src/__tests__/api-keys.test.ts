import { setupTestFixtures, type TestFixtures } from "@/lib/test-helpers";
import { eq } from "drizzle-orm";
import * as schema from "@/db/schema";
import { hashToken, generateApiKey, generateId } from "@/lib/crypto";

describe("API key management", () => {
  let fixtures: TestFixtures;

  beforeEach(() => {
    fixtures = setupTestFixtures();
  });

  it("create key returns secret that starts with aot_", () => {
    const { secret, prefix } = generateApiKey();
    expect(secret).toMatch(/^aot_/);
    expect(prefix).toBe(secret.slice(0, 8));
  });

  it("secret is hashed in DB (not stored as plaintext)", () => {
    const row = fixtures.db
      .select()
      .from(schema.apiKeys)
      .where(eq(schema.apiKeys.id, fixtures.apiKeyId))
      .get();

    expect(row).toBeDefined();
    expect(row!.secretHash).not.toBe(fixtures.apiKeySecret);
    expect(row!.secretHash).toBe(hashToken(fixtures.apiKeySecret));
  });

  it("prefix is stored and matches the first 8 chars of secret", () => {
    const row = fixtures.db
      .select()
      .from(schema.apiKeys)
      .where(eq(schema.apiKeys.id, fixtures.apiKeyId))
      .get();

    expect(row).toBeDefined();
    expect(row!.prefix).toBe(fixtures.apiKeySecret.slice(0, 8));
    expect(row!.prefix).toMatch(/^aot_/);
  });

  it("revoked key blocks auth lookup", () => {
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

  it("can create multiple keys for the same workspace", () => {
    const { secret, prefix } = generateApiKey();
    const newKeyId = generateId();

    fixtures.db
      .insert(schema.apiKeys)
      .values({
        id: newKeyId,
        workspaceId: fixtures.workspaceId,
        name: "Second Key",
        secretHash: hashToken(secret),
        prefix,
      })
      .run();

    const keys = fixtures.db
      .select()
      .from(schema.apiKeys)
      .where(eq(schema.apiKeys.workspaceId, fixtures.workspaceId))
      .all();

    expect(keys).toHaveLength(2);
  });

  it("hash is deterministic for the same input", () => {
    const secret = "aot_test_deterministic";
    expect(hashToken(secret)).toBe(hashToken(secret));
  });

  it("different secrets produce different hashes", () => {
    const { secret: s1 } = generateApiKey();
    const { secret: s2 } = generateApiKey();
    expect(hashToken(s1)).not.toBe(hashToken(s2));
  });
});
