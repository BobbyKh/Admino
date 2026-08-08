import Link from "next/link";
import { Suspense } from "react";
import { ArrowUpRight, Globe, FileText, Images } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DashboardStats } from "@/components/admin/dashboard-stats";
import { DashboardChartsWrapper } from "@/components/admin/dashboard-charts-wrapper";
import { DashboardBookings } from "@/components/admin/dashboard-bookings";
import { DashboardMedia } from "@/components/admin/dashboard-media";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
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

      <Suspense fallback={<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{Array.from({ length: 7 }).map((_, i) => <div key={i} className="h-[88px] animate-pulse rounded-lg bg-muted" />)}</div>}>
        <DashboardStats />
      </Suspense>

      <Suspense fallback={<div className="h-[300px] animate-pulse rounded-lg bg-muted" />}>
        <DashboardChartsWrapper />
      </Suspense>

      <div className="grid gap-6 lg:grid-cols-3">
        <Suspense fallback={<div className="h-[200px] animate-pulse rounded-lg bg-muted" />}>
          <DashboardBookings />
        </Suspense>

        <div className="space-y-6">
          <Suspense fallback={<div className="h-[140px] animate-pulse rounded-lg bg-muted" />}>
            <DashboardMedia />
          </Suspense>

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
