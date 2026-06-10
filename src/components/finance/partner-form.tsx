"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Building2, Info, User } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Combobox } from "@/components/ui/combobox";
import { cn } from "@/lib/utils";

const schema = z.object({
  isCompany: z.boolean().default(false),
  name: z.string().min(1, "Name is required"),
  titleId: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  mobile: z.string().optional(),
  website: z.string().optional(),
  taxId: z.string().optional(),
  street: z.string().optional(),
  city: z.string().optional(),
  stateId: z.string().optional(),
  zip: z.string().optional(),
  countryId: z.string().optional(),
  paymentTermId: z.string().optional(),
  accountReceivableId: z.string().optional(),
  accountPayableId: z.string().optional(),
  creditLimit: z.number().min(0).optional(),
  creditUsed: z.number().min(0).optional(),
  creditCurrency: z.string().optional(),
  notes: z.string().optional(),
});

type FormValues = z.input<typeof schema>;

interface Props {
  type: "customer" | "supplier";
  defaultValues?: Partial<FormValues>;
  onSave: (values: FormValues) => void;
  isSaving?: boolean;
}

const RECEIVABLE_TYPES = ["ASSET_RECEIVABLE"];
const PAYABLE_TYPES = ["LIABILITY_PAYABLE"];

const TITLE_OPTIONS = [
  { value: "", label: "— None —" },
  { value: "mr", label: "Mr." },
  { value: "mrs", label: "Mrs." },
  { value: "ms", label: "Ms." },
  { value: "dr", label: "Dr." },
  { value: "prof", label: "Prof." },
];

