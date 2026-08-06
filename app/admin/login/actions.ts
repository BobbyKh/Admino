"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createSession, verifyCredentials } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rate-limit";

export type LoginState = { error?: string };

export async function adminLogin(
  _prev: LoginState,
  formData: FormData
): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  const limit = checkRateLimit(`login:${await getClientIp()}:${email || "unknown"}`);
  if (!limit.allowed) {
    return { error: "Too many login attempts. Try again in a minute." };
  }

  const user = await verifyCredentials(email, password);
  if (!user) return { error: "Invalid email or password." };

  await createSession(user.id);
  redirect("/admin");
}

async function getClientIp() {
  const hdrs = await headers();
  return (
    hdrs.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    hdrs.get("x-real-ip") ||
    "unknown"
  );
}
