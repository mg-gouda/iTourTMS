"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { repCreateSchema } from "@/lib/validations/traffic";

type FormValues = z.input<typeof repCreateSchema>;

export default function NewRepPage() {
  const router = useRouter();
  const utils = trpc.useUtils();
  const form = useForm<FormValues>({ resolver: zodResolver(repCreateSchema), defaultValues: { isActive: true } });

  const { data: users } = trpc.traffic.driver.listCompanyUsers.useQuery();
  const createMutation = trpc.traffic.rep.create.useMutation({
    onSuccess: (data) => { toast.success("Rep created"); utils.traffic.rep.invalidate(); router.push(`/traffic/reps/${data.id}`); },
    onError: (err) => toast.error(err.message),
  });

  return (
    <div className="animate-fade-in space-y-6">
      <div className="page-header"><h1 className="text-2xl font-bold">New Representative</h1></div>
      <Form {...form}>
        <form onSubmit={form.handleSubmit((v) => createMutation.mutate(v))} className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Rep Details</CardTitle></CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <FormField control={form.control} name="userId" render={({ field }) => (
                <FormItem>
                  <FormLabel>User Account</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Select user" /></SelectTrigger></FormControl>
                    <SelectContent>{users?.map((u) => <SelectItem key={u.id} value={u.id}>{u.name ?? u.email}</SelectItem>)}</SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="phone" render={({ field }) => (
                <FormItem><FormLabel>Phone</FormLabel><FormControl><Input {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>
              )} />
            </CardContent>
          </Card>
          <div className="flex gap-3">
            <Button type="submit" disabled={createMutation.isPending}>{createMutation.isPending ? "Creating..." : "Create Rep"}</Button>
            <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
