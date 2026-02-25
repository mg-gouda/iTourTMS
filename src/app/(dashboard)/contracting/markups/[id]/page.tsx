"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Trash2 } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import type { z } from "zod";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Form,
  FormControl,
  FormDescription,
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
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { markupRuleUpdateSchema } from "@/lib/validations/contracting";

type FormValues = z.input<typeof markupRuleUpdateSchema>;

export default function MarkupRuleDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const utils = trpc.useUtils();
  const [deleteOpen, setDeleteOpen] = useState(false);

  const { data, isLoading } = trpc.contracting.markupRule.getById.useQuery(
    { id },
    { enabled: !!id },
  );

  const { data: contracts } = trpc.contracting.contract.list.useQuery();
  const { data: hotels } = trpc.contracting.hotel.list.useQuery();
  const { data: destinations } = trpc.contracting.destination.list.useQuery();
  const { data: markets } = trpc.contracting.market.list.useQuery();
  const { data: tourOperators } = trpc.contracting.tourOperator.list.useQuery();

  const form = useForm<FormValues>({
    resolver: zodResolver(markupRuleUpdateSchema),
  });

  useEffect(() => {
    if (data) {
      form.reset({
        name: data.name,
        markupType: data.markupType as FormValues["markupType"],
        value: parseFloat(data.value.toString()),
        priority: data.priority,
        active: data.active,
        contractId: data.contractId ?? undefined,
        hotelId: data.hotelId ?? undefined,
        destinationId: data.destinationId ?? undefined,
        marketId: data.marketId ?? undefined,
        tourOperatorId: data.tourOperatorId ?? undefined,
        validFrom: data.validFrom
          ? new Date(data.validFrom).toISOString().slice(0, 10)
          : undefined,
        validTo: data.validTo
          ? new Date(data.validTo).toISOString().slice(0, 10)
          : undefined,
      });
    }
  }, [data, form]);

  const updateMutation = trpc.contracting.markupRule.update.useMutation({
    onSuccess: () => {
      utils.contracting.markupRule.getById.invalidate({ id });
      utils.contracting.markupRule.list.invalidate();
      toast.success("Markup rule updated");
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  const deleteMutation = trpc.contracting.markupRule.delete.useMutation({
    onSuccess: () => {
      utils.contracting.markupRule.list.invalidate();
      toast.success("Markup rule deleted");
      router.push("/contracting/markups");
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  const onSubmit = (values: FormValues) => {
    updateMutation.mutate({ id, data: values });
  };

  if (isLoading) {
    return (
      <div className="space-y-4 animate-fade-in">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/contracting/markups">
              <ArrowLeft className="size-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{data.name}</h1>
            <p className="text-muted-foreground">
              {data.markupType === "PERCENTAGE"
                ? `${parseFloat(data.value.toString())}%`
                : parseFloat(data.value.toString()).toFixed(2)}{" "}
              {data.markupType.replace(/_/g, " ").toLowerCase()}
            </p>
          </div>
        </div>
        <Button
          variant="destructive"
          size="sm"
          onClick={() => setDeleteOpen(true)}
        >
          <Trash2 className="mr-2 size-4" /> Delete
        </Button>
      </div>

      <Tabs defaultValue="info">
        <TabsList>
          <TabsTrigger value="info">Information</TabsTrigger>
          <TabsTrigger value="tariffs">
            Tariffs ({data.tariffs?.length ?? 0})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="info" className="mt-4">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Basic Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Name</FormLabel>
                          <FormControl>
                            <Input {...field} value={field.value ?? ""} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="markupType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Type</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            value={field.value ?? "PERCENTAGE"}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="PERCENTAGE">
                                Percentage (%)
                              </SelectItem>
                              <SelectItem value="FIXED_PER_NIGHT">
                                Fixed per Night
                              </SelectItem>
                              <SelectItem value="FIXED_PER_BOOKING">
                                Fixed per Booking
                              </SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="value"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Value</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="0.01"
                              {...field}
                              value={field.value ?? 0}
                              onChange={(e) =>
                                field.onChange(parseFloat(e.target.value) || 0)
                              }
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="priority"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Priority</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              {...field}
                              value={field.value ?? 0}
                              onChange={(e) =>
                                field.onChange(parseInt(e.target.value) || 0)
                              }
                            />
                          </FormControl>
                          <FormDescription>
                            Higher priority rules are preferred
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="validFrom"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Valid From</FormLabel>
                            <FormControl>
                              <Input
                                type="date"
                                {...field}
                                value={field.value ?? ""}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="validTo"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Valid To</FormLabel>
                            <FormControl>
                              <Input
                                type="date"
                                {...field}
                                value={field.value ?? ""}
                              />
                            </FormControl>
                            <FormMessage />
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
                              checked={field.value ?? true}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <FormLabel className="font-normal">Active</FormLabel>
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Scope Targets</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <FormField
                      control={form.control}
                      name="contractId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Contract</FormLabel>
                          <Select
                            onValueChange={(v) =>
                              field.onChange(v === "__none__" ? undefined : v)
                            }
                            value={field.value ?? "__none__"}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="None" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="__none__">None</SelectItem>
                              {contracts?.map((c) => (
                                <SelectItem key={c.id} value={c.id}>
                                  {c.name} ({c.code})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="hotelId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Hotel</FormLabel>
                          <Select
                            onValueChange={(v) =>
                              field.onChange(v === "__none__" ? undefined : v)
                            }
                            value={field.value ?? "__none__"}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="None" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="__none__">None</SelectItem>
                              {hotels?.map((h) => (
                                <SelectItem key={h.id} value={h.id}>
                                  {h.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="destinationId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Destination</FormLabel>
                          <Select
                            onValueChange={(v) =>
                              field.onChange(v === "__none__" ? undefined : v)
                            }
                            value={field.value ?? "__none__"}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="None" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="__none__">None</SelectItem>
                              {destinations?.map((d) => (
                                <SelectItem key={d.id} value={d.id}>
                                  {d.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="marketId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Market</FormLabel>
                          <Select
                            onValueChange={(v) =>
                              field.onChange(v === "__none__" ? undefined : v)
                            }
                            value={field.value ?? "__none__"}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="None" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="__none__">None</SelectItem>
                              {markets?.map((m) => (
                                <SelectItem key={m.id} value={m.id}>
                                  {m.name} ({m.code})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="tourOperatorId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Tour Operator</FormLabel>
                          <Select
                            onValueChange={(v) =>
                              field.onChange(v === "__none__" ? undefined : v)
                            }
                            value={field.value ?? "__none__"}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="None" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="__none__">None</SelectItem>
                              {tourOperators?.map((to) => (
                                <SelectItem key={to.id} value={to.id}>
                                  {to.name} ({to.code})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>
              </div>

              <Button type="submit" disabled={updateMutation.isPending}>
                {updateMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </form>
          </Form>
        </TabsContent>

        <TabsContent value="tariffs" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Generated Tariffs</CardTitle>
            </CardHeader>
            <CardContent>
              {data.tariffs && data.tariffs.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Contract</TableHead>
                      <TableHead>Tour Operator</TableHead>
                      <TableHead>Currency</TableHead>
                      <TableHead>Generated</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.tariffs.map((t) => (
                      <TableRow
                        key={t.id}
                        className="cursor-pointer"
                        onClick={() =>
                          router.push(`/contracting/tariffs/${t.id}`)
                        }
                      >
                        <TableCell className="font-medium">{t.name}</TableCell>
                        <TableCell>{t.contract.name}</TableCell>
                        <TableCell>{t.tourOperator.name}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{t.currencyCode}</Badge>
                        </TableCell>
                        <TableCell>
                          {new Date(t.generatedAt).toLocaleDateString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No tariffs have been generated with this rule yet.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Markup Rule</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;{data.name}&quot;? This
              action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteMutation.mutate({ id })}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
