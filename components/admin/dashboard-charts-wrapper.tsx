import { count, and, eq, gte, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { bookings, messages } from "@/lib/db/schema";
import { getAdminSiteId } from "@/lib/admin-site";
import { DashboardCharts } from "./dashboard-charts";

export async function DashboardChartsWrapper() {
  const siteId = await getAdminSiteId();
  const now = new Date();
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 6, 1);
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split("T")[0];

  const [bookingsByStatus, bookingsByMonth, messagesByDay] = await Promise.all([
    db
      .select({ status: bookings.status, count: count() })
      .from(bookings)
      .where(eq(bookings.siteId, siteId))
      .groupBy(bookings.status),
    db
      .select({
        month: sql<string>`TO_CHAR(${bookings.date}::date, 'Mon YY')`,
        count: count(),
      })
      .from(bookings)
      .where(and(eq(bookings.siteId, siteId), gte(bookings.date, sixMonthsAgo.toISOString().split("T")[0])))
      .groupBy(sql`TO_CHAR(${bookings.date}::date, 'Mon YY'), DATE_TRUNC('month', ${bookings.date}::date)`)
      .orderBy(sql`DATE_TRUNC('month', ${bookings.date}::date)`),
    db
      .select({
        day: sql<string>`TO_CHAR(${messages.createdAt}::date, 'Mon DD')`,
        count: count(),
      })
      .from(messages)
      .where(and(eq(messages.siteId, siteId), sql`${messages.createdAt}::date >= ${thirtyDaysAgoStr}`))
      .groupBy(sql`TO_CHAR(${messages.createdAt}::date, 'Mon DD'), DATE_TRUNC('day', ${messages.createdAt}::date)`)
      .orderBy(sql`DATE_TRUNC('day', ${messages.createdAt}::date)`),
  ]);

  return <DashboardCharts bookingsByStatus={bookingsByStatus} bookingsByMonth={bookingsByMonth} messagesByDay={messagesByDay} />;
}
