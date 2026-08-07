"use server";

import { createHash, randomBytes } from "node:crypto";
import { headers } from "next/headers";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { adminUsers, passwordResetTokens } from "@/lib/db/schema";
import { sendPasswordResetEmail } from "@/lib/email";
import { checkRateLimit } from "@/lib/rate-limit";

export type ForgotPasswordState = { error?: string; success?: boolean };

export async function requestPasswordReset(_prev: ForgotPasswordState, formData: FormData): Promise<ForgotPasswordState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!email) return { error: "Enter your admin email address." };

  const limit = await checkRateLimit(`password-reset:${await getClientIp()}:${email}`);
  if (!limit.allowed) return { error: "Too many reset requests. Try again in a minute." };

  const [user] = await db.select({ id: adminUsers.id, email: adminUsers.email }).from(adminUsers).where(eq(adminUsers.email, email));
  if (!user) return { success: true };

  const rawToken = randomBytes(32).toString("base64url");
  const tokenHash = hashResetToken(rawToken);
  const now = new Date();
  await db.update(passwordResetTokens).set({ usedAt: now.toISOString() }).where(and(eq(passwordResetTokens.userId, user.id), isNull(passwordResetTokens.usedAt)));
  await db.insert(passwordResetTokens).values({
    userId: user.id,
    tokenHash,
    expiresAt: new Date(now.getTime() + 30 * 60 * 1000).toISOString(),
  });

  await sendPasswordResetEmail(user.email, `${await getOrigin()}/admin/reset-password?token=${encodeURIComponent(rawToken)}`);
  return { success: true };
}

function hashResetToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

async function getOrigin() {
  const hdrs = await headers();
  return process.env.SITE_URL || hdrs.get("origin") || `https://${hdrs.get("host") || "localhost:3000"}`;
}

async function getClientIp() {
  const hdrs = await headers();
  return hdrs.get("x-forwarded-for")?.split(",")[0]?.trim() || hdrs.get("x-real-ip") || "unknown";
}
