"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useFieldArray, useForm, FormProvider } from "react-hook-form";
import type { z } from "zod";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { trpc } from "@/lib/trpc";
import { fiscalPositionSchema } from "@/lib/validations/finance";

type FiscalPositionFormValues = z.input<typeof fiscalPositionSchema>;

interface FiscalPositionFormProps {
  defaultValues?: FiscalPositionFormValues & { id?: string };
}

export function FiscalPositionForm({ defaultValues }: FiscalPositionFormProps) {
  const router = useRouter();
  const utils = trpc.useUtils();
  const isEdit = !!defaultValues?.id;

  const form = useForm<FiscalPositionFormValues>({
    resolver: zodResolver(fiscalPositionSchema),
    defaultValues: {
      name: "",
      autoApply: false,
      countryId: null,
      vatRequired: false,
      isActive: true,
      taxMaps: [],
      accountMaps: [],
      ...defaultValues,
    },
  });

  const taxMapsArray = useFieldArray({
    control: form.control,
    name: "taxMaps",
  });

  const accountMapsArray = useFieldArray({
    control: form.control,
    name: "accountMaps",
  });

  const { data: taxList } = trpc.finance.tax.list.useQuery();
  const { data: accounts } = trpc.finance.account.list.useQuery({});
  const accountItems = accounts?.items ?? [];

  const createMutation = trpc.finance.fiscalPosition.create.useMutation({
    onSuccess: () => {
      utils.finance.fiscalPosition.list.invalidate();
      router.push("/finance/configuration/fiscal-positions");
    },
  });

  const updateMutation = trpc.finance.fiscalPosition.update.useMutation({
    onSuccess: () => {
      utils.finance.fiscalPosition.list.invalidate();
      utils.finance.fiscalPosition.getById.invalidate();
      router.push("/finance/configuration/fiscal-positions");
    },
  });

  function onSubmit(values: FiscalPositionFormValues) {
    if (isEdit && defaultValues?.id) {
      updateMutation.mutate({ id: defaultValues.id, ...values });
    } else {
      createMutation.mutate(values);
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <FormProvider {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Basic Info */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Name</FormLabel>
                <FormControl>
                  <Input placeholder="e.g. EU B2B" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="autoApply"
            render={({ field }) => (
              <FormItem className="flex items-center gap-2 space-y-0 pt-8">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
                <FormLabel className="font-normal">Auto Apply</FormLabel>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="vatRequired"
            render={({ field }) => (
              <FormItem className="flex items-center gap-2 space-y-0 pt-8">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
                <FormLabel className="font-normal">VAT Required</FormLabel>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="isActive"
            render={({ field }) => (
              <FormItem className="flex items-center gap-2 space-y-0">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
                <FormLabel className="font-normal">Active</FormLabel>
              </FormItem>
            )}
          />
        </div>

        {/* Tax Mappings */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-base">Tax Mappings</CardTitle>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                taxMapsArray.append({ taxSrcId: "", taxDestId: "" })
              }
            >
              <Plus className="mr-1 h-4 w-4" />
              Add
            </Button>
          </CardHeader>
          <CardContent>
            {taxMapsArray.fields.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No tax mappings. Taxes will remain unchanged.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Source Tax</TableHead>
                    <TableHead>Destination Tax</TableHead>
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {taxMapsArray.fields.map((field, index) => (
                    <TableRow key={field.id}>
                      <TableCell>
                        <FormField
                          control={form.control}
                          name={`taxMaps.${index}.taxSrcId`}
                          render={({ field: f }) => (
                            <Select
                              onValueChange={f.onChange}
                              value={f.value}
                            >
                              <SelectTrigger className="w-full">
                                <SelectValue placeholder="Source tax" />
                              </SelectTrigger>
                              <SelectContent>
                                {(taxList ?? []).map((t: any) => (
                                  <SelectItem key={t.id} value={t.id}>
                                    {t.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                        />
                      </TableCell>
                      <TableCell>
                        <FormField
                          control={form.control}
                          name={`taxMaps.${index}.taxDestId`}
                          render={({ field: f }) => (
                            <Select
                              onValueChange={f.onChange}
                              value={f.value}
                            >
                              <SelectTrigger className="w-full">
                                <SelectValue placeholder="Destination tax" />
                              </SelectTrigger>
                              <SelectContent>
                                {(taxList ?? []).map((t: any) => (
                                  <SelectItem key={t.id} value={t.id}>
                                    {t.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                        />
                      </TableCell>
                      <TableCell>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-xs"
                          onClick={() => taxMapsArray.remove(index)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Account Mappings */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-base">Account Mappings</CardTitle>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                accountMapsArray.append({
                  accountSrcId: "",
                  accountDestId: "",
                })
              }
            >
              <Plus className="mr-1 h-4 w-4" />
              Add
            </Button>
          </CardHeader>
          <CardContent>
            {accountMapsArray.fields.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No account mappings. Accounts will remain unchanged.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Source Account</TableHead>
                    <TableHead>Destination Account</TableHead>
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {accountMapsArray.fields.map((field, index) => (
                    <TableRow key={field.id}>
                      <TableCell>
                        <FormField
                          control={form.control}
                          name={`accountMaps.${index}.accountSrcId`}
                          render={({ field: f }) => (
                            <Select
                              onValueChange={f.onChange}
                              value={f.value}
                            >
                              <SelectTrigger className="w-full">
                                <SelectValue placeholder="Source account" />
                              </SelectTrigger>
                              <SelectContent>
                                {accountItems.map((a: any) => (
                                  <SelectItem key={a.id} value={a.id}>
                                    {a.code} — {a.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                        />
                      </TableCell>
                      <TableCell>
                        <FormField
                          control={form.control}
                          name={`accountMaps.${index}.accountDestId`}
                          render={({ field: f }) => (
                            <Select
                              onValueChange={f.onChange}
                              value={f.value}
                            >
                              <SelectTrigger className="w-full">
                                <SelectValue placeholder="Dest account" />
                              </SelectTrigger>
                              <SelectContent>
                                {accountItems.map((a: any) => (
                                  <SelectItem key={a.id} value={a.id}>
                                    {a.code} — {a.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                        />
                      </TableCell>
                      <TableCell>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-xs"
                          onClick={() => accountMapsArray.remove(index)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex gap-2">
          <Button type="submit" disabled={isPending}>
            {isPending ? "Saving..." : isEdit ? "Update" : "Create"}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() =>
              router.push("/finance/configuration/fiscal-positions")
            }
          >
            Back
          </Button>
        </div>
      </form>
    </FormProvider>
  );
}
