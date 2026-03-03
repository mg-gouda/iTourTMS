"use client";

import { format } from "date-fns";
import { Download } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";

export default function NewsletterPage() {
  const { data: subscribers, isLoading } =
    trpc.b2cSite.newsletter.listSubscribers.useQuery();

  const { data: csvData, refetch: exportCsv } =
    trpc.b2cSite.newsletter.exportCsv.useQuery(undefined, { enabled: false });

  const handleExport = async () => {
    const result = await exportCsv();
    if (result.data) {
      const blob = new Blob([result.data], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `newsletter-subscribers-${format(new Date(), "yyyy-MM-dd")}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  const activeCount = subscribers?.filter((s) => s.active).length ?? 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Newsletter Subscribers</h1>
          <p className="text-muted-foreground">
            {activeCount} active subscriber{activeCount !== 1 ? "s" : ""}
          </p>
        </div>
        <Button variant="outline" onClick={handleExport}>
          <Download className="mr-1.5 h-4 w-4" />
          Export CSV
        </Button>
      </div>

      {isLoading ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            Loading...
          </CardContent>
        </Card>
      ) : !subscribers?.length ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            No subscribers yet.
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-4 py-2 text-left font-medium">Email</th>
                  <th className="px-4 py-2 text-left font-medium">Subscribed</th>
                  <th className="px-4 py-2 text-left font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {subscribers.map((sub) => (
                  <tr key={sub.id} className="border-b last:border-0">
                    <td className="px-4 py-2">{sub.email}</td>
                    <td className="px-4 py-2 text-muted-foreground">
                      {format(new Date(sub.subscribedAt), "MMM d, yyyy")}
                    </td>
                    <td className="px-4 py-2">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs ${
                          sub.active
                            ? "bg-green-100 text-green-700"
                            : "bg-gray-100 text-gray-500"
                        }`}
                      >
                        {sub.active ? "Active" : "Unsubscribed"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
