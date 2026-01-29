import { eq, and } from "drizzle-orm";
import { workspaces, users, magicLinks, sessions } from "@/db/schema";
import { generateId, generateToken } from "@/lib/id";
import { sha256 } from "@/lib/hash";
import type { EmailProvider } from "@/lib/email";
import type { DB } from "@/db";

export async function handleMagicLinkRequest(
  db: DB,
  emailProvider: EmailProvider,
  email: string
) {
  if (!email || typeof email !== "string" || !email.includes("@")) {
    return { status: 400 as const, body: { error: "Invalid email" } };
  }

  // Find or create workspace + user by email domain
  let user = db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .get();

  let workspaceId: string;

  if (!user) {
    // Create workspace and user
    workspaceId = generateId();
    const userId = generateId();
    const now = new Date().toISOString();
    const domain = email.split("@")[1];

    db.insert(workspaces)
      .values({ id: workspaceId, name: domain, createdAt: now })
      .run();

    db.insert(users)
      .values({ id: userId, workspaceId, email, createdAt: now })
      .run();

    user = { id: userId, workspaceId, email, createdAt: now };
  } else {
    workspaceId = user.workspaceId;
  }

  const token = generateToken();
  const tokenHash = sha256(token);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 15 * 60 * 1000); // 15 min

  db.insert(magicLinks)
    .values({
      id: generateId(),
      workspaceId,
      email,
      tokenHash,
      expiresAt: expiresAt.toISOString(),
      createdAt: now.toISOString(),
    })
    .run();

  await emailProvider.sendMagicLink(email, token);

  return { status: 200 as const, body: { sent: true } };
}

export function handleMagicLinkConsume(db: DB, token: string) {
  if (!token) {
    return { status: 400 as const, body: { error: "Missing token" } };
  }

  const tokenHash = sha256(token);

  const link = db
    .select()
    .from(magicLinks)
    .where(eq(magicLinks.tokenHash, tokenHash))
    .get();

  if (!link) {
    return { status: 401 as const, body: { error: "Invalid token" } };
  }

  if (link.usedAt) {
    return { status: 401 as const, body: { error: "Token already used" } };
  }

  if (new Date(link.expiresAt) < new Date()) {
    return { status: 401 as const, body: { error: "Token expired" } };
  }

  // Mark token as used
  db.update(magicLinks)
    .set({ usedAt: new Date().toISOString() })
    .where(eq(magicLinks.id, link.id))
    .run();

  // Find the user
  const user = db
    .select()
    .from(users)
    .where(
      and(
        eq(users.email, link.email),
        eq(users.workspaceId, link.workspaceId)
      )
    )
    .get();

  if (!user) {
    return { status: 401 as const, body: { error: "User not found" } };
  }

  // Create session (30 day expiry)
  const sessionId = generateId();
  const now = new Date();
  const sessionExpiry = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  db.insert(sessions)
    .values({
      id: sessionId,
      userId: user.id,
      workspaceId: link.workspaceId,
      createdAt: now.toISOString(),
      expiresAt: sessionExpiry.toISOString(),
    })
    .run();

  return {
    status: 200 as const,
    body: { session_id: sessionId },
    redirect: "/app/agents",
  };
}

export function handleLogout(db: DB, sessionId: string | null) {
  if (!sessionId) {
    return { status: 401 as const, body: { error: "Not authenticated" } };
  }

  db.update(sessions)
    .set({ revokedAt: new Date().toISOString() })
    .where(eq(sessions.id, sessionId))
    .run();

  return { status: 200 as const, body: { logged_out: true } };
}

export function handleMe(db: DB, sessionId: string | null) {
  if (!sessionId) {
    return { status: 401 as const, body: { error: "Not authenticated" } };
  }

  const session = db
    .select()
    .from(sessions)
    .where(eq(sessions.id, sessionId))
    .get();

  if (!session || session.revokedAt || new Date(session.expiresAt) < new Date()) {
    return { status: 401 as const, body: { error: "Session invalid" } };
  }

  const user = db
    .select()
    .from(users)
    .where(eq(users.id, session.userId))
    .get();

  if (!user) {
    return { status: 401 as const, body: { error: "User not found" } };
  }

  return {
    status: 200 as const,
    body: {
      user_id: user.id,
      email: user.email,
      workspace_id: user.workspaceId,
    },
  };
}
