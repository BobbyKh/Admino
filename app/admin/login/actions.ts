"use server";

import { redirect } from "next/navigation";
import { createSession, verifyCredentials } from "@/lib/auth";

export type LoginState = { error?: string };

export async function adminLogin(
  _prev: LoginState,
  formData: FormData
): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  const user = await verifyCredentials(email, password);
  if (!user) return { error: "Invalid email or password." };

  await createSession(user.id);
  redirect("/admin");
}
