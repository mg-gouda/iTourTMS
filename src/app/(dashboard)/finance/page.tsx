"use client";

import { useTranslations } from "next-intl";
import {
  Area,
  AreaChart,
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
import { formatCurrency } from "@/lib/format";
import { PermissionGuard } from "@/components/shared/permission-guard";
import { trpc } from "@/lib/trpc";

const PIE_COLORS = ["#22c55e", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6"];

export default function FinanceDashboardPage() {
  const t = useTranslations("finance");
  const tCommon = useTranslations("common");
  const tDashboard = useTranslations("dashboard");
  const { data, isLoading } = trpc.finance.report.dashboard.useQuery();

  return (
    <PermissionGuard permission="finance:move:read">
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <p className="text-muted-foreground">
          {tDashboard("overview")}
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          title={t("agedReceivable")}
          value={data?.totalReceivable}
          isLoading={isLoading}
        />
        <KpiCard
          title={t("agedPayable")}
          value={data?.totalPayable}
          isLoading={isLoading}
        />
        <KpiCard
          title={t("bankAccount")}
          value={data?.bankBalance}
          isLoading={isLoading}
        />
        <KpiCard
          title={t("revenue")}
          value={data?.revenueThisMonth}
          isLoading={isLoading}
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Revenue Trend */}
        <Card>
          <CardHeader>
            <CardTitle>{t("revenue")}</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[300px] w-full" />
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={data?.revenueTrend ?? []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip
                    formatter={(value) => formatCurrency(Number(value))}
                  />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="#3b82f6"
                    fill="#3b82f680"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Payment Status */}
        <Card>
          <CardHeader>
            <CardTitle>{t("payments")}</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[300px] w-full" />
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={data?.paymentStatusBreakdown ?? []}
                    dataKey="count"
                    nameKey="status"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {(data?.paymentStatusBreakdown ?? []).map((_, i) => (
                      <Cell
                        key={i}
                        fill={PIE_COLORS[i % PIE_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top Overdue Invoices */}
      <Card>
        <CardHeader>
          <CardTitle>{t("invoices")}</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-8 w-full" />
              ))}
            </div>
          ) : data?.topOverdueInvoices?.length ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("invoice")}</TableHead>
                  <TableHead>{t("customer")}</TableHead>
                  <TableHead>{t("dueDate")}</TableHead>
                  <TableHead className="text-right">{t("overdue")}</TableHead>
                  <TableHead className="text-right">{tCommon("amount")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.topOverdueInvoices.map((inv) => (
                  <TableRow key={inv.id}>
                    <TableCell className="font-mono font-medium">
                      {inv.name}
                    </TableCell>
                    <TableCell>{inv.partnerName}</TableCell>
                    <TableCell>
                      {new Date(inv.invoiceDateDue).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge
                        variant={inv.daysOverdue > 90 ? "destructive" : "outline"}
                      >
                        {inv.daysOverdue}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {formatCurrency(inv.amountResidual)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-center text-muted-foreground">
              {tCommon("noData")}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
    </PermissionGuard>
  );
}

function KpiCard({
  title,
  value,
  isLoading,
}: {
  title: string;
  value?: number;
  isLoading: boolean;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-8 w-32" />
        ) : (
          <p className="text-2xl font-bold font-mono">
            {formatCurrency(value ?? 0)}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
