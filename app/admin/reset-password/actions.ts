"use server";

import { createHash } from "node:crypto";
import { redirect } from "next/navigation";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { adminUsers, passwordResetTokens } from "@/lib/db/schema";
import { hashPassword } from "@/lib/password";

export type ResetPasswordState = { error?: string };

export async function resetPassword(_prev: ResetPasswordState, formData: FormData): Promise<ResetPasswordState> {
  const token = String(formData.get("token") ?? "");
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  if (!token) return { error: "Reset token is missing." };
  if (password.length < 10) return { error: "Use at least 10 characters for your new password." };
  if (password !== confirmPassword) return { error: "Passwords do not match." };

  const [resetToken] = await db
    .select()
    .from(passwordResetTokens)
    .where(and(eq(passwordResetTokens.tokenHash, hashResetToken(token)), isNull(passwordResetTokens.usedAt)));
  if (!resetToken || new Date(resetToken.expiresAt).getTime() <= Date.now()) return { error: "This reset link is invalid or expired." };

  await db.transaction(async (tx) => {
    await tx.update(adminUsers).set({ passwordHash: await hashPassword(password) }).where(eq(adminUsers.id, resetToken.userId));
    await tx.update(passwordResetTokens).set({ usedAt: new Date().toISOString() }).where(eq(passwordResetTokens.id, resetToken.id));
  });

  redirect("/admin/login?reset=success");
}

function hashResetToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}
