"use client";

import { useState } from "react";
import { format } from "date-fns";
import { AlertTriangle, CheckCircle, XCircle, Clock } from "lucide-react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import { CreditBlockDialog } from "@/components/tour-ops/credit-block-dialog";

const STATUS_VARIANTS: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  PENDING: "outline",
  APPROVED: "default",
  DENIED: "destructive",
};
const STATUS_ICONS = {
  PENDING: <Clock className="h-3.5 w-3.5" />,
  APPROVED: <CheckCircle className="h-3.5 w-3.5" />,
  DENIED: <XCircle className="h-3.5 w-3.5" />,
};

export default function CreditOverridesPage() {
  const { data: sessionData } = useSession();
  const roles = (sessionData?.user?.roles as string[] | undefined) ?? [];
  const isOperationsManager = roles.includes("operations_manager") || roles.includes("super_admin");

  const [activeTab, setActiveTab] = useState("pending");
  const [selectedRequest, setSelectedRequest] = useState<{
    overrideRequestId: string;
    overageAmount: number;
    creditLimit: number;
    creditUsed: number;
    requestedAmount: number;
  } | null>(null);

  const utils = trpc.useUtils();

  const { data: pending, isLoading: loadingPending } = trpc.tourOps.creditOverride.listPending.useQuery();
  const { data: all, isLoading: loadingAll } = trpc.tourOps.creditOverride.listAll.useQuery(
    { status: activeTab === "all" ? undefined : activeTab === "approved" ? "APPROVED" : "DENIED" },
    { enabled: activeTab !== "pending" }
  );

  const deny = trpc.tourOps.creditOverride.deny.useMutation({
    onSuccess: () => {
      toast.success("Override denied");
      utils.tourOps.creditOverride.listPending.invalidate();
      utils.tourOps.creditOverride.listAll.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const pendingCount = pending?.length ?? 0;

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <AlertTriangle className="h-6 w-6 text-amber-500" />
          Credit Limit Overrides
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Review and action credit limit override requests from staff
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="pending">
            Pending {pendingCount > 0 && <Badge variant="destructive" className="ml-1.5 h-4 px-1.5 text-[10px]">{pendingCount}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="approved">Approved</TabsTrigger>
          <TabsTrigger value="denied">Denied</TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="mt-4">
          {loadingPending ? (
            <Skeleton className="h-40 w-full" />
          ) : !pending?.length ? (
            <Card>
              <CardContent className="py-12 text-center">
                <CheckCircle className="mx-auto h-8 w-8 text-green-500 mb-2" />
                <p className="text-sm text-muted-foreground">No pending override requests</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {pending.map((req) => (
                <Card key={req.id} className="border-amber-200 dark:border-amber-800">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-sm font-semibold">
                          {req.tourOperator.name}
                          <span className="ml-2 font-mono text-xs text-muted-foreground">{req.tourOperator.code}</span>
                        </CardTitle>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Requested by {req.requestedBy.name} · {format(new Date(req.createdAt), "dd MMM yyyy HH:mm")}
                        </p>
                      </div>
                      <Badge variant="outline" className="border-amber-400 text-amber-600">
                        {STATUS_ICONS.PENDING} <span className="ml-1">Pending</span>
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-4 gap-2 text-sm">
                      <div>
                        <p className="text-xs text-muted-foreground">Credit Limit</p>
                        <p className="font-mono font-medium">${Number(req.creditLimit).toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Used</p>
                        <p className="font-mono font-medium text-amber-600">${Number(req.currentUsed).toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">This Request</p>
                        <p className="font-mono font-medium">${Number(req.amount).toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Exceeds by</p>
                        <p className="font-mono font-bold text-destructive">${Number(req.overageAmount).toLocaleString()}</p>
                      </div>
                    </div>
                    {isOperationsManager && (
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => setSelectedRequest({
                            overrideRequestId: req.id,
                            overageAmount: Number(req.overageAmount),
                            creditLimit: Number(req.creditLimit),
                            creditUsed: Number(req.currentUsed),
                            requestedAmount: Number(req.amount),
                          })}
                        >
                          <CheckCircle className="mr-1.5 h-3.5 w-3.5" /> Review & Approve
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => deny.mutate({ id: req.id })}
                          disabled={deny.isPending}
                        >
                          <XCircle className="mr-1.5 h-3.5 w-3.5" /> Deny
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {["approved", "denied"].map((tab) => (
          <TabsContent key={tab} value={tab} className="mt-4">
            {loadingAll ? (
              <Skeleton className="h-40 w-full" />
            ) : !all?.length ? (
              <Card>
                <CardContent className="py-12 text-center text-sm text-muted-foreground">
                  No {tab} requests
                </CardContent>
              </Card>
            ) : (
              <div className="rounded-md border overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="border-b bg-muted/50">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium">Tour Operator</th>
                      <th className="px-3 py-2 text-left font-medium">Requested by</th>
                      <th className="px-3 py-2 text-right font-medium">Amount</th>
                      <th className="px-3 py-2 text-right font-medium">Overage</th>
                      <th className="px-3 py-2 text-left font-medium">Resolved by</th>
                      <th className="px-3 py-2 text-left font-medium">Date</th>
                      <th className="px-3 py-2 text-left font-medium">File</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {all.map((req) => (
                      <tr key={req.id} className="hover:bg-muted/30">
                        <td className="px-3 py-2 font-medium">{req.tourOperator.name}</td>
                        <td className="px-3 py-2 text-muted-foreground">{req.requestedBy.name}</td>
                        <td className="px-3 py-2 text-right font-mono">${Number(req.amount).toLocaleString()}</td>
                        <td className="px-3 py-2 text-right font-mono text-destructive">${Number(req.overageAmount).toLocaleString()}</td>
                        <td className="px-3 py-2 text-muted-foreground">{req.resolvedBy?.name ?? "—"}</td>
                        <td className="px-3 py-2 text-xs text-muted-foreground">
                          {req.resolvedAt ? format(new Date(req.resolvedAt), "dd MMM yyyy") : "—"}
                        </td>
                        <td className="px-3 py-2">
                          {req.createdFile ? (
                            <Link href={`/tour-ops/files/${req.createdFile.id}`} className="font-mono text-primary hover:underline text-xs">
                              {req.createdFile.code}
                            </Link>
                          ) : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>

      {selectedRequest && (
        <CreditBlockDialog
          open={true}
          blockInfo={selectedRequest}
          isOperationsManager={isOperationsManager}
          onClose={() => setSelectedRequest(null)}
          onApproved={() => {
            utils.tourOps.creditOverride.listPending.invalidate();
            utils.tourOps.creditOverride.listAll.invalidate();
            setSelectedRequest(null);
          }}
        />
      )}
    </div>
  );
}
