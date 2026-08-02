"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, PieChart as PieChartIcon, TrendingUp } from "lucide-react";

const COLORS = ["#10b981", "#f59e0b", "#ef4444", "#6b7280"];

interface BookingAnalyticsProps {
  bookingsByStatus: Array<{ status: string; count: number }>;
  bookingsByMonth: Array<{ month: string; count: number }>;
  topDays: Array<{ day: string; count: number }>;
}

export function BookingAnalytics({
  bookingsByStatus,
  bookingsByMonth,
  topDays,
}: BookingAnalyticsProps) {
  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {/* Bookings by Status (Pie Chart) */}
      <Card>
        <CardHeader className="flex-row items-center gap-3">
          <PieChartIcon className="size-4 text-primary" />
          <CardTitle className="font-heading text-base">By Status</CardTitle>
        </CardHeader>
        <CardContent>
          {bookingsByStatus.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No data</p>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={bookingsByStatus}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="count"
                    nameKey="status"
                  >
                    {bookingsByStatus.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="mt-2 flex flex-wrap justify-center gap-3 text-xs">
                {bookingsByStatus.map((item, i) => (
                  <div key={item.status} className="flex items-center gap-1.5">
                    <span
                      className="size-2.5 rounded-full"
                      style={{ backgroundColor: COLORS[i % COLORS.length] }}
                    />
                    <span className="capitalize text-muted-foreground">{item.status}</span>
                    <span className="font-medium">{item.count}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Bookings by Month (Bar Chart) */}
      <Card className="lg:col-span-2">
        <CardHeader className="flex-row items-center gap-3">
          <BarChart3 className="size-4 text-primary" />
          <CardTitle className="font-heading text-base">Monthly Trend</CardTitle>
        </CardHeader>
        <CardContent>
          {bookingsByMonth.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No data</p>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={bookingsByMonth}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 12 }}
                  stroke="hsl(var(--muted-foreground))"
                />
                <YAxis
                  tick={{ fontSize: 12 }}
                  stroke="hsl(var(--muted-foreground))"
                  allowDecimals={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                  }}
                />
                <Bar
                  dataKey="count"
                  fill="hsl(var(--primary))"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

interface MessageAnalyticsProps {
  messagesByDay: Array<{ day: string; count: number }>;
}

export function MessageAnalytics({ messagesByDay }: MessageAnalyticsProps) {
  return (
    <Card>
      <CardHeader className="flex-row items-center gap-3">
        <TrendingUp className="size-4 text-primary" />
        <CardTitle className="font-heading text-base">Messages (Last 30 Days)</CardTitle>
      </CardHeader>
      <CardContent>
        {messagesByDay.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">No data</p>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={messagesByDay}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis
                dataKey="day"
                tick={{ fontSize: 11 }}
                stroke="hsl(var(--muted-foreground))"
              />
              <YAxis
                tick={{ fontSize: 12 }}
                stroke="hsl(var(--muted-foreground))"
                allowDecimals={false}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                }}
              />
              <Line
                type="monotone"
                dataKey="count"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                dot={{ fill: "hsl(var(--primary))" }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
