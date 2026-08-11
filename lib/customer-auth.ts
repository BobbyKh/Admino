import "server-only";

import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { customers } from "@/lib/db/schema";
import { verifyPassword } from "@/lib/password";

const SESSION_COOKIE = "admino_customer_session";

function getAuthSecret(): Uint8Array {
  if (!process.env.AUTH_SECRET) {
    throw new Error("AUTH_SECRET environment variable is required.");
  }
  return new TextEncoder().encode(process.env.AUTH_SECRET);
}

export async function createCustomerSession(customerId: number) {
  const secret = getAuthSecret();
  const token = await new SignJWT({ sub: String(customerId), type: "customer" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(secret);

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function destroyCustomerSession() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

export async function getSessionCustomer() {
  const secret = getAuthSecret();
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret);
    if (payload.type !== "customer") return null;
    const customerId = Number(payload.sub);
    if (!customerId) return null;
    const [customer] = await db.select().from(customers).where(eq(customers.id, customerId));
    return customer ?? null;
  } catch {
    return null;
  }
}

export async function requireCustomer() {
  const customer = await getSessionCustomer();
  if (!customer) return null;
  return customer;
}

export async function verifyCustomerCredentials(
  siteId: number,
  email: string,
  password: string
) {
  const [customer] = await db
    .select()
    .from(customers)
    .where(and(eq(customers.siteId, siteId), eq(customers.email, email.toLowerCase())));
  if (!customer) return null;
  const ok = await verifyPassword(password, customer.passwordHash);
  return ok ? customer : null;
}
