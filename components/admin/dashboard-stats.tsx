import { count, and, eq, sql, countDistinct } from "drizzle-orm";
import { CalendarDays, CheckCircle2, Clock, Mail, Star, FileText, Images } from "lucide-react";
import { db } from "@/lib/db";
import { bookings, messages, galleryImages, pages } from "@/lib/db/schema";
import { Card, CardContent } from "@/components/ui/card";
import { getAdminSiteId } from "@/lib/admin-site";

export async function DashboardStats() {
  const siteId = await getAdminSiteId();

  const [totalBookings, pendingBookings, confirmedBookings, unreadMessages, totalPages, galleryCount, featuredCount] =
    await Promise.all([
      db.select({ value: count() }).from(bookings).where(eq(bookings.siteId, siteId)),
      db.select({ value: count() }).from(bookings).where(and(eq(bookings.siteId, siteId), eq(bookings.status, "pending"))),
      db.select({ value: count() }).from(bookings).where(and(eq(bookings.siteId, siteId), eq(bookings.status, "confirmed"))),
      db.select({ value: count() }).from(messages).where(and(eq(messages.siteId, siteId), eq(messages.read, false))),
      db.select({ value: count() }).from(pages).where(eq(pages.siteId, siteId)),
      db.select({ value: count() }).from(galleryImages).where(eq(galleryImages.siteId, siteId)),
      db.select({ value: count() }).from(galleryImages).where(and(eq(galleryImages.siteId, siteId), eq(galleryImages.featured, true))),
    ]);

  const stats = [
    { label: "Total bookings", value: totalBookings[0]?.value ?? 0, icon: CalendarDays },
    { label: "Pending requests", value: pendingBookings[0]?.value ?? 0, icon: Clock },
    { label: "Confirmed tables", value: confirmedBookings[0]?.value ?? 0, icon: CheckCircle2 },
    { label: "Unread messages", value: unreadMessages[0]?.value ?? 0, icon: Mail },
    { label: "Pages", value: totalPages[0]?.value ?? 0, icon: FileText },
    { label: "Gallery images", value: galleryCount[0]?.value ?? 0, icon: Images },
    { label: "Featured images", value: featuredCount[0]?.value ?? 0, icon: Star },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat) => (
        <Card key={stat.label}>
          <CardContent className="flex items-center gap-4 p-5">
            <span className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <stat.icon className="size-5" />
            </span>
            <div>
              <p className="font-heading text-2xl font-semibold">{stat.value}</p>
              <p className="text-xs text-muted-foreground">{stat.label}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
