"use client";

import {
  Activity,
  AlertTriangle,
  CalendarCheck,
  Clock,
  DollarSign,
  FileText,
  Receipt,
  TrendingUp,
  UserPlus,
  Users,
  Wallet,
} from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  CRM_ACTIVITY_TYPE_LABELS,
  CRM_BOOKING_STATUS_LABELS,
  CRM_BOOKING_STATUS_VARIANTS,
  CRM_LEAD_STATUS_LABELS,
  CRM_LEAD_STATUS_VARIANTS,
  CRM_OPPORTUNITY_STAGE_LABELS,
} from "@/lib/constants/crm";
import { trpc } from "@/lib/trpc";

export default function CrmDashboardPage() {
  const { data: leadData, isLoading: leadLoading } = trpc.crm.lead.dashboard.useQuery();
  const { data: bookingData, isLoading: bookingLoading } = trpc.crm.booking.dashboard.useQuery();
  const { data: alertData } = trpc.crm.booking.alerts.useQuery();

  const isLoading = leadLoading || bookingLoading;

  if (isLoading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">CRM & Sales</h1>
          <p className="text-muted-foreground">Overview of your sales pipeline and leads</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2"><Skeleton className="h-4 w-24" /></CardHeader>
              <CardContent><Skeleton className="h-8 w-16" /></CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const leadKpis = [
    { title: "Total Leads", value: leadData?.totalLeads ?? 0, icon: Users, color: "text-blue-600" },
    { title: "New Leads", value: leadData?.newLeads ?? 0, icon: UserPlus, color: "text-green-600" },
    { title: "Qualified", value: leadData?.qualifiedLeads ?? 0, icon: TrendingUp, color: "text-amber-600" },
    { title: "Pipeline Value", value: `$${Number(leadData?.pipelineValue ?? 0).toLocaleString()}`, icon: DollarSign, color: "text-emerald-600" },
  ];

  const totalRevenue = bookingData?.totalRevenue ?? 0;
  const totalCost = bookingData?.totalCost ?? 0;
  const totalProfit = totalRevenue - totalCost;
  const overallMargin = totalRevenue > 0 ? (totalProfit / totalRevenue * 100) : 0;

  const bookingKpis = [
    { title: "Total Bookings", value: bookingData?.total ?? 0, icon: FileText, color: "text-blue-600" },
    { title: "Confirmed", value: bookingData?.confirmed ?? 0, icon: CalendarCheck, color: "text-green-600" },
    { title: "Draft", value: bookingData?.draft ?? 0, icon: FileText, color: "text-amber-600" },
    { title: "Upcoming", value: bookingData?.upcoming ?? 0, icon: CalendarCheck, color: "text-purple-600" },
  ];

  const revenueKpis = [
    { title: "Revenue", value: `$${totalRevenue.toLocaleString()}`, icon: Receipt, color: "text-green-600" },
    { title: "Cost", value: `$${totalCost.toLocaleString()}`, icon: Wallet, color: "text-red-500" },
    { title: "Profit", value: `$${totalProfit.toLocaleString()}`, icon: DollarSign, color: "text-emerald-600" },
    { title: "Margin", value: `${overallMargin.toFixed(1)}%`, icon: TrendingUp, color: "text-blue-600" },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">CRM & Sales</h1>
        <p className="text-muted-foreground">Overview of your sales pipeline, leads, and bookings</p>
      </div>

      {/* Lead KPIs */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Leads & Pipeline</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {leadKpis.map((kpi) => (
            <Card key={kpi.title}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{kpi.title}</CardTitle>
                <kpi.icon className={`h-4 w-4 ${kpi.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{kpi.value}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Booking KPIs */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Bookings</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {bookingKpis.map((kpi) => (
            <Card key={kpi.title}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{kpi.title}</CardTitle>
                <kpi.icon className={`h-4 w-4 ${kpi.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{kpi.value}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Revenue KPIs */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Revenue (Confirmed & Completed)</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {revenueKpis.map((kpi) => (
            <Card key={kpi.title}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{kpi.title}</CardTitle>
                <kpi.icon className={`h-4 w-4 ${kpi.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{kpi.value}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Alerts */}
      {((alertData?.upcomingBookings?.length ?? 0) > 0 || (alertData?.overdueActivities?.length ?? 0) > 0) && (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Upcoming Bookings (next 7 days) */}
          {(alertData?.upcomingBookings?.length ?? 0) > 0 && (
            <Card className="border-blue-200 dark:border-blue-800">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Clock className="h-4 w-4 text-blue-600" />
                  Upcoming Bookings (Next 7 Days)
                  <Badge variant="secondary" className="ml-auto">{alertData!.upcomingBookings.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {alertData!.upcomingBookings.map((booking) => {
                    const daysUntil = Math.ceil(
                      (new Date(booking.travelDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
                    );
                    return (
                      <Link
                        key={booking.id}
                        href={`/crm/bookings/${booking.id}`}
                        className="flex items-center justify-between rounded-md border p-3 hover:bg-muted/50 transition-colors"
                      >
                        <div>
                          <p className="text-sm font-medium">
                            {booking.customer
                              ? `${booking.customer.firstName} ${booking.customer.lastName}`
                              : "Walk-in"}
                          </p>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground font-mono">{booking.code}</span>
                            <span className="text-xs text-muted-foreground">
                              {new Date(booking.travelDate).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                        <Badge variant={daysUntil <= 1 ? "destructive" : daysUntil <= 3 ? "default" : "secondary"}>
                          {daysUntil === 0 ? "Today" : daysUntil === 1 ? "Tomorrow" : `${daysUntil}d`}
                        </Badge>
                      </Link>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Overdue Activities */}
          {(alertData?.overdueActivities?.length ?? 0) > 0 && (
            <Card className="border-red-200 dark:border-red-800">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                  Overdue Activities
                  <Badge variant="destructive" className="ml-auto">{alertData!.overdueActivities.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {alertData!.overdueActivities.map((activity) => {
                    const daysOverdue = Math.ceil(
                      (Date.now() - new Date(activity.dueDate!).getTime()) / (1000 * 60 * 60 * 24)
                    );
                    const linkedTo = activity.lead
                      ? `${activity.lead.firstName} ${activity.lead.lastName}`
                      : activity.customer
                        ? `${activity.customer.firstName} ${activity.customer.lastName}`
                        : activity.booking
                          ? activity.booking.code
                          : null;
                    return (
                      <div key={activity.id} className="flex items-center justify-between rounded-md border p-3">
                        <div>
                          <p className="text-sm font-medium">{activity.subject}</p>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">{CRM_ACTIVITY_TYPE_LABELS[activity.type]}</Badge>
                            {linkedTo && <span className="text-xs text-muted-foreground">{linkedTo}</span>}
                            {activity.assignedTo && (
                              <span className="text-xs text-muted-foreground">- {activity.assignedTo.name}</span>
                            )}
                          </div>
                        </div>
                        <Badge variant="destructive">{daysOverdue}d overdue</Badge>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Recent Leads */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between text-base">
              <span className="flex items-center gap-2"><UserPlus className="h-4 w-4" /> Recent Leads</span>
              <Link href="/crm/leads" className="text-xs text-muted-foreground hover:underline">View all</Link>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {(leadData?.recentLeads?.length ?? 0) === 0 ? (
              <p className="text-sm text-muted-foreground">No leads yet</p>
            ) : (
              <div className="space-y-3">
                {leadData?.recentLeads.map((lead) => (
                  <div key={lead.id} className="flex items-center justify-between rounded-md border p-3">
                    <div>
                      <p className="text-sm font-medium">{lead.firstName} {lead.lastName}</p>
                      <p className="text-xs text-muted-foreground font-mono">{lead.code}</p>
                    </div>
                    <Badge variant={CRM_LEAD_STATUS_VARIANTS[lead.status] as "default"}>
                      {CRM_LEAD_STATUS_LABELS[lead.status]}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pipeline by Stage */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between text-base">
              <span className="flex items-center gap-2"><Activity className="h-4 w-4" /> Pipeline by Stage</span>
              <Link href="/crm/pipeline" className="text-xs text-muted-foreground hover:underline">View all</Link>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {(leadData?.stageBreakdown?.length ?? 0) === 0 ? (
              <p className="text-sm text-muted-foreground">No opportunities yet</p>
            ) : (
              <div className="space-y-3">
                {leadData?.stageBreakdown.map((stage) => (
                  <div key={stage.stage} className="flex items-center justify-between rounded-md border p-3">
                    <div>
                      <p className="text-sm font-medium">{CRM_OPPORTUNITY_STAGE_LABELS[stage.stage]}</p>
                      <p className="text-xs text-muted-foreground">
                        {stage._count} {stage._count === 1 ? "opportunity" : "opportunities"}
                      </p>
                    </div>
                    <p className="text-sm font-medium">${Number(stage._sum?.value ?? 0).toLocaleString()}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Bookings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between text-base">
              <span className="flex items-center gap-2"><CalendarCheck className="h-4 w-4" /> Recent Bookings</span>
              <Link href="/crm/bookings" className="text-xs text-muted-foreground hover:underline">View all</Link>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {(bookingData?.recentBookings?.length ?? 0) === 0 ? (
              <p className="text-sm text-muted-foreground">No bookings yet</p>
            ) : (
              <div className="space-y-3">
                {bookingData?.recentBookings.map((booking) => (
                  <div key={booking.id} className="flex items-center justify-between rounded-md border p-3">
                    <div>
                      <p className="text-sm font-medium">
                        {booking.customer
                          ? `${booking.customer.firstName} ${booking.customer.lastName}`
                          : "Walk-in"}
                      </p>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground font-mono">{booking.code}</span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(booking.travelDate).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <Badge variant={CRM_BOOKING_STATUS_VARIANTS[booking.status] as "default"}>
                      {CRM_BOOKING_STATUS_LABELS[booking.status]}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
