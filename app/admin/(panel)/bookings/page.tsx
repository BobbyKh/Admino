import { desc, count, eq } from "drizzle-orm";
import { CalendarDays } from "lucide-react";
import { db } from "@/lib/db";
import { bookings } from "@/lib/db/schema";
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
import {
  deleteBooking,
  updateBookingStatus,
} from "@/lib/actions";
import { Pagination } from "@/components/admin/pagination";
import { getPaginationParams, paginationMeta, DEFAULT_PAGE_SIZE } from "@/lib/pagination";
import { getAdminSiteId } from "@/lib/admin-site";
import { assertTenantFeaturePage } from "@/lib/tenant-access";

export const dynamic = "force-dynamic";

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  confirmed: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
  cancelled: "bg-destructive/10 text-destructive",
  completed: "bg-muted text-muted-foreground",
};

export default async function AdminBookingsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const params = await searchParams;
  const { page, pageSize, offset } = getPaginationParams(params);
  const siteId = await getAdminSiteId();
  await assertTenantFeaturePage(siteId, "bookings");

  const siteFilter = eq(bookings.siteId, siteId);
  const [totalResult] = await db.select({ value: count() }).from(bookings).where(siteFilter);
  const total = totalResult.value;
  const meta = paginationMeta(total, page, pageSize);

  const rows = await db
    .select()
    .from(bookings)
    .where(siteFilter)
    .orderBy(desc(bookings.createdAt))
    .limit(pageSize)
    .offset(offset);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-3xl font-semibold">Bookings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Review, confirm and manage table reservations.
        </p>
      </div>

      <Card>
        <CardHeader className="flex-row items-center gap-3">
          <CalendarDays className="size-4 text-primary" />
          <CardTitle className="font-heading">
            All requests ({total})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {rows.length === 0 ? (
            <p className="py-16 text-center text-sm text-muted-foreground">
              No bookings yet.
            </p>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Guest</TableHead>
                      <TableHead>Date &amp; time</TableHead>
                      <TableHead>Guests</TableHead>
                      <TableHead>Occasion</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((b) => (
                      <TableRow key={b.id}>
                        <TableCell className="align-top">
                          <p className="font-medium">{b.name}</p>
                          <p className="text-xs text-muted-foreground">{b.email}</p>
                          <p className="text-xs text-muted-foreground">{b.phone}</p>
                          {b.notes && (
                            <p className="mt-1 max-w-52 text-xs text-muted-foreground line-clamp-2">
                              &ldquo;{b.notes}&rdquo;
                            </p>
                          )}
                        </TableCell>
                        <TableCell className="align-top text-sm">
                          {formatBookingDate(b.date, b.time)}
                        </TableCell>
                        <TableCell className="align-top text-sm">{b.guests}</TableCell>
                        <TableCell className="align-top text-sm">
                          {b.occasion || "—"}
                        </TableCell>
                        <TableCell className="align-top">
                          <Badge className={STATUS_STYLES[b.status]} variant="outline">
                            {b.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="align-top">
                          <div className="flex items-center justify-end gap-2">
                            <form
                              action={updateBookingStatus.bind(null, b.id)}
                              className="flex items-center gap-1"
                            >
                              <select
                                name="status"
                                defaultValue={b.status}
                                className="h-8 rounded-lg border border-input bg-transparent px-2 text-sm"
                              >
                                <option value="pending">pending</option>
                                <option value="confirmed">confirmed</option>
                                <option value="completed">completed</option>
                                <option value="cancelled">cancelled</option>
                              </select>
                              <Button type="submit" variant="ghost" size="sm">
                                Save
                              </Button>
                            </form>
                            <form action={deleteBooking.bind(null, b.id)}>
                              <Button
                                type="submit"
                                variant="ghost"
                                size="sm"
                                className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                              >
                                Delete
                              </Button>
                            </form>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <Pagination {...meta} pageSize={pageSize} />
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
