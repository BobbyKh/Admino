import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SignJWT, jwtVerify } from "jose";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { adminUsers } from "@/lib/db/schema";
import { verifyPassword } from "@/lib/password";

const SESSION_COOKIE = "admino_session";

function getAuthSecret(): Uint8Array {
  if (!process.env.AUTH_SECRET) {
    throw new Error(
      "AUTH_SECRET environment variable is required. " +
      "Set it in your .env.local file (development) or environment variables (production)."
    );
  }
  return new TextEncoder().encode(process.env.AUTH_SECRET);
}

// ─── Roles ───────────────────────────────────────────────────────────────────

export const ROLES = ["super_admin", "admin", "editor", "viewer"] as const;
export type Role = (typeof ROLES)[number];

/** Permission matrix — higher roles inherit lower permissions. */
const ROLE_HIERARCHY: Record<Role, number> = {
  viewer: 0,
  editor: 1,
  admin: 2,
  super_admin: 3,
};

/** Permissions per role. */
const ROLE_PERMISSIONS: Record<Role, string[]> = {
  viewer: ["read"],
  editor: ["read", "write"],
  admin: ["read", "write", "manage_content", "manage_users"],
  super_admin: ["read", "write", "manage_content", "manage_users", "manage_site", "delete"],
};

export function hasPermission(role: Role, permission: string): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

export function hasMinRole(userRole: Role, requiredRole: Role): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole];
}

// ─── Session Management ──────────────────────────────────────────────────────

export async function createSession(userId: number) {
  const secret = getAuthSecret();
  const token = await new SignJWT({ sub: String(userId) })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret);

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
  const secret = getAuthSecret();
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, secret);
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

/** Guard requiring minimum role. Redirects to /admin if insufficient permissions. */
export async function requireRole(minRole: Role) {
  const user = await requireAdmin();
  const userRole = (user.role as Role) ?? "viewer";
  if (!hasMinRole(userRole, minRole)) {
    redirect("/admin");
  }
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