export function PartnerForm({ type, defaultValues, onSave, isSaving }: Props) {
  const { data: countries = [] } = trpc.setup.getCountries.useQuery();
  const { data: paymentTerms = [] } = trpc.finance.paymentTerm.list.useQuery();
  const { data: allAccounts = [] } = trpc.finance.account.listTree.useQuery();
  const { data: currencies = [] } = trpc.finance.currency.list.useQuery();

  const receivableAccounts = allAccounts.filter((a) => RECEIVABLE_TYPES.includes(a.accountType));
  const payableAccounts = allAccounts.filter((a) => PAYABLE_TYPES.includes(a.accountType));

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      isCompany: false,
      name: "",
      titleId: "",
      email: "",
      phone: "",
      mobile: "",
      website: "",
      taxId: "",
      street: "",
      city: "",
      zip: "",
      countryId: "",
      paymentTermId: "",
      accountReceivableId: "",
      accountPayableId: "",
      creditLimit: 0,
      creditUsed: 0,
      creditCurrency: "",
      notes: "",
      ...defaultValues,
    },
  });

  useEffect(() => {
    if (type === "customer" && receivableAccounts.length > 0) {
      const current = form.getValues("accountReceivableId");
      if (!current) form.setValue("accountReceivableId", receivableAccounts[0]!.id);
    }
    if (type === "supplier" && payableAccounts.length > 0) {
      const current = form.getValues("accountPayableId");
      if (!current) form.setValue("accountPayableId", payableAccounts[0]!.id);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [receivableAccounts.length, payableAccounts.length]);

  useEffect(() => {
    if (defaultValues) form.reset({ ...form.getValues(), ...defaultValues });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isCompany = form.watch("isCompany");

  const countryOptions = [
    { value: "", label: "— No country —" },
    ...countries.map((c) => ({ value: c.id, label: c.name })),
  ];

  const receivableOptions = [
    { value: "", label: "— None —" },
    ...receivableAccounts.map((a) => ({ value: a.id, label: `${a.code} — ${a.name}` })),
  ];

  const payableOptions = [
    { value: "", label: "— None —" },
    ...payableAccounts.map((a) => ({ value: a.id, label: `${a.code} — ${a.name}` })),
  ];

  const paymentTermOptions = [
    { value: "", label: "— Immediate payment —" },
    ...(paymentTerms as { id: string; name: string }[]).map((pt) => ({ value: pt.id, label: pt.name })),
  ];

  return (
    <form onSubmit={form.handleSubmit(onSave)} className="space-y-6">
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => form.setValue("isCompany", false)}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-colors",
            !isCompany
              ? "bg-primary text-primary-foreground border-primary"
              : "border-border text-muted-foreground hover:bg-muted"
          )}
        >
          <User className="size-4" /> Individual
        </button>
        <button
          type="button"
          onClick={() => form.setValue("isCompany", true)}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-colors",
            isCompany
              ? "bg-primary text-primary-foreground border-primary"
              : "border-border text-muted-foreground hover:bg-muted"
          )}
        >
          <Building2 className="size-4" /> Company
        </button>
      </div>

      <Tabs defaultValue="contact">
        <TabsList>
          <TabsTrigger value="contact">Contact Information</TabsTrigger>
          <TabsTrigger value="accounting">Accounting</TabsTrigger>
          <TabsTrigger value="notes">Internal Notes</TabsTrigger>
        </TabsList>

        <TabsContent value="contact">
          <Card>
            <CardContent className="pt-6 space-y-4">
              <div className="grid grid-cols-[auto_1fr] gap-4 items-start">
                {!isCompany && (
                  <div className="space-y-1.5">
                    <Label>Title</Label>
                    <Combobox
                      options={TITLE_OPTIONS}
                      value={form.watch("titleId") ?? ""}
                      onValueChange={(v) => form.setValue("titleId", v)}
                      placeholder="Title"
                      className="w-28"
                    />
                  </div>
                )}
                {isCompany && <div />}

                <div className="space-y-1.5">
                  <Label>
                    {isCompany ? "Company Name" : "Full Name"} <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    {...form.register("name")}
                    placeholder={isCompany ? "e.g. Fulvago Travel LLC" : "e.g. Ahmed Hassan"}
                    className={form.formState.errors.name ? "border-destructive" : ""}
                  />
                  {form.formState.errors.name && (
                    <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Phone</Label>
                  <Input {...form.register("phone")} placeholder="+20 2 ..." />
                </div>
                <div className="space-y-1.5">
                  <Label>Mobile</Label>
                  <Input {...form.register("mobile")} placeholder="+20 10 ..." />
                </div>
                <div className="space-y-1.5">
                  <Label>Email</Label>
                  <Input {...form.register("email")} type="email" placeholder="email@example.com" />
                </div>
                <div className="space-y-1.5">
                  <Label>Website</Label>
                  <Input {...form.register("website")} placeholder="https://..." />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Tax ID / VAT Number</Label>
                <Input {...form.register("taxId")} placeholder="e.g. 123-456-789" className="max-w-xs" />
              </div>

              <div className="pt-2 border-t">
                <p className="text-sm font-medium mb-3 text-muted-foreground">Address</p>
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label>Street</Label>
                    <Input {...form.register("street")} placeholder="123 Tahrir Street" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label>City</Label>
                      <Input {...form.register("city")} placeholder="Cairo" />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Zip</Label>
                      <Input {...form.register("zip")} placeholder="11511" />
                    </div>
                  </div>
                  <div className="space-y-1.5 max-w-xs">
                    <Label>Country</Label>
                    <Combobox
                      options={countryOptions}
                      value={form.watch("countryId") ?? ""}
                      onValueChange={(v) => form.setValue("countryId", v)}
                      placeholder="Select country"
                      searchPlaceholder="Search countries..."
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="accounting">
          <Card>
            <CardContent className="pt-6 space-y-6">
              {type === "customer" ? (
                <div className="space-y-1.5">
                  <Label>
                    Account Receivable
                    <span className="ml-1 text-xs text-muted-foreground">(auto-selected)</span>
                  </Label>
                  <div className="max-w-sm">
                    <Combobox
                      options={receivableOptions}
                      value={form.watch("accountReceivableId") ?? ""}
                      onValueChange={(v) => form.setValue("accountReceivableId", v)}
                      placeholder="Select account…"
                      searchPlaceholder="Search accounts..."
                    />
                  </div>
                  <p className="text-xs text-muted-foreground flex items-start gap-1">
                    <Info className="size-3 mt-0.5 shrink-0" />
                    Receivable account used for customer invoices. Defaults to the first
                    &quot;Receivable&quot; account in your chart.
                  </p>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <Label>
                    Account Payable
                    <span className="ml-1 text-xs text-muted-foreground">(auto-selected)</span>
                  </Label>
                  <div className="max-w-sm">
                    <Combobox
                      options={payableOptions}
                      value={form.watch("accountPayableId") ?? ""}
                      onValueChange={(v) => form.setValue("accountPayableId", v)}
                      placeholder="Select account…"
                      searchPlaceholder="Search accounts..."
                    />
                  </div>
                  <p className="text-xs text-muted-foreground flex items-start gap-1">
                    <Info className="size-3 mt-0.5 shrink-0" />
                    Payable account used for vendor bills. Defaults to the first
                    &quot;Payable&quot; account in your chart.
                  </p>
                </div>
              )}

              <div className="space-y-1.5 max-w-sm">
                <Label>Payment Terms</Label>
                <Combobox
                  options={paymentTermOptions}
                  value={form.watch("paymentTermId") ?? ""}
                  onValueChange={(v) => form.setValue("paymentTermId", v)}
                  placeholder="Immediate payment"
                  searchPlaceholder="Search payment terms..."
                />
                <p className="text-xs text-muted-foreground">
                  Default payment terms applied to {type === "customer" ? "invoices" : "bills"}.
                </p>
              </div>

              <div className="pt-2 border-t">
                <p className="text-sm font-medium mb-3 text-muted-foreground">Credit</p>
                <div className="grid grid-cols-3 gap-4 max-w-xl">
                  <div className="space-y-1.5">
                    <Label>Credit Days</Label>
                    <Input
                      type="number"
                      min={0}
                      step="1"
                      value={String(form.watch("creditLimit") ?? 0)}
                      onChange={(e) => form.setValue("creditLimit", Number(e.target.value))}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Credit Amount</Label>
                    <Input
                      type="number"
                      min={0}
                      step="0.01"
                      value={String(form.watch("creditUsed") ?? 0)}
                      onChange={(e) => form.setValue("creditUsed", Number(e.target.value))}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Currency</Label>
                    <Combobox
                      options={[
                        { value: "", label: "— None —" },
                        ...(currencies as { code: string; name: string; symbol: string }[]).map((c) => ({
                          value: c.code,
                          label: `${c.code} — ${c.name}`,
                        })),
                      ]}
                      value={form.watch("creditCurrency") ?? ""}
                      onValueChange={(v) => form.setValue("creditCurrency", v)}
                      placeholder="Select currency"
                      searchPlaceholder="Search currencies..."
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notes">
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-1.5">
                <Label>Internal Notes</Label>
                <Textarea
                  {...form.register("notes")}
                  placeholder="Add internal notes about this contact..."
                  rows={6}
                />
                <p className="text-xs text-muted-foreground">Not visible on invoices or bills.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="flex justify-end">
        <Button type="submit" disabled={isSaving}>
          {isSaving ? "Saving…" : "Save"}
        </Button>
      </div>
    </form>
  );
}
