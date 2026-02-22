"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { MoreHorizontal, Plus } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import type { z } from "zod";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { trpc } from "@/lib/trpc";
import { taxGroupSchema } from "@/lib/validations/finance";

type TaxGroupFormValues = z.input<typeof taxGroupSchema>;

function TaxGroupDialog({
  open,
  onOpenChange,
  defaultValues,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultValues?: TaxGroupFormValues & { id?: string };
}) {
  const utils = trpc.useUtils();
  const isEdit = !!defaultValues?.id;

  const form = useForm<TaxGroupFormValues>({
    resolver: zodResolver(taxGroupSchema),
    defaultValues: { name: "", sequence: 10, ...defaultValues },
  });

  const createMutation = trpc.finance.tax.createGroup.useMutation({
    onSuccess: () => {
      utils.finance.tax.listGroups.invalidate();
      onOpenChange(false);
      form.reset();
    },
  });

  const updateMutation = trpc.finance.tax.updateGroup.useMutation({
    onSuccess: () => {
      utils.finance.tax.listGroups.invalidate();
      onOpenChange(false);
    },
  });

  function onSubmit(values: TaxGroupFormValues) {
    if (isEdit && defaultValues?.id) {
      updateMutation.mutate({ id: defaultValues.id, ...values });
    } else {
      createMutation.mutate(values);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit" : "New"} Tax Group</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="VAT" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="sequence"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Sequence</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      {...field}
                      onChange={(e) =>
                        field.onChange(parseInt(e.target.value, 10) || 0)
                      }
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit">
                {isEdit ? "Update" : "Create"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export default function TaxGroupsPage() {
  const { data, isLoading } = trpc.finance.tax.listGroups.useQuery();
  const utils = trpc.useUtils();
  const deleteMutation = trpc.finance.tax.deleteGroup.useMutation({
    onSuccess: () => utils.finance.tax.listGroups.invalidate(),
  });

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<
    (TaxGroupFormValues & { id: string }) | undefined
  >();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Tax Groups</h1>
          <p className="text-muted-foreground">
            Group taxes for display on invoices.
          </p>
        </div>
        <Button
          onClick={() => {
            setEditingGroup(undefined);
            setDialogOpen(true);
          }}
        >
          <Plus className="mr-2 size-4" />
          New Tax Group
        </Button>
      </div>

      <TaxGroupDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        defaultValues={editingGroup}
      />

      {isLoading ? (
        <div className="text-muted-foreground py-10 text-center">
          Loading...
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Sequence</TableHead>
                <TableHead>Taxes</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {data?.length ? (
                data.map((group) => (
                  <TableRow key={group.id}>
                    <TableCell className="font-medium">{group.name}</TableCell>
                    <TableCell>{group.sequence}</TableCell>
                    <TableCell>{group._count.taxes}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon-xs">
                            <MoreHorizontal className="size-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => {
                              setEditingGroup({
                                id: group.id,
                                name: group.name,
                                sequence: group.sequence,
                              });
                              setDialogOpen(true);
                            }}
                          >
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() =>
                              deleteMutation.mutate({ id: group.id })
                            }
                          >
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="h-24 text-center">
                    No tax groups yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
