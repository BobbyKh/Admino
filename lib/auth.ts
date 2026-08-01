import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SignJWT, jwtVerify } from "jose";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { adminUsers } from "@/lib/db/schema";
import { verifyPassword } from "@/lib/password";

const SESSION_COOKIE = "maiti_admin_session";

// In production AUTH_SECRET MUST be set — the fallback is a dev-only convenience.
// The check is lazy (inside the guards below) so public pages/actions never break
// when admin auth isn't configured.
const AUTH_SECRET = new TextEncoder().encode(
  process.env.AUTH_SECRET ?? "maiti-resort-dev-secret-change-me"
);

function assertAuthSecret() {
  if (process.env.NODE_ENV === "production" && !process.env.AUTH_SECRET) {
    throw new Error("AUTH_SECRET environment variable is required in production.");
  }
}

export async function createSession(userId: number) {
  assertAuthSecret();
  const token = await new SignJWT({ sub: String(userId) })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(AUTH_SECRET);

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function destroySession() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

export async function getSessionUser() {
  assertAuthSecret();
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, AUTH_SECRET);
    const userId = Number(payload.sub);
    if (!userId) return null;
    const [user] = await db
      .select()
      .from(adminUsers)
      .where(eq(adminUsers.id, userId));
    return user ?? null;
  } catch {
    return null;
  }
}

/** Guard for admin server components. Redirects to /admin/login when unauthenticated. */
export async function requireAdmin() {
  const user = await getSessionUser();
  if (!user) redirect("/admin/login");
  return user;
}

export async function verifyCredentials(email: string, password: string) {
  const [user] = await db
    .select()
    .from(adminUsers)
    .where(eq(adminUsers.email, email.toLowerCase()));
  if (!user) return null;
  const ok = await verifyPassword(password, user.passwordHash);
  return ok ? user : null;
}
