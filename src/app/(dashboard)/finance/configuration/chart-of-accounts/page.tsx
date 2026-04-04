"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { MoreHorizontal, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import {
  DataTable,
  DataTableColumnHeader,
} from "@/components/shared/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ACCOUNT_TYPE_LABELS } from "@/lib/constants/finance";
import { trpc } from "@/lib/trpc";

type Account = {
  id: string;
  code: string;
  name: string;
  accountType: string;
  reconcile: boolean;
  deprecated: boolean;
  group: { name: string } | null;
};

const columns: ColumnDef<Account, unknown>[] = [
  {
    accessorKey: "code",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Code" />
    ),
    cell: ({ row }) => (
      <span className="font-mono font-medium">{row.getValue("code")}</span>
    ),
  },
  {
    accessorKey: "name",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Name" />
    ),
  },
  {
    accessorKey: "accountType",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Type" />
    ),
    cell: ({ row }) => (
      <Badge variant="outline">
        {ACCOUNT_TYPE_LABELS[row.getValue("accountType") as string] ??
          row.getValue("accountType")}
      </Badge>
    ),
  },
  {
    id: "group",
    accessorFn: (row) => row.group?.name ?? "—",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Group" />
    ),
  },
  {
    accessorKey: "reconcile",
    header: "Reconcile",
    cell: ({ row }) => (row.getValue("reconcile") ? "Yes" : "No"),
  },
  {
    id: "actions",
    cell: ({ row }) => <AccountActions account={row.original} />,
  },
];

function AccountActions({ account }: { account: Account }) {
  const utils = trpc.useUtils();
  const deleteMutation = trpc.finance.account.delete.useMutation({
    onSuccess: () => utils.finance.account.list.invalidate(),
  });

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon-xs">
          <MoreHorizontal className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem asChild>
          <Link href={`/finance/configuration/chart-of-accounts/${account.id}`}>
            Edit
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem
          className="text-destructive"
          onClick={() => deleteMutation.mutate({ id: account.id })}
        >
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default function ChartOfAccountsPage() {
  const router = useRouter();
  const { data, isLoading } = trpc.finance.account.list.useQuery({});

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Chart of Accounts
          </h1>
          <p className="text-muted-foreground">
            Manage your company&apos;s chart of accounts.
          </p>
        </div>
        <Button asChild>
          <Link href="/finance/configuration/chart-of-accounts/new">
            <Plus className="mr-2 size-4" />
            New Account
          </Link>
        </Button>
      </div>

      {isLoading ? (
        <div className="text-muted-foreground py-10 text-center">
          Loading...
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={data?.items ?? []}
          searchKey="name"
          searchPlaceholder="Search accounts..."
          onRowClick={(row) =>
            router.push(
              `/finance/configuration/chart-of-accounts/${row.id}`,
            )
          }
        />
      )}

      {/* Account Groups & Tags */}
      <div className="grid gap-4 md:grid-cols-2">
        <AccountGroupsPanel />
        <AccountTagsPanel />
      </div>
    </div>
  );
}

function AccountGroupsPanel() {
  const utils = trpc.useUtils();
  const { data: groups } = trpc.finance.account.listGroups.useQuery();
  const [name, setName] = useState("");

  const createMutation = trpc.finance.account.createGroup.useMutation({
    onSuccess: () => { utils.finance.account.listGroups.invalidate(); setName(""); toast.success("Group created"); },
    onError: (e) => toast.error(e.message),
  });
  const deleteMutation = trpc.finance.account.deleteGroup.useMutation({
    onSuccess: () => { utils.finance.account.listGroups.invalidate(); toast.success("Group deleted"); },
    onError: (e) => toast.error(e.message),
  });

  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Account Groups</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <div className="flex gap-2">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="New group name..." className="h-8 text-sm" />
          <Button size="sm" disabled={!name.trim() || createMutation.isPending} onClick={() => createMutation.mutate({ name: name.trim(), codePrefixStart: name.trim().toUpperCase().replace(/\s+/g, "_"), codePrefixEnd: name.trim().toUpperCase().replace(/\s+/g, "_") })}>Add</Button>
        </div>
        {(groups ?? []).length === 0 ? (
          <p className="text-xs text-muted-foreground">No account groups.</p>
        ) : (
          <div className="space-y-1">
            {(groups ?? []).map((g: { id: string; name: string; codePrefixStart: string }) => (
              <div key={g.id} className="flex items-center justify-between rounded border px-2 py-1 text-sm">
                <span>{g.name} <span className="text-xs text-muted-foreground">({g.codePrefixStart})</span></span>
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-destructive" onClick={() => deleteMutation.mutate({ id: g.id })}><Trash2 className="h-3 w-3" /></Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function AccountTagsPanel() {
  const utils = trpc.useUtils();
  const { data: tags } = trpc.finance.account.listTags.useQuery();
  const [name, setName] = useState("");

  const createMutation = trpc.finance.account.createTag.useMutation({
    onSuccess: () => { utils.finance.account.listTags.invalidate(); setName(""); toast.success("Tag created"); },
    onError: (e) => toast.error(e.message),
  });
  const deleteMutation = trpc.finance.account.deleteTag.useMutation({
    onSuccess: () => { utils.finance.account.listTags.invalidate(); toast.success("Tag deleted"); },
    onError: (e) => toast.error(e.message),
  });

  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Account Tags</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <div className="flex gap-2">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="New tag name..." className="h-8 text-sm" />
          <Button size="sm" disabled={!name.trim() || createMutation.isPending} onClick={() => createMutation.mutate({ name: name.trim() })}>Add</Button>
        </div>
        {(tags ?? []).length === 0 ? (
          <p className="text-xs text-muted-foreground">No account tags.</p>
        ) : (
          <div className="flex flex-wrap gap-1">
            {(tags ?? []).map((t: { id: string; name: string }) => (
              <Badge key={t.id} variant="secondary" className="gap-1">
                {t.name}
                <button className="ml-1 text-destructive hover:text-destructive/80" onClick={() => deleteMutation.mutate({ id: t.id })}>&times;</button>
              </Badge>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
