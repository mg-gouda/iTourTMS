"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import type { z } from "zod";

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
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { markupRuleCreateSchema } from "@/lib/validations/contracting";

type FormValues = z.input<typeof markupRuleCreateSchema>;

export default function NewMarkupRulePage() {
  const router = useRouter();
  const utils = trpc.useUtils();

  const form = useForm<FormValues>({
    resolver: zodResolver(markupRuleCreateSchema),
    defaultValues: {
      name: "",
      markupType: "PERCENTAGE",
      value: 0,
      priority: 0,
      active: true,
    },
  });

  const createMutation = trpc.contracting.markupRule.create.useMutation({
    onSuccess: () => {
      utils.contracting.markupRule.list.invalidate();
      toast.success("Markup rule created");
      router.push("/contracting/markups");
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  // Scope dropdowns
  const { data: contracts } = trpc.contracting.contract.list.useQuery();
  const { data: hotels } = trpc.contracting.hotel.list.useQuery();
  const { data: destinations } = trpc.contracting.destination.list.useQuery();
  const { data: markets } = trpc.contracting.market.list.useQuery();
  const { data: tourOperators } = trpc.contracting.tourOperator.list.useQuery();

  const onSubmit = (values: FormValues) => {
    createMutation.mutate(values);
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/contracting/markups">
            <ArrowLeft className="size-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">New Markup Rule</h1>
          <p className="text-muted-foreground">
            Create a new markup rule for tariff generation
          </p>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Basic Info */}
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
                      <FormLabel>Name *</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Europe 10% markup" {...field} />
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
                      <FormLabel>Type *</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="PERCENTAGE">Percentage (%)</SelectItem>
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
                      <FormLabel>Value *</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          {...field}
                          onChange={(e) =>
                            field.onChange(parseFloat(e.target.value) || 0)
                          }
                        />
                      </FormControl>
                      <FormDescription>
                        {form.watch("markupType") === "PERCENTAGE"
                          ? "Percentage to add (e.g. 10 = +10%)"
                          : "Fixed amount to add"}
                      </FormDescription>
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
                          <Input type="date" {...field} value={field.value ?? ""} />
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
                          <Input type="date" {...field} value={field.value ?? ""} />
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
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <FormLabel className="font-normal">Active</FormLabel>
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Scope */}
            <Card>
              <CardHeader>
                <CardTitle>Scope Targets</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Select &quot;All&quot; to apply globally. More specific scopes take priority.
                </p>

                <FormField
                  control={form.control}
                  name="contractId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contract</FormLabel>
                      <Select
                        onValueChange={(v) => field.onChange(v === "__none__" ? undefined : v)}
                        value={field.value ?? "__none__"}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="All" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="__none__">All</SelectItem>
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
                        onValueChange={(v) => field.onChange(v === "__none__" ? undefined : v)}
                        value={field.value ?? "__none__"}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="All" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="__none__">All</SelectItem>
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
                        onValueChange={(v) => field.onChange(v === "__none__" ? undefined : v)}
                        value={field.value ?? "__none__"}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="All" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="__none__">All</SelectItem>
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
                        onValueChange={(v) => field.onChange(v === "__none__" ? undefined : v)}
                        value={field.value ?? "__none__"}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="All" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="__none__">All</SelectItem>
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
                        onValueChange={(v) => field.onChange(v === "__none__" ? undefined : v)}
                        value={field.value ?? "__none__"}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="All" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="__none__">All</SelectItem>
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

          <div className="flex gap-3">
            <Button
              type="submit"
              disabled={createMutation.isPending}
            >
              {createMutation.isPending ? "Creating..." : "Create Markup Rule"}
            </Button>
            <Button type="button" variant="outline" asChild>
              <Link href="/contracting/markups">Cancel</Link>
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
