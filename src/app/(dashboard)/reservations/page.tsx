"use client";

import { format } from "date-fns";
import {
  CalendarCheck,
  DollarSign,
  LogIn,
  TrendingUp,
} from "lucide-react";
import { useRouter } from "next/navigation";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  BOOKING_STATUS_LABELS,
  BOOKING_STATUS_VARIANTS,
} from "@/lib/constants/reservations";
import { trpc } from "@/lib/trpc";

const STATUS_COLORS: Record<string, string> = {
  DRAFT: "#94a3b8",
  CONFIRMED: "#3b82f6",
  CHECKED_IN: "#22c55e",
  CHECKED_OUT: "#64748b",
  CANCELLED: "#ef4444",
  NO_SHOW: "#f59e0b",
};

const PIE_COLORS = ["#3b82f6", "#22c55e", "#f59e0b", "#ef4444", "#8b5cf6", "#64748b"];

export default function ReservationsDashboardPage() {
  const router = useRouter();
  const { data, isLoading } = trpc.reservations.booking.dashboard.useQuery();

  const totalBookings = Object.values(data?.totalByStatus ?? {}).reduce(
    (a, b) => a + (b as number),
    0,
  );
  const confirmedCount = (data?.totalByStatus as Record<string, number>)?.CONFIRMED ?? 0;

  const statusPieData = Object.entries(data?.totalByStatus ?? {}).map(
    ([status, count]) => ({
      name: BOOKING_STATUS_LABELS[status] ?? status,
      value: count as number,
      status,
    }),
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header">
        <h1 className="text-2xl font-bold tracking-tight">Reservations Dashboard</h1>
        <p className="text-muted-foreground">
          Overview of bookings, revenue, and upcoming activity
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          title="Total Bookings"
          value={totalBookings}
          isLoading={isLoading}
          icon={CalendarCheck}
          accent="text-blue-600 dark:text-blue-400 bg-blue-500/10"
        />
        <KpiCard
          title="Confirmed Today"
          value={data?.confirmedToday}
          isLoading={isLoading}
          icon={TrendingUp}
          accent="text-emerald-600 dark:text-emerald-400 bg-emerald-500/10"
        />
        <KpiCard
          title="Upcoming Check-ins (7d)"
          value={data?.upcomingCheckIns}
          isLoading={isLoading}
          icon={LogIn}
          accent="text-violet-600 dark:text-violet-400 bg-violet-500/10"
        />
        <KpiCard
          title="Monthly Revenue"
          value={data?.monthRevenue?.selling}
          isLoading={isLoading}
          icon={DollarSign}
          accent="text-amber-600 dark:text-amber-400 bg-amber-500/10"
          isCurrency
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Bookings by Status */}
        <Card>
          <CardHeader>
            <CardTitle>Bookings by Status</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[300px] w-full" />
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={statusPieData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {statusPieData.map((s, i) => (
                      <Cell
                        key={s.status}
                        fill={STATUS_COLORS[s.status] ?? PIE_COLORS[i % PIE_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Bookings by Hotel */}
        <Card>
          <CardHeader>
            <CardTitle>Bookings by Hotel (Top 8)</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[300px] w-full" />
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={data?.bookingsByHotel ?? []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="hotelName"
                    tick={{ fontSize: 12 }}
                    interval={0}
                    angle={-25}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Bookings */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Bookings</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-8 w-full" />
              ))}
            </div>
          ) : data?.recentBookings?.length ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Hotel</TableHead>
                  <TableHead>Guest</TableHead>
                  <TableHead>Check-in</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Selling</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.recentBookings.map((b) => (
                  <TableRow
                    key={b.id}
                    className="cursor-pointer"
                    onClick={() =>
                      router.push(`/reservations/bookings/${b.id}`)
                    }
                  >
                    <TableCell className="font-mono font-medium">
                      {b.code}
                    </TableCell>
                    <TableCell>{b.hotel.name}</TableCell>
                    <TableCell>{b.leadGuestName ?? "—"}</TableCell>
                    <TableCell>
                      {format(new Date(b.checkIn), "dd MMM yyyy")}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          (BOOKING_STATUS_VARIANTS[b.status] as
                            | "default"
                            | "secondary"
                            | "outline"
                            | "destructive") ?? "secondary"
                        }
                      >
                        {BOOKING_STATUS_LABELS[b.status] ?? b.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {b.currency.symbol}
                      {Number(b.sellingTotal).toLocaleString("en", {
                        minimumFractionDigits: 2,
                      })}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-center text-sm text-muted-foreground py-8">
              No bookings yet. Create your first booking to get started.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function KpiCard({
  title,
  value,
  isLoading,
  icon: Icon,
  accent,
  isCurrency,
}: {
  title: string;
  value?: number;
  isLoading: boolean;
  icon: React.ElementType;
  accent: string;
  isCurrency?: boolean;
}) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center gap-4">
          <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${accent}`}
          >
            <Icon className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium text-muted-foreground truncate">
              {title}
            </p>
            {isLoading ? (
              <Skeleton className="mt-1 h-7 w-16" />
            ) : (
              <p className="text-2xl font-bold font-mono tabular-nums">
                {isCurrency
                  ? Number(value ?? 0).toLocaleString("en", {
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 0,
                    })
                  : (value ?? 0)}
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
