"use client";

import { Bus, Car, Clock, CheckCircle, Users, CalendarDays } from "lucide-react";
import { useRouter } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { TT_JOB_STATUS_LABELS, TT_JOB_STATUS_VARIANTS } from "@/lib/constants/traffic";
import { trpc } from "@/lib/trpc";

export default function TrafficDashboardPage() {
  const router = useRouter();
  const { data, isLoading } = trpc.traffic.trafficJob.dashboard.useQuery();

  return (
    <div className="animate-fade-in space-y-6">
      <div className="page-header">
        <h1 className="text-2xl font-bold">Traffic & Transport</h1>
        <p className="text-muted-foreground">Fleet management, dispatch, and transport operations</p>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          title="Today's Jobs"
          value={data?.todayJobs}
          icon={CalendarDays}
          loading={isLoading}
          color="text-blue-600"
        />
        <KpiCard
          title="Pending Jobs"
          value={data?.pendingJobs}
          icon={Clock}
          loading={isLoading}
          color="text-amber-600"
        />
        <KpiCard
          title="Active Vehicles"
          value={data?.vehicleCount}
          icon={Car}
          loading={isLoading}
          color="text-green-600"
        />
        <KpiCard
          title="Active Drivers"
          value={data?.driverCount}
          icon={Users}
          loading={isLoading}
          color="text-purple-600"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Stats */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Bus className="h-4 w-4" />
              Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-6 w-full" />
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Total Jobs</span>
                  <span className="font-medium">{data?.totalJobs ?? 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Completed</span>
                  <span className="font-medium">{data?.completedJobs ?? 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Completion Rate</span>
                  <span className="font-medium">
                    {data?.totalJobs
                      ? `${Math.round(((data.completedJobs ?? 0) / data.totalJobs) * 100)}%`
                      : "—"}
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Jobs */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CheckCircle className="h-4 w-4" />
              Recent Jobs
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-8 w-full" />
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                {data?.recentJobs?.map((job) => (
                  <div
                    key={job.id}
                    className="flex cursor-pointer items-center justify-between rounded-md border p-2 transition-colors hover:bg-muted/50"
                    onClick={() => router.push(`/traffic/jobs/${job.id}`)}
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-sm">{job.code}</span>
                      <span className="text-sm text-muted-foreground">
                        {job.vehicleType?.name}
                      </span>
                    </div>
                    <Badge variant={(TT_JOB_STATUS_VARIANTS[job.status] ?? "secondary") as never}>
                      {TT_JOB_STATUS_LABELS[job.status] ?? job.status}
                    </Badge>
                  </div>
                ))}
                {(!data?.recentJobs || data.recentJobs.length === 0) && (
                  <p className="py-4 text-center text-sm text-muted-foreground">
                    No jobs yet. Create your first traffic job.
                  </p>
                )}
              </div>
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
  icon: Icon,
  loading,
  color,
}: {
  title: string;
  value?: number;
  icon: React.ElementType;
  loading: boolean;
  color: string;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-6">
        <div className={`rounded-lg bg-muted p-3 ${color}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          {loading ? (
            <Skeleton className="mt-1 h-7 w-16" />
          ) : (
            <p className="text-2xl font-bold">{value ?? 0}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
