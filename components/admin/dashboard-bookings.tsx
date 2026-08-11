import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { bookings } from "@/lib/db/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatBookingDate } from "@/lib/format";
import { getAdminSiteId } from "@/lib/admin-site";

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  confirmed: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
  cancelled: "bg-destructive/10 text-destructive",
  completed: "bg-muted text-muted-foreground",
};

export async function DashboardBookings() {
  const siteId = await getAdminSiteId();
  const recentBookings = await db
    .select()
    .from(bookings)
    .where(eq(bookings.siteId, siteId))
    .orderBy(desc(bookings.createdAt))
    .limit(8);

  return (
    <Card className="lg:col-span-2">
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle className="font-heading">Recent bookings</CardTitle>
        <Link href="/admin/bookings" className="text-sm font-medium text-primary hover:underline">
          View all
        </Link>
      </CardHeader>
      <CardContent>
        {recentBookings.length === 0 ? (
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
              {recentBookings.map((b) => (
                <TableRow key={b.id}>
                  <TableCell>
                    <p className="font-medium">{b.name}</p>
                    <p className="text-xs text-muted-foreground">{b.email}</p>
                  </TableCell>
                  <TableCell className="text-sm">{formatBookingDate(b.date, b.time)}</TableCell>
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
  );
}
