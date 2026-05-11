"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { MoreHorizontal, Plus } from "lucide-react";
import { useState } from "react";
import { DataTable, DataTableColumnHeader } from "@/components/shared/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

const STATE_VARIANTS: Record<string, "outline" | "default" | "secondary"> = { DRAFT: "outline", IN_PROGRESS: "default", COMPLETED: "secondary" };
const STATE_LABELS: Record<string, string> = { DRAFT: "Draft", IN_PROGRESS: "In Progress", COMPLETED: "Completed" };

type WFRow = {
  id: string;
  name: string;
  state: string;
  assignedTo: string | null;
  dueDate: string | null;
  description: string | null;
  period: { name: string } | null;
};

export default function WorkingFilesPage() {
  const utils = trpc.useUtils();
  const { data, isLoading } = trpc.finance.workingFile.list.useQuery({});
  const createMut = trpc.finance.workingFile.create.useMutation({ onSuccess: () => { utils.finance.workingFile.list.invalidate(); setOpen(false); toast.success("Working file created"); } });
  const updateMut = trpc.finance.workingFile.update.useMutation({ onSuccess: () => { utils.finance.workingFile.list.invalidate(); toast.success("Updated"); } });
  const deleteMut = trpc.finance.workingFile.delete.useMutation({ onSuccess: () => { utils.finance.workingFile.list.invalidate(); toast.success("Deleted"); } });

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", assignedTo: "", dueDate: "", description: "" });

  const columns: ColumnDef<WFRow, unknown>[] = [
    { accessorKey: "name", header: "Name" },
    { id: "period", accessorFn: (r) => r.period?.name ?? "—", header: "Period" },
    { id: "assigned", accessorFn: (r) => r.assignedTo ?? "—", header: "Assigned To" },
    { id: "dueDate", accessorFn: (r) => r.dueDate, header: ({ column }) => <DataTableColumnHeader column={column} title="Due Date" />, cell: ({ row }) => row.original.dueDate ? new Date(row.original.dueDate).toLocaleDateString() : "—" },
    { accessorKey: "state", header: "Status", cell: ({ row }) => <Badge variant={STATE_VARIANTS[row.getValue("state") as string] ?? "outline"}>{STATE_LABELS[row.getValue("state") as string] ?? row.getValue("state")}</Badge> },
    {
      id: "actions",
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild><Button variant="ghost" size="icon-xs"><MoreHorizontal className="size-4" /></Button></DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {row.original.state === "DRAFT" && <DropdownMenuItem onClick={() => updateMut.mutate({ id: row.original.id, state: "IN_PROGRESS" })}>Start</DropdownMenuItem>}
            {row.original.state === "IN_PROGRESS" && <DropdownMenuItem onClick={() => updateMut.mutate({ id: row.original.id, state: "COMPLETED" })}>Mark Complete</DropdownMenuItem>}
            <DropdownMenuItem className="text-destructive" onClick={() => deleteMut.mutate({ id: row.original.id })}>Delete</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Working Files</h1>
          <p className="text-muted-foreground">Audit working papers and period-close checklists.</p>
        </div>
        <Button onClick={() => setOpen(true)}><Plus className="mr-2 size-4" />New File</Button>
      </div>
      {isLoading ? <div className="text-muted-foreground py-10 text-center">Loading...</div> : (
        <DataTable columns={columns} data={(data as any) ?? []} searchKey="name" searchPlaceholder="Search files..." />
      )}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>New Working File</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-1.5"><Label>Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5"><Label>Assigned To</Label><Input value={form.assignedTo} onChange={(e) => setForm({ ...form, assignedTo: e.target.value })} /></div>
              <div className="grid gap-1.5"><Label>Due Date</Label><Input type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} /></div>
            </div>
            <div className="grid gap-1.5"><Label>Description</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button disabled={createMut.isPending} onClick={() => createMut.mutate(form)}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
