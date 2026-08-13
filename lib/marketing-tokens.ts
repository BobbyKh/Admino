import "server-only";

import { createHmac, timingSafeEqual } from "crypto";

export function createMarketingToken(subscriberId: number, purpose: "confirm" | "unsubscribe", nonceHash: string) {
  const payload = `${subscriberId}.${purpose}`;
  const signature = createHmac("sha256", secret()).update(`${payload}.${nonceHash}`).digest("base64url");
  return `${payload}.${signature}`;
}

export function verifyMarketingToken(token: string, purpose: "confirm" | "unsubscribe", nonceHash: string) {
  const [id, tokenPurpose, signature] = token.split(".");
  if (!/^\d+$/.test(id ?? "") || tokenPurpose !== purpose || !signature) return null;
  const expected = createHmac("sha256", secret()).update(`${id}.${purpose}.${nonceHash}`).digest("base64url");
  if (expected.length !== signature.length || !timingSafeEqual(Buffer.from(expected), Buffer.from(signature))) return null;
  return Number(id);
}

export function randomTokenHash() {
  return createHmac("sha256", secret()).update(crypto.randomUUID()).digest("hex");
}

function secret() {
  const value = process.env.AUTH_SECRET;
  if (!value) throw new Error("AUTH_SECRET environment variable is required.");
  return value;
}
