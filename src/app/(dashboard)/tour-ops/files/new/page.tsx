"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { z } from "zod";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { OPS_CLIENT_TYPE_LABELS } from "@/lib/constants/tour-ops";
import { opsFileCreateSchema } from "@/lib/validations/tour-ops";
import { trpc } from "@/lib/trpc";
import { PermissionGuard } from "@/components/shared/permission-guard";

type FormValues = z.input<typeof opsFileCreateSchema>;

export default function NewOpsFilePage() {
  const router = useRouter();

  const createFile = trpc.tourOps.file.create.useMutation({
    onSuccess: (data) => {
      toast.success(`File ${data.code} created`);
      router.push(`/tour-ops/files/${data.id}`);
    },
    onError: (err) => toast.error(err.message),
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(opsFileCreateSchema),
    defaultValues: {
      clientType: "B2C",
      tourOperatorId: "",
      guestName: "",
      guestEmail: "",
      guestPhone: "",
      adults: 1,
      children: 0,
      infants: 0,
      travelFrom: "",
      travelTo: "",
      notes: "",
    },
  });

  const clientType = form.watch("clientType");

  const isToOrTa = clientType === "TOUR_OPERATOR" || clientType === "TRAVEL_AGENT";
  const partnerType = clientType === "TOUR_OPERATOR" ? "tour_operator" : "travel_agent";

  const { data: partners, isLoading: partnersLoading } = trpc.tourOps.lookup.tourOperators.useQuery(
    { partnerType },
    { enabled: isToOrTa }
  );

  const selectedPartner = partners?.find((p) => p.id === form.watch("tourOperatorId"));

  return (

    <PermissionGuard permission="tour-ops:file:read">
      <div className="mx-auto max-w-2xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold">New File</h1>
        <p className="text-sm text-muted-foreground">Open a new tour operations file</p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit((v) => createFile.mutate(v))} className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Client Details</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="clientType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Client Type</FormLabel>
                    <Select
                      value={field.value}
                      onValueChange={(v) => {
                        field.onChange(v);
                        form.setValue("tourOperatorId", "");
                      }}
                    >
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        {(["B2C", "TOUR_OPERATOR", "TRAVEL_AGENT"] as const).map((t) => (
                          <SelectItem key={t} value={t}>{OPS_CLIENT_TYPE_LABELS[t]}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Tour Operator / Travel Agent picker */}
              {isToOrTa && (
                <FormField
                  control={form.control}
                  name="tourOperatorId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {clientType === "TOUR_OPERATOR" ? "Tour Operator" : "Travel Agent"}
                        <span className="ml-1 text-destructive">*</span>
                      </FormLabel>
                      {partnersLoading ? (
                        <Skeleton className="h-9 w-full" />
                      ) : !partners?.length ? (
                        <p className="text-sm text-muted-foreground">
                          No {clientType === "TOUR_OPERATOR" ? "tour operators" : "travel agents"} found.
                        </p>
                      ) : (
                        <Select value={field.value ?? ""} onValueChange={field.onChange}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder={`Select ${clientType === "TOUR_OPERATOR" ? "tour operator" : "travel agent"}…`} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {partners.map((p) => (
                              <SelectItem key={p.id} value={p.id}>
                                <span>{p.name}</span>
                                <span className="ml-2 text-xs text-muted-foreground font-mono">{p.code}</span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {/* Credit info banner when TO/TA selected */}
              {isToOrTa && selectedPartner && (
                <div className="flex items-center gap-3 rounded-md border bg-muted/30 px-3 py-2 text-xs">
                  <span className="text-muted-foreground">Credit limit:</span>
                  <span className="font-medium">{Number(selectedPartner.creditLimit).toLocaleString()}</span>
                  <span className="text-muted-foreground ml-2">Used:</span>
                  <span className="font-medium">{Number(selectedPartner.creditUsed).toLocaleString()}</span>
                  <span className="text-muted-foreground ml-2">Available:</span>
                  <Badge
                    variant={Number(selectedPartner.creditLimit) - Number(selectedPartner.creditUsed) > 0 ? "secondary" : "destructive"}
                    className="text-xs"
                  >
                    {(Number(selectedPartner.creditLimit) - Number(selectedPartner.creditUsed)).toLocaleString()}
                  </Badge>
                </div>
              )}

              <FormField
                control={form.control}
                name="guestName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{isToOrTa ? "Reference / Group Name" : "Guest Name"}</FormLabel>
                    <FormControl><Input {...field} placeholder={isToOrTa ? "e.g. GRP-2025-CAIRO-001" : "e.g. John Smith"} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="guestEmail"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl><Input {...field} type="email" placeholder="Optional" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="guestPhone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone</FormLabel>
                      <FormControl><Input {...field} placeholder="Optional" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Travel Details</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="travelFrom"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Travel From</FormLabel>
                      <FormControl><Input {...field} type="date" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="travelTo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Travel To</FormLabel>
                      <FormControl><Input {...field} type="date" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid grid-cols-3 gap-4">
                {(["adults", "children", "infants"] as const).map((f) => (
                  <FormField
                    key={f}
                    control={form.control}
                    name={f}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="capitalize">{f}</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min={f === "adults" ? 1 : 0}
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value, 10))}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                ))}
              </div>
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes</FormLabel>
                    <FormControl><Textarea {...field} rows={3} placeholder="Internal notes..." /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
            <Button type="submit" disabled={createFile.isPending}>
              {createFile.isPending ? "Creating..." : "Create File"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  

    </PermissionGuard>

  );
}
