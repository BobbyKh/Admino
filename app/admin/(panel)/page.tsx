import Link from "next/link";
import { desc, eq, count, sql } from "drizzle-orm";
import {
  ArrowUpRight,
  CalendarDays,
  CheckCircle2,
  Clock,
  Images,
  Mail,
  Star,
  FileText,
  Globe,
} from "lucide-react";
import { db } from "@/lib/db";
import { bookings, galleryImages, messages, pages, sites } from "@/lib/db/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatBookingDate } from "@/lib/format";
import { BookingAnalytics, MessageAnalytics } from "@/components/admin/analytics-charts";

export const dynamic = "force-dynamic";

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  confirmed: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
  cancelled: "bg-destructive/10 text-destructive",
  completed: "bg-muted text-muted-foreground",
};

export default async function AdminDashboard() {
  const [allBookings, unread, gallery, featured, totalSites, totalPages] =
    await Promise.all([
      db.select().from(bookings).orderBy(desc(bookings.createdAt)),
      db.select().from(messages).where(eq(messages.read, false)),
      db.select().from(galleryImages),
      db.select().from(galleryImages).where(eq(galleryImages.featured, true)),
      db.select({ value: count() }).from(sites),
      db.select({ value: count() }).from(pages),
    ]);

  const pending = allBookings.filter((b) => b.status === "pending");
  const confirmed = allBookings.filter((b) => b.status === "confirmed");
  const recent = allBookings.slice(0, 8);

  // Analytics data: bookings by status
  const statusCounts = allBookings.reduce(
    (acc, b) => {
      acc[b.status] = (acc[b.status] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );
  const bookingsByStatus = Object.entries(statusCounts).map(([status, count]) => ({
    status,
    count,
  }));

  // Analytics data: bookings by month (last 6 months)
  const now = new Date();
  const bookingsByMonth = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    const monthStr = d.toLocaleString("default", { month: "short", year: "2-digit" });
    const count = allBookings.filter((b) => {
      const bd = new Date(b.date);
      return (
        bd.getMonth() === d.getMonth() && bd.getFullYear() === d.getFullYear()
      );
    }).length;
    return { month: monthStr, count };
  });

  // Analytics data: messages by day (last 30 days)
  const allMessages = await db.select().from(messages).orderBy(desc(messages.createdAt));
  const messagesByDay = Array.from({ length: 30 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (29 - i));
    const dayStr = d.toLocaleString("default", { month: "short", day: "numeric" });
    const count = allMessages.filter((m) => {
      const md = new Date(m.createdAt);
      return (
        md.getDate() === d.getDate() &&
        md.getMonth() === d.getMonth() &&
        md.getFullYear() === d.getFullYear()
      );
    }).length;
    return { day: dayStr, count };
  });

  const stats = [
    { label: "Total bookings", value: allBookings.length, icon: CalendarDays },
    { label: "Pending requests", value: pending.length, icon: Clock },
    { label: "Confirmed tables", value: confirmed.length, icon: CheckCircle2 },
    { label: "Unread messages", value: unread.length, icon: Mail },
    { label: "Sites", value: totalSites[0]?.value ?? 0, icon: Globe },
    { label: "Pages", value: totalPages[0]?.value ?? 0, icon: FileText },
    { label: "Gallery images", value: gallery.length, icon: Images },
    { label: "Featured images", value: featured.length, icon: Star },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="font-heading text-3xl font-semibold">Dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Overview of bookings, messages and site content.
          </p>
        </div>
        <Link href="/admin/bookings">
          <Button className="gap-2">
            Manage bookings
            <ArrowUpRight className="size-4" />
          </Button>
        </Link>
      </div>

      {/* Stats grid */}
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

      {/* Analytics Charts */}
      <BookingAnalytics
        bookingsByStatus={bookingsByStatus}
        bookingsByMonth={bookingsByMonth}
        topDays={[]}
      />
      <MessageAnalytics messagesByDay={messagesByDay} />

      {/* Recent Bookings + Sidebar */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle className="font-heading">Recent bookings</CardTitle>
            <Link
              href="/admin/bookings"
              className="text-sm font-medium text-primary hover:underline"
            >
              View all
            </Link>
          </CardHeader>
          <CardContent>
            {recent.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">
                No bookings yet. Share the site to start receiving requests!
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Guest</TableHead>
                    <TableHead>Date &amp; time</TableHead>
                    <TableHead>Guests</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recent.map((b) => (
                    <TableRow key={b.id}>
                      <TableCell>
                        <p className="font-medium">{b.name}</p>
                        <p className="text-xs text-muted-foreground">{b.email}</p>
                      </TableCell>
                      <TableCell className="text-sm">
                        {formatBookingDate(b.date, b.time)}
                      </TableCell>
                      <TableCell className="text-sm">{b.guests}</TableCell>
                      <TableCell>
                        <Badge className={STATUS_STYLES[b.status]} variant="outline">
                          {b.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader className="flex-row items-center gap-3">
              <Star className="size-4 text-amber-500" />
              <CardTitle className="font-heading">Media</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p className="flex justify-between">
                <span className="text-muted-foreground">Gallery images</span>
                <span className="font-medium">{gallery.length}</span>
              </p>
              <p className="flex justify-between">
                <span className="text-muted-foreground">Featured</span>
                <span className="font-medium">{featured.length}</span>
              </p>
              <p className="flex justify-between">
                <span className="text-muted-foreground">Categories</span>
                <span className="font-medium">
                  {new Set(gallery.map((g) => g.category)).size}
                </span>
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="font-heading">Quick actions</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2">
              <Link href="/admin/sites">
                <Button variant="outline" className="w-full justify-between">
                  Manage sites <Globe className="size-4" />
                </Button>
              </Link>
              <Link href="/admin/pages">
                <Button variant="outline" className="w-full justify-between">
                  Manage pages <FileText className="size-4" />
                </Button>
              </Link>
              <Link href="/admin/settings">
                <Button variant="outline" className="w-full justify-between">
                  Edit site content <Images className="size-4" />
                </Button>
              </Link>
              <Link href="/admin/menu">
                <Button variant="outline" className="w-full justify-between">
                  Manage menu <Images className="size-4" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
