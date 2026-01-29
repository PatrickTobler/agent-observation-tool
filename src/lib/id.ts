import { randomBytes } from "crypto";

export function generateId(): string {
  return randomBytes(16).toString("hex");
}

export function generateToken(): string {
  return randomBytes(32).toString("hex");
}

export function generateApiKeySecret(): string {
  return `aot_${randomBytes(24).toString("hex")}`;
}
