import { describe, it, expect, beforeEach } from "vitest";
import {
  handleMagicLinkRequest,
  handleMagicLinkConsume,
  handleMe,
} from "@/lib/handlers/auth";
import { MockEmailProvider } from "@/lib/email";
import { createTestDb } from "@/db/test-db";
import type { DB } from "@/db";

describe("Magic Link Auth", () => {
  let db: DB;
  let emailProvider: MockEmailProvider;

  beforeEach(() => {
    db = createTestDb();
    emailProvider = new MockEmailProvider();
  });

  it("magic_link_request_creates_token_and_sends_email", async () => {
    const result = await handleMagicLinkRequest(
      db,
      emailProvider,
      "user@example.com"
    );

    expect(result.status).toBe(200);
    expect(result.body).toEqual({ sent: true });
    expect(emailProvider.sentEmails.length).toBe(1);
    expect(emailProvider.sentEmails[0].email).toBe("user@example.com");
    expect(emailProvider.sentEmails[0].token).toBeTruthy();
  });

  it("magic_link_consume_creates_session_and_redirects", async () => {
    await handleMagicLinkRequest(db, emailProvider, "user@example.com");
    const token = emailProvider.sentEmails[0].token;

    const result = handleMagicLinkConsume(db, token);

    expect(result.status).toBe(200);
    expect(result.body).toHaveProperty("session_id");
    expect(result).toHaveProperty("redirect", "/app/agents");
  });

  it("expired_token_rejected", async () => {
    await handleMagicLinkRequest(db, emailProvider, "user@example.com");
    const token = emailProvider.sentEmails[0].token;

    // Manually expire the token by updating the DB
    const { sha256 } = await import("@/lib/hash");
    const { magicLinks } = await import("@/db/schema");
    const { eq } = await import("drizzle-orm");

    db.update(magicLinks)
      .set({ expiresAt: new Date(Date.now() - 1000).toISOString() })
      .where(eq(magicLinks.tokenHash, sha256(token)))
      .run();

    const result = handleMagicLinkConsume(db, token);
    expect(result.status).toBe(401);
    expect(result.body.error).toBe("Token expired");
  });

  it("replay_token_rejected", async () => {
    await handleMagicLinkRequest(db, emailProvider, "user@example.com");
    const token = emailProvider.sentEmails[0].token;

    // First consume succeeds
    const first = handleMagicLinkConsume(db, token);
    expect(first.status).toBe(200);

    // Second consume fails (replay)
    const second = handleMagicLinkConsume(db, token);
    expect(second.status).toBe(401);
    expect(second.body.error).toBe("Token already used");
  });

  it("me_endpoint_requires_session", async () => {
    const result = handleMe(db, null);
    expect(result.status).toBe(401);

    // Create a valid session via magic link flow
    await handleMagicLinkRequest(db, emailProvider, "user@example.com");
    const token = emailProvider.sentEmails[0].token;
    const consumeResult = handleMagicLinkConsume(db, token);
    expect(consumeResult.status).toBe(200);

    const sessionId = (consumeResult.body as { session_id: string }).session_id;
    const meResult = handleMe(db, sessionId);
    expect(meResult.status).toBe(200);
    if (meResult.status === 200) {
      expect(meResult.body.email).toBe("user@example.com");
    }
  });
});
