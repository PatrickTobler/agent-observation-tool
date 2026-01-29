import { createHash, randomBytes } from "crypto";

export function generateId(): string {
  return randomBytes(16).toString("hex");
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function generateApiKey(): { secret: string; prefix: string } {
  const secret = `aot_${randomBytes(32).toString("hex")}`;
  const prefix = secret.slice(0, 8);
  return { secret, prefix };
}

export function hashPrompt(prompt: string): string {
  return createHash("sha256").update(prompt).digest("hex").slice(0, 16);
}
