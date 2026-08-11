import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { rateLimitBuckets } from "@/lib/db/schema";

const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 10; // 10 requests per minute per IP

export async function checkRateLimit(key: string): Promise<{ allowed: boolean; remaining: number }> {
  const now = Date.now();
  const bucketKey = key.slice(0, 240);
  const resetAt = new Date(now + RATE_LIMIT_WINDOW_MS).toISOString();

  const [bucket] = await db
    .insert(rateLimitBuckets)
    .values({ key: bucketKey, count: 1, resetAt, updatedAt: new Date(now).toISOString() })
    .onConflictDoUpdate({
      target: rateLimitBuckets.key,
      set: {
        count: sql`case when ${rateLimitBuckets.resetAt} <= ${new Date(now).toISOString()} then 1 else ${rateLimitBuckets.count} + 1 end`,
        resetAt: sql`case when ${rateLimitBuckets.resetAt} <= ${new Date(now).toISOString()} then ${resetAt} else ${rateLimitBuckets.resetAt} end`,
        updatedAt: new Date(now).toISOString(),
      },
    })
    .returning({ count: rateLimitBuckets.count, resetAt: rateLimitBuckets.resetAt });

  if (!bucket) return { allowed: true, remaining: RATE_LIMIT_MAX_REQUESTS - 1 };
  if (new Date(bucket.resetAt).getTime() > now && bucket.count >= RATE_LIMIT_MAX_REQUESTS) {
    return { allowed: false, remaining: 0 };
  }

  return { allowed: true, remaining: Math.max(0, RATE_LIMIT_MAX_REQUESTS - bucket.count) };
}

export async function deleteExpiredRateLimitBuckets() {
  await db.delete(rateLimitBuckets).where(sql`${rateLimitBuckets.resetAt} <= ${new Date().toISOString()}`);
}
