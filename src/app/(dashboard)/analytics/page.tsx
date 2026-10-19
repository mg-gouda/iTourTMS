"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";

import { ForecastTab } from "@/components/analytics/forecast-tab";
import { OverviewTab } from "@/components/analytics/overview-tab";
import { PartnersTab } from "@/components/analytics/partners-tab";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";

const TABS = ["overview", "forecast", "partners"] as const;

export default function AnalyticsPage() {
  const t = useTranslations("analytics");
  const [tab, setTab] = useState<(typeof TABS)[number]>("overview");
  const { data: access, isLoading } = trpc.analytics.access.useQuery();
  const hotels = access?.includes("reservations");

  return (
    <div className="animate-fade-in space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
        <p className="text-muted-foreground max-w-prose">{t("subtitle")}</p>
      </div>

      {isLoading ? (
        <Skeleton className="h-96 w-full" />
      ) : !access?.length ? (
        <p className="text-muted-foreground rounded-lg border border-dashed p-8 text-center text-sm">{t("noAccess")}</p>
      ) : (
        <Tabs value={hotels ? tab : "overview"} onValueChange={(v) => setTab(v as (typeof TABS)[number])}>
          <TabsList className="max-w-full justify-start overflow-x-auto">
            <TabsTrigger value="overview">{t("tabs.overview")}</TabsTrigger>
            {hotels && <TabsTrigger value="forecast">{t("tabs.forecast")}</TabsTrigger>}
            {hotels && <TabsTrigger value="partners">{t("tabs.partners")}</TabsTrigger>}
          </TabsList>
          <TabsContent value="overview" className="mt-4">
            <OverviewTab />
          </TabsContent>
          {hotels && (
            <TabsContent value="forecast" className="mt-4">
              <ForecastTab />
            </TabsContent>
          )}
          {hotels && (
            <TabsContent value="partners" className="mt-4">
              <PartnersTab />
            </TabsContent>
          )}
        </Tabs>
      )}
    </div>
  );
}
