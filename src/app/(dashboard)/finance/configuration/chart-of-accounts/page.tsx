"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { MoreHorizontal, Plus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import {
  DataTable,
  DataTableColumnHeader,
} from "@/components/shared/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
    </div>
  );
}
