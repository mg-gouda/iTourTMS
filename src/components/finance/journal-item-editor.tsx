"use client";

import { Plus, Trash2 } from "lucide-react";
import { useFieldArray, useFormContext } from "react-hook-form";

import { Button } from "@/components/ui/button";
import {
  FormControl,
  FormField,
  FormItem,
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
  TableFooter,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

interface Account {
  id: string;
  code: string;
  name: string;
}

interface Partner {
  id: string;
  name: string;
}

interface JournalItemEditorProps {
  accounts: Account[];
  partners: Partner[];
}

export function JournalItemEditor({ accounts, partners }: JournalItemEditorProps) {
  const form = useFormContext();
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "lineItems",
  });

  const lineItems = form.watch("lineItems") ?? [];
  const totalDebit = lineItems.reduce(
    (sum: number, l: any) => sum + (Number(l.debit) || 0),
    0,
  );
  const totalCredit = lineItems.reduce(
    (sum: number, l: any) => sum + (Number(l.credit) || 0),
    0,
  );
  const difference = totalDebit - totalCredit;

  return (
    <div className="space-y-3">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[200px]">Account</TableHead>
            <TableHead className="w-[150px]">Partner</TableHead>
            <TableHead className="w-[200px]">Label</TableHead>
            <TableHead className="w-[120px]">Debit</TableHead>
            <TableHead className="w-[120px]">Credit</TableHead>
            <TableHead className="w-[50px]" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {fields.map((field, index) => (
            <TableRow key={field.id}>
              <TableCell>
                <FormField
                  control={form.control}
                  name={`lineItems.${index}.accountId`}
                  render={({ field: f }) => (
                    <FormItem>
                      <Select
                        onValueChange={f.onChange}
                        value={f.value ?? ""}
                      >
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Account" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {accounts.map((a) => (
                            <SelectItem key={a.id} value={a.id}>
                              {a.code} — {a.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />
              </TableCell>
              <TableCell>
                <FormField
                  control={form.control}
                  name={`lineItems.${index}.partnerId`}
                  render={({ field: f }) => (
                    <FormItem>
                      <Select
                        onValueChange={(v) =>
                          f.onChange(v === "__none" ? null : v)
                        }
                        value={f.value ?? "__none"}
                      >
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="None" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="__none">None</SelectItem>
                          {partners.map((p) => (
                            <SelectItem key={p.id} value={p.id}>
                              {p.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />
              </TableCell>
              <TableCell>
                <FormField
                  control={form.control}
                  name={`lineItems.${index}.name`}
                  render={({ field: f }) => (
                    <FormItem>
                      <FormControl>
                        <Input
                          placeholder="Label"
                          {...f}
                          value={f.value ?? ""}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </TableCell>
              <TableCell>
                <FormField
                  control={form.control}
                  name={`lineItems.${index}.debit`}
                  render={({ field: f }) => (
                    <FormItem>
                      <FormControl>
                        <Input
                          type="number"
                          min={0}
                          step="any"
                          className="w-full"
                          {...f}
                          onChange={(e) => f.onChange(Number(e.target.value))}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </TableCell>
              <TableCell>
                <FormField
                  control={form.control}
                  name={`lineItems.${index}.credit`}
                  render={({ field: f }) => (
                    <FormItem>
                      <FormControl>
                        <Input
                          type="number"
                          min={0}
                          step="any"
                          className="w-full"
                          {...f}
                          onChange={(e) => f.onChange(Number(e.target.value))}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </TableCell>
              <TableCell>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  onClick={() => remove(index)}
                  disabled={fields.length <= 1}
                >
                  <Trash2 className="size-3.5 text-destructive" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
        <TableFooter>
          <TableRow>
            <TableCell colSpan={3} className="text-right font-medium">
              Total
            </TableCell>
            <TableCell className="font-mono font-medium">
              {totalDebit.toFixed(2)}
            </TableCell>
            <TableCell className="font-mono font-medium">
              {totalCredit.toFixed(2)}
            </TableCell>
            <TableCell />
          </TableRow>
          <TableRow>
            <TableCell colSpan={3} className="text-right font-medium">
              Difference
            </TableCell>
            <TableCell
              colSpan={2}
              className={cn(
                "font-mono font-medium",
                Math.abs(difference) > 0.01 && "text-destructive",
              )}
            >
              {difference.toFixed(2)}
            </TableCell>
            <TableCell />
          </TableRow>
        </TableFooter>
      </Table>

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() =>
          append({
            accountId: "",
            partnerId: null,
            name: "",
            displayType: "PRODUCT",
            debit: 0,
            credit: 0,
            quantity: 1,
            priceUnit: 0,
            discount: 0,
            taxIds: [],
            sequence: (fields.length + 1) * 10,
          })
        }
      >
        <Plus className="mr-1 size-3.5" />
        Add Line
      </Button>
    </div>
  );
}
