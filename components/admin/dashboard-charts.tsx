"use client";

import dynamic from "next/dynamic";

const BookingAnalytics = dynamic(
  () => import("@/components/admin/analytics-charts").then((m) => m.BookingAnalytics),
  { ssr: false, loading: () => <div className="h-[300px] animate-pulse rounded-lg bg-muted" /> }
);
const MessageAnalytics = dynamic(
  () => import("@/components/admin/analytics-charts").then((m) => m.MessageAnalytics),
  { ssr: false, loading: () => <div className="h-[300px] animate-pulse rounded-lg bg-muted" /> }
);

interface DashboardChartsProps {
  bookingsByStatus: Array<{ status: string; count: number }>;
  bookingsByMonth: Array<{ month: string; count: number }>;
  messagesByDay: Array<{ day: string; count: number }>;
}

export function DashboardCharts({ bookingsByStatus, bookingsByMonth, messagesByDay }: DashboardChartsProps) {
  return (
    <>
      <BookingAnalytics bookingsByStatus={bookingsByStatus} bookingsByMonth={bookingsByMonth} topDays={[]} />
      <MessageAnalytics messagesByDay={messagesByDay} />
    </>
  );
}
