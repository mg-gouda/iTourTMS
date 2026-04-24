"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { programPlanCreateSchema } from "@/lib/validations/crm";
import { trpc } from "@/lib/trpc";

type FormValues = z.input<typeof programPlanCreateSchema>;

export default function NewExcProgramPage() {
  const router = useRouter();
  const utils = trpc.useUtils();
  const { data: markets } = trpc.crm.programPlan.listMarkets.useQuery();

  const form = useForm<FormValues>({
    resolver: zodResolver(programPlanCreateSchema),
    defaultValues: { name: "", description: "", marketId: "", active: true },
  });

  const createMutation = trpc.crm.programPlan.create.useMutation({
    onSuccess: (plan) => {
      utils.crm.programPlan.list.invalidate();
      toast.success("Program created");
      router.push(`/crm/exc-programs/${plan.id}`);
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/crm/exc-programs"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">New Excursion Program</h1>
          <p className="text-sm text-muted-foreground">Define a scheduled program with its excursions and operating rules</p>
        </div>
      </div>

      <Card className="max-w-xl">
        <CardHeader>
          <CardTitle className="text-base">Program Details</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit((v) => createMutation.mutate(v))} className="space-y-4">
              <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem>
                  <FormLabel>Program Name</FormLabel>
                  <FormControl><Input placeholder="e.g. Summer Hurghada Package" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="description" render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl><Textarea rows={3} placeholder="Optional description..." {...field} /></FormControl>
                </FormItem>
              )} />

              <FormField control={form.control} name="marketId" render={({ field }) => (
                <FormItem>
                  <FormLabel>Market</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value ?? ""}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="All markets" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="">All markets</SelectItem>
                      {markets?.map((m) => (
                        <SelectItem key={m.id} value={m.id}>{m.name} ({m.code})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormItem>
              )} />

              <FormField control={form.control} name="active" render={({ field }) => (
                <FormItem className="flex items-center gap-2 space-y-0">
                  <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                  <FormLabel>Active</FormLabel>
                </FormItem>
              )} />

              {createMutation.error && (
                <p className="text-sm text-destructive">{createMutation.error.message}</p>
              )}

              <div className="flex gap-2">
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending ? "Creating…" : "Create & Add Excursions"}
                </Button>
                <Button variant="ghost" type="button" asChild>
                  <Link href="/crm/exc-programs">Cancel</Link>
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
