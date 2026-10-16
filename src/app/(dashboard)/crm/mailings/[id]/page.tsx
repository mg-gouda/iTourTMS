"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";

import { MailingEditor } from "@/components/crm/mailing-editor";
import { PermissionGuard } from "@/components/shared/permission-guard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { trpc } from "@/lib/trpc";

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  DRAFT: "outline",
  SENDING: "secondary",
  SENT: "default",
  PENDING: "secondary",
  FAILED: "destructive",
};

export default function MailingPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const utils = trpc.useUtils();
  const { data: m, isLoading } = trpc.crm.mailing.getById.useQuery(
    { id },
    // Watch progress while it sends.
    { refetchInterval: (q) => (q.state.data?.status === "SENDING" ? 2000 : false) },
  );
  const remove = trpc.crm.mailing.delete.useMutation({
    onSuccess: () => {
      utils.crm.mailing.list.invalidate();
      router.push("/crm/mailings");
    },
    onError: (e) => toast.error(e.message),
  });

  if (isLoading || !m) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  const sent = m.recipients.filter((r) => r.status === "SENT").length;
  const failed = m.recipients.filter((r) => r.status === "FAILED").length;

  return (
    <PermissionGuard permission="crm:lead:read">
      <div className="animate-fade-in space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
              {m.name} <Badge variant={STATUS_VARIANT[m.status]}>{m.status.toLowerCase()}</Badge>
            </h1>
            <p className="text-muted-foreground text-sm">
              {m.branch.name}
              {m.createdBy?.name && <> · by {m.createdBy.name}</>}
              {m.sentAt && <> · sent {new Date(m.sentAt).toLocaleString()}</>}
            </p>
          </div>
          {m.status !== "SENDING" && (
            <Button
              variant="ghost"
              className="text-destructive"
              disabled={remove.isPending}
              onClick={() => confirm("Delete this mailing and its send log?") && remove.mutate({ id })}
            >
              Delete
            </Button>
          )}
        </div>

        {m.status === "DRAFT" ? (
          <MailingEditor key={m.updatedAt.toString()} initial={{ ...m, audience: m.audience }} />
        ) : (
          <>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-3 rounded-lg border p-4 sm:grid-cols-4">
              <div>
                <dt className="text-muted-foreground text-xs">Recipients</dt>
                <dd className="font-mono text-lg tabular-nums">{m.recipients.length}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground text-xs">Delivered to server</dt>
                <dd className="font-mono text-lg tabular-nums">{sent}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground text-xs">Failed</dt>
                <dd className={`font-mono text-lg tabular-nums ${failed ? "text-destructive" : ""}`}>{failed}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground text-xs">Still to send</dt>
                <dd className="font-mono text-lg tabular-nums">{m.recipients.length - sent - failed}</dd>
              </div>
            </dl>

            <section className="space-y-2" aria-label="Message">
              <h2 className="text-sm font-semibold">{m.subject}</h2>
              <p className="bg-muted/40 max-w-[70ch] rounded-lg border p-4 text-sm leading-relaxed whitespace-pre-wrap">{m.body}</p>
            </section>

            <section className="space-y-2" aria-label="Recipients">
              <h2 className="text-sm font-semibold">Recipients</h2>
              <div className="rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Note</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {m.recipients.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell>
                          {r.leadId ? (
                            <Link href={`/crm/leads/${r.leadId}`} className="hover:underline">
                              {r.name}
                            </Link>
                          ) : r.customerId ? (
                            <Link href={`/crm/contacts/${r.customerId}`} className="hover:underline">
                              {r.name}
                            </Link>
                          ) : (
                            r.name
                          )}
                        </TableCell>
                        <TableCell className="font-mono text-xs">{r.email}</TableCell>
                        <TableCell>
                          <Badge variant={STATUS_VARIANT[r.status]}>{r.status.toLowerCase()}</Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground max-w-80 truncate text-xs" title={r.error ?? ""}>
                          {r.error ?? ""}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </section>
          </>
        )}
      </div>
    </PermissionGuard>
  );
}
