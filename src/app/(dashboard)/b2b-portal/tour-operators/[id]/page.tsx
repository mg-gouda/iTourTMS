"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";

const updateSchema = z.object({
  name: z.string().min(1, "Name is required"),
  code: z.string().min(1, "Code is required"),
  contactPerson: z.string().optional(),
  email: z.string().email("Invalid email").or(z.literal("")).optional(),
  phone: z.string().optional(),
  countryId: z.string().optional(),
  marketId: z.string().optional(),
  creditLimit: z.number().min(0).optional(),
  paymentTermDays: z.number().int().min(0).optional(),
  commissionPct: z.number().min(0).max(100).optional(),
  active: z.boolean().optional(),
});

type FormValues = z.infer<typeof updateSchema>;

export default function TourOperatorDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const utils = trpc.useUtils();

  const { data, isLoading } = trpc.b2bPortal.tourOperator.getById.useQuery({ id });

  const form = useForm<FormValues>({
    resolver: zodResolver(updateSchema),
    defaultValues: {},
  });

  useEffect(() => {
    if (data) {
      form.reset({
        name: data.name,
        code: data.code,
        contactPerson: data.contactPerson ?? "",
        email: data.email ?? "",
        phone: data.phone ?? "",
        countryId: data.countryId ?? "",
        marketId: data.marketId ?? "",
        creditLimit: Number(data.creditLimit ?? 0),
        paymentTermDays: data.paymentTermDays ?? 30,
        commissionPct: Number(data.commissionPct ?? 0),
        active: data.active,
      });
    }
  }, [data, form]);

  const updateMutation = trpc.b2bPortal.tourOperator.update.useMutation({
    onSuccess: () => {
      utils.b2bPortal.tourOperator.getById.invalidate({ id });
      utils.b2bPortal.tourOperator.list.invalidate();
    },
  });

  const deleteMutation = trpc.b2bPortal.tourOperator.delete.useMutation({
    onSuccess: () => {
      utils.b2bPortal.tourOperator.list.invalidate();
      router.push("/b2b-portal/tour-operators");
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Skeleton className="size-8" />
          <Skeleton className="h-8 w-48" />
        </div>
        <Skeleton className="h-10 w-96" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!data) return <p>Tour operator not found</p>;

  const contracts = data.contractAssignments ?? [];
  const hotels = data.hotelAssignments ?? [];
  const tariffs = data.tariffs ?? [];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push("/b2b-portal/tour-operators")}
          >
            <ArrowLeft className="size-4" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight">{data.name}</h1>
              <Badge variant="outline" className="font-mono text-xs">
                {data.code}
              </Badge>
              <Badge variant={data.active ? "default" : "secondary"}>
                {data.active ? "Active" : "Inactive"}
              </Badge>
            </div>
            <div className="mt-1 flex items-center gap-3 text-sm text-muted-foreground">
              {data.country && <span>{data.country.name}</span>}
              {data.market && <span>Market: {data.market.name}</span>}
              {data.contactPerson && <span>Contact: {data.contactPerson}</span>}
            </div>
          </div>
        </div>
        <Button
          variant="destructive"
          size="sm"
          onClick={() => {
            if (confirm("Delete this tour operator? This cannot be undone."))
              deleteMutation.mutate({ id });
          }}
        >
          Delete
        </Button>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="details">
        <TabsList>
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="contracts">Contracts ({contracts.length})</TabsTrigger>
          <TabsTrigger value="hotels">Hotels ({hotels.length})</TabsTrigger>
          <TabsTrigger value="tariffs">Rate Sheets ({tariffs.length})</TabsTrigger>
        </TabsList>

        {/* Details Tab */}
        <TabsContent value="details" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Tour Operator Details</CardTitle>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit((v) =>
                    updateMutation.mutate({ id, data: v })
                  )}
                  className="space-y-4"
                >
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Name</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="code"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Code</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="contactPerson"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Contact Person</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input type="email" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="countryId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Country ID</FormLabel>
                          <FormControl>
                            <Input placeholder="Country ID" {...field} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="marketId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Market ID</FormLabel>
                          <FormControl>
                            <Input placeholder="Market ID" {...field} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name="creditLimit"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Credit Limit</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              value={String(field.value ?? 0)}
                              onChange={(e) => field.onChange(Number(e.target.value))}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="paymentTermDays"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Payment Terms (days)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              value={String(field.value ?? 30)}
                              onChange={(e) => field.onChange(Number(e.target.value))}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="commissionPct"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Commission %</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="0.1"
                              value={String(field.value ?? 0)}
                              onChange={(e) => field.onChange(Number(e.target.value))}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="active"
                    render={({ field }) => (
                      <FormItem className="flex items-center gap-2 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <FormLabel>Active</FormLabel>
                      </FormItem>
                    )}
                  />

                  {updateMutation.error && (
                    <p className="text-sm text-destructive">
                      {updateMutation.error.message}
                    </p>
                  )}

                  <Button type="submit" disabled={updateMutation.isPending}>
                    {updateMutation.isPending ? "Saving..." : "Save Changes"}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Contracts Tab */}
        <TabsContent value="contracts" className="mt-4">
          {contracts.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-sm text-muted-foreground">
                No contracts assigned to this tour operator
              </CardContent>
            </Card>
          ) : (
            <div className="overflow-hidden rounded border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-3 py-1.5 text-left text-xs font-medium">
                      Contract Code
                    </th>
                    <th className="px-3 py-1.5 text-left text-xs font-medium">
                      Hotel
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {contracts.map((ca) => (
                    <tr
                      key={ca.id}
                      className="border-b last:border-0 hover:bg-muted/30"
                    >
                      <td className="px-3 py-1.5">
                        {ca.contract ? (
                          <Link
                            href={`/contracting/contracts/${ca.contract.id}`}
                            className="font-mono text-xs text-primary hover:underline"
                          >
                            {ca.contract.code}
                          </Link>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-3 py-1.5">
                        {ca.contract?.hotel?.name ?? "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>

        {/* Hotels Tab */}
        <TabsContent value="hotels" className="mt-4">
          {hotels.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-sm text-muted-foreground">
                No hotels assigned to this tour operator
              </CardContent>
            </Card>
          ) : (
            <div className="overflow-hidden rounded border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-3 py-1.5 text-left text-xs font-medium">
                      Hotel Name
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {hotels.map((ha) => (
                    <tr
                      key={ha.id}
                      className="border-b last:border-0 hover:bg-muted/30"
                    >
                      <td className="px-3 py-1.5">
                        {ha.hotel?.name ?? "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>

        {/* Rate Sheets Tab */}
        <TabsContent value="tariffs" className="mt-4">
          {tariffs.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-sm text-muted-foreground">
                No rate sheets for this tour operator
              </CardContent>
            </Card>
          ) : (
            <div className="overflow-hidden rounded border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-3 py-1.5 text-left text-xs font-medium">
                      Name
                    </th>
                    <th className="px-3 py-1.5 text-left text-xs font-medium">
                      Contract
                    </th>
                    <th className="px-3 py-1.5 text-left text-xs font-medium">
                      Currency
                    </th>
                    <th className="px-3 py-1.5 text-left text-xs font-medium">
                      Generated
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {tariffs.map((t) => (
                    <tr
                      key={t.id}
                      className="border-b last:border-0 hover:bg-muted/30"
                    >
                      <td className="px-3 py-1.5 font-medium text-sm">
                        {t.name}
                      </td>
                      <td className="px-3 py-1.5">
                        {t.contract ? (
                          <Link
                            href={`/contracting/contracts/${t.contract.id}`}
                            className="text-primary hover:underline"
                          >
                            {t.contract.code} — {t.contract.name}
                          </Link>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-3 py-1.5">
                        <span className="font-mono text-xs">{t.currencyCode}</span>
                      </td>
                      <td className="px-3 py-1.5 text-muted-foreground">
                        {t.generatedAt
                          ? format(new Date(t.generatedAt), "dd MMM yyyy")
                          : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
