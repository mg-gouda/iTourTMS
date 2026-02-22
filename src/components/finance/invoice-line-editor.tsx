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

interface Account {
  id: string;
  code: string;
  name: string;
}

interface TaxOption {
  id: string;
  name: string;
  amount: number;
}

interface InvoiceLineEditorProps {
  accounts: Account[];
  taxes: TaxOption[];
}

export function InvoiceLineEditor({ accounts, taxes }: InvoiceLineEditorProps) {
  const form = useFormContext();
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "lineItems",
  });

  function computeSubtotal(qty: number, price: number, discount: number) {
    return qty * price * (1 - discount / 100);
  }

  const lineItems = form.watch("lineItems") ?? [];
  const totalUntaxed = lineItems.reduce(
    (sum: number, l: any) =>
      l.displayType === "PRODUCT"
        ? sum + computeSubtotal(l.quantity || 0, l.priceUnit || 0, l.discount || 0)
        : sum,
    0,
  );

  return (
    <div className="space-y-3">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[250px]">Description</TableHead>
            <TableHead className="w-[180px]">Account</TableHead>
            <TableHead className="w-[80px]">Qty</TableHead>
            <TableHead className="w-[110px]">Unit Price</TableHead>
            <TableHead className="w-[80px]">Disc %</TableHead>
            <TableHead className="w-[150px]">Taxes</TableHead>
            <TableHead className="w-[110px] text-right">Subtotal</TableHead>
            <TableHead className="w-[50px]" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {fields.map((field, index) => {
            const displayType = form.watch(`lineItems.${index}.displayType`);

            if (displayType === "LINE_SECTION") {
              return (
                <TableRow key={field.id} className="bg-muted/50">
                  <TableCell colSpan={7}>
                    <FormField
                      control={form.control}
                      name={`lineItems.${index}.name`}
                      render={({ field: f }) => (
                        <FormItem>
                          <FormControl>
                            <Input
                              placeholder="Section title"
                              className="border-0 bg-transparent font-semibold"
                              {...f}
                              value={f.value ?? ""}
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
                    >
                      <Trash2 className="size-3.5 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              );
            }

            if (displayType === "LINE_NOTE") {
              return (
                <TableRow key={field.id}>
                  <TableCell colSpan={7}>
                    <FormField
                      control={form.control}
                      name={`lineItems.${index}.name`}
                      render={({ field: f }) => (
                        <FormItem>
                          <FormControl>
                            <Input
                              placeholder="Note..."
                              className="border-0 bg-transparent text-sm italic"
                              {...f}
                              value={f.value ?? ""}
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
                    >
                      <Trash2 className="size-3.5 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              );
            }

            const qty = form.watch(`lineItems.${index}.quantity`) || 0;
            const price = form.watch(`lineItems.${index}.priceUnit`) || 0;
            const disc = form.watch(`lineItems.${index}.discount`) || 0;
            const subtotal = computeSubtotal(qty, price, disc);

            return (
              <TableRow key={field.id}>
                <TableCell>
                  <FormField
                    control={form.control}
                    name={`lineItems.${index}.name`}
                    render={({ field: f }) => (
                      <FormItem>
                        <FormControl>
                          <Input
                            placeholder="Description"
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
                    name={`lineItems.${index}.quantity`}
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
                    name={`lineItems.${index}.priceUnit`}
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
                    name={`lineItems.${index}.discount`}
                    render={({ field: f }) => (
                      <FormItem>
                        <FormControl>
                          <Input
                            type="number"
                            min={0}
                            max={100}
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
                    name={`lineItems.${index}.taxIds`}
                    render={({ field: f }) => (
                      <FormItem>
                        <Select
                          onValueChange={(v) => {
                            const current: string[] = f.value ?? [];
                            if (current.includes(v)) {
                              f.onChange(current.filter((id: string) => id !== v));
                            } else {
                              f.onChange([...current, v]);
                            }
                          }}
                          value=""
                        >
                          <FormControl>
                            <SelectTrigger className="w-full">
                              <SelectValue
                                placeholder={
                                  (f.value?.length ?? 0) > 0
                                    ? `${f.value.length} tax(es)`
                                    : "Taxes"
                                }
                              />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {taxes.map((t) => (
                              <SelectItem key={t.id} value={t.id}>
                                {(f.value ?? []).includes(t.id) ? "✓ " : ""}{t.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )}
                  />
                </TableCell>
                <TableCell className="text-right font-mono">
                  {subtotal.toFixed(2)}
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
            );
          })}
        </TableBody>
        <TableFooter>
          <TableRow>
            <TableCell colSpan={6} className="text-right font-medium">
              Untaxed Amount
            </TableCell>
            <TableCell className="text-right font-mono font-medium">
              {totalUntaxed.toFixed(2)}
            </TableCell>
            <TableCell />
          </TableRow>
        </TableFooter>
      </Table>

      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() =>
            append({
              accountId: "",
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
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() =>
            append({
              accountId: "",
              name: "",
              displayType: "LINE_SECTION",
              debit: 0,
              credit: 0,
              quantity: 0,
              priceUnit: 0,
              discount: 0,
              taxIds: [],
              sequence: (fields.length + 1) * 10,
            })
          }
        >
          Add Section
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() =>
            append({
              accountId: "",
              name: "",
              displayType: "LINE_NOTE",
              debit: 0,
              credit: 0,
              quantity: 0,
              priceUnit: 0,
              discount: 0,
              taxIds: [],
              sequence: (fields.length + 1) * 10,
            })
          }
        >
          Add Note
        </Button>
      </div>
    </div>
  );
}
