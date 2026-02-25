"use client";

import { format } from "date-fns";
import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  FileStack,
} from "lucide-react";
import Link from "next/link";
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
import { Button } from "@/components/ui/button";
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
  CONTRACT_STATUS_LABELS,
  CONTRACT_STATUS_VARIANTS,
} from "@/lib/constants/contracting";
import { trpc } from "@/lib/trpc";

const PIE_COLORS = ["#22c55e", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6"];

const STATUS_COLORS: Record<string, string> = {
  DRAFT: "#94a3b8",
  POSTED: "#3b82f6",
  PUBLISHED: "#22c55e",
};

export default function ContractingDashboardPage() {
  const router = useRouter();
  const { data, isLoading } = trpc.contracting.contract.dashboard.useQuery();

  const publishedCount =
    data?.byStatus.find((s) => s.status === "PUBLISHED")?.count ?? 0;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header">
        <h1 className="text-2xl font-bold tracking-tight">Contracting Dashboard</h1>
        <p className="text-muted-foreground">
          Overview of hotel contracts and their status
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          title="Total Contracts"
          value={data?.totalContracts}
          isLoading={isLoading}
          icon={FileStack}
          accent="text-blue-600 dark:text-blue-400 bg-blue-500/10"
        />
        <KpiCard
          title="Published"
          value={publishedCount}
          isLoading={isLoading}
          icon={CheckCircle2}
          accent="text-emerald-600 dark:text-emerald-400 bg-emerald-500/10"
        />
        <KpiCard
          title="Hotels Under Contract"
          value={data?.totalHotels}
          isLoading={isLoading}
          icon={Building2}
          accent="text-violet-600 dark:text-violet-400 bg-violet-500/10"
        />
        <KpiCard
          title="Expiring Soon (60 days)"
          value={data?.expiringSoonCount}
          isLoading={isLoading}
          icon={AlertTriangle}
          accent="text-amber-600 dark:text-amber-400 bg-amber-500/10"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Contracts by Status */}
        <Card>
          <CardHeader>
            <CardTitle>Contracts by Status</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[300px] w-full" />
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={(data?.byStatus ?? []).map((s) => ({
                      name: CONTRACT_STATUS_LABELS[s.status] ?? s.status,
                      value: s.count,
                      status: s.status,
                    }))}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {(data?.byStatus ?? []).map((s, i) => (
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

        {/* Contracts by Hotel */}
        <Card>
          <CardHeader>
            <CardTitle>Contracts by Hotel (Top 8)</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[300px] w-full" />
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={data?.byHotel ?? []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="name"
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

      {/* Tables */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Expiring Soon */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Expiring Soon</CardTitle>
            <Button variant="link" size="sm" asChild className="text-xs">
              <Link href="/contracting/expiring">View all</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-8 w-full" />
                ))}
              </div>
            ) : data?.expiringSoon?.length ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Contract</TableHead>
                    <TableHead>Hotel</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Expires</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.expiringSoon.map((c) => (
                    <TableRow
                      key={c.id}
                      className="cursor-pointer"
                      onClick={() =>
                        router.push(`/contracting/contracts/${c.id}`)
                      }
                    >
                      <TableCell>
                        <div>
                          <span className="font-medium">{c.name}</span>
                          <span className="ml-2 text-xs text-muted-foreground">
                            {c.code}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>{c.hotelName}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            (CONTRACT_STATUS_VARIANTS[c.status] as
                              | "default"
                              | "secondary"
                              | "outline"
                              | "destructive") ?? "secondary"
                          }
                        >
                          {CONTRACT_STATUS_LABELS[c.status] ?? c.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {format(new Date(c.validTo), "dd MMM yyyy")}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-center text-sm text-muted-foreground">
                No contracts expiring in the next 60 days.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Recently Created */}
        <Card>
          <CardHeader>
            <CardTitle>Recently Created</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-8 w-full" />
                ))}
              </div>
            ) : data?.recentContracts?.length ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Contract</TableHead>
                    <TableHead>Hotel</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.recentContracts.map((c) => (
                    <TableRow
                      key={c.id}
                      className="cursor-pointer"
                      onClick={() =>
                        router.push(`/contracting/contracts/${c.id}`)
                      }
                    >
                      <TableCell>
                        <div>
                          <span className="font-medium">{c.name}</span>
                          <span className="ml-2 text-xs text-muted-foreground">
                            {c.code}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>{c.hotelName}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            (CONTRACT_STATUS_VARIANTS[c.status] as
                              | "default"
                              | "secondary"
                              | "outline"
                              | "destructive") ?? "secondary"
                          }
                        >
                          {CONTRACT_STATUS_LABELS[c.status] ?? c.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {format(new Date(c.createdAt), "dd MMM yyyy")}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-center text-sm text-muted-foreground">
                No contracts yet.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function KpiCard({
  title,
  value,
  isLoading,
  icon: Icon,
  accent,
}: {
  title: string;
  value?: number;
  isLoading: boolean;
  icon: React.ElementType;
  accent: string;
}) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center gap-4">
          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${accent}`}>
            <Icon className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium text-muted-foreground truncate">
              {title}
            </p>
            {isLoading ? (
              <Skeleton className="mt-1 h-7 w-16" />
            ) : (
              <p className="text-2xl font-bold font-mono tabular-nums">{value ?? 0}</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
