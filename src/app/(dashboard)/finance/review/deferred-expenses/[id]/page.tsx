"use client";

import { useParams } from "next/navigation";
import { toast } from "sonner";

import { DeferralDetail } from "@/components/finance/deferral-detail";
import { PermissionGuard } from "@/components/shared/permission-guard";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc";

export default function DeferredExpenseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const utils = trpc.useUtils();
  const { data, isLoading } = trpc.finance.deferredExpense.getById.useQuery({ id });
  const done = (r: { posted: number }) => {
    utils.finance.deferredExpense.getById.invalidate({ id });
    utils.finance.deferredExpense.list.invalidate();
    toast.success(r.posted ? `${r.posted} entr${r.posted === 1 ? "y" : "ies"} posted` : "Nothing due yet");
  };
  const onError = (e: { message: string }) => toast.error(e.message);
  const postDue = trpc.finance.deferredExpense.postDue.useMutation({ onSuccess: done, onError });
  const postLine = trpc.finance.deferredExpense.amortize.useMutation({ onSuccess: done, onError });

  if (isLoading) return <Skeleton className="h-96 w-full" />;
  if (!data) return <p className="text-muted-foreground">Not found.</p>;

  return (
    <PermissionGuard permission="finance:deferred:read">
      <DeferralDetail
        backHref="/finance/review/deferred-expenses"
        backLabel="Deferred expenses"
        verb="Amortise"
        posting={postDue.isPending || postLine.isPending}
        onPostDue={() => postDue.mutate({ id })}
        onPostLine={(scheduleId) => postLine.mutate({ scheduleId })}
        view={{
          name: data.name,
          state: data.state,
          branch: data.branch.name,
          amount: Number(data.amount),
          done: Number(data.amortizedAmount),
          startDate: data.startDate,
          endDate: data.endDate,
          debit: data.expenseAccount,
          credit: data.account,
          lines: data.schedule.map((l) => ({
            id: l.id,
            date: l.date,
            amount: Number(l.amount),
            posted: l.isAmortized,
            move: l.move,
          })),
        }}
      />
    </PermissionGuard>
  );
}
