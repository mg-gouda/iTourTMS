"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import type { z } from "zod";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { STAR_RATING_LABELS } from "@/lib/constants/contracting";
import { trpc } from "@/lib/trpc";
import { destinationUpdateSchema } from "@/lib/validations/contracting";

type FormValues = z.input<typeof destinationUpdateSchema>;

export default function DestinationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const utils = trpc.useUtils();
  const [editing, setEditing] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const { data, isLoading } = trpc.contracting.destination.getById.useQuery({ id });
  const { data: countries } = trpc.setup.getCountries.useQuery();

  const form = useForm<FormValues>({
    resolver: zodResolver(destinationUpdateSchema),
  });

  useEffect(() => {
    if (data) {
      form.reset({
        name: data.name,
        code: data.code,
        countryId: data.countryId,
        active: data.active,
      });
    }
  }, [data, form]);

  const updateMutation = trpc.contracting.destination.update.useMutation({
    onSuccess: () => {
      utils.contracting.destination.getById.invalidate({ id });
      utils.contracting.destination.list.invalidate();
      setEditing(false);
    },
  });

  const deleteMutation = trpc.contracting.destination.delete.useMutation({
    onSuccess: () => {
      utils.contracting.destination.list.invalidate();
      router.push("/contracting/destinations");
    },
  });

  if (isLoading) {
    return (
      <div className="py-10 text-center text-muted-foreground">Loading...</div>
    );
  }

  if (!data) {
    return (
      <div className="py-10 text-center text-muted-foreground">
        Destination not found
      </div>
    );
  }

  function onSubmit(values: FormValues) {
    updateMutation.mutate({ id, data: values });
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{data.name}</h1>
          <p className="text-muted-foreground">
            <span className="font-mono">{data.code}</span> —{" "}
            {data.country?.name}
          </p>
        </div>
        <div className="flex gap-2">
          <Badge variant={data.active ? "default" : "secondary"}>
            {data.active ? "Active" : "Inactive"}
          </Badge>
          {!editing && (
            <>
              <Button variant="outline" onClick={() => setEditing(true)}>
                Edit
              </Button>
              <Button
                variant="destructive"
                onClick={() => setDeleteOpen(true)}
              >
                Delete
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Edit Form */}
      {editing ? (
        <Card>
          <CardHeader>
            <CardTitle>Edit Destination</CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-4"
              >
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

                <FormField
                  control={form.control}
                  name="countryId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Country</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value ?? ""}
                      >
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select country" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {(countries ?? []).map((c) => (
                            <SelectItem key={c.id} value={c.id}>
                              {c.name}
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

                <div className="flex gap-2">
                  <Button type="submit" disabled={updateMutation.isPending}>
                    {updateMutation.isPending ? "Saving..." : "Save"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setEditing(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      ) : (
        /* Read-only details */
        <Card>
          <CardHeader>
            <CardTitle>Details</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <dt className="text-muted-foreground">Name</dt>
                <dd className="font-medium">{data.name}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Code</dt>
                <dd className="font-mono">{data.code}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Country</dt>
                <dd>{data.country?.name ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Hotels</dt>
                <dd>{data.hotels?.length ?? 0}</dd>
              </div>
            </dl>
          </CardContent>
        </Card>
      )}

      {/* Linked Hotels */}
      {data.hotels && data.hotels.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Hotels in this Destination</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>Star Rating</TableHead>
                  <TableHead>City</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.hotels.map((h) => (
                  <TableRow
                    key={h.id}
                    className="cursor-pointer"
                    onClick={() => router.push(`/contracting/hotels/${h.id}`)}
                  >
                    <TableCell className="font-medium">{h.name}</TableCell>
                    <TableCell className="font-mono">{h.code}</TableCell>
                    <TableCell>
                      {STAR_RATING_LABELS[h.starRating] ?? h.starRating}
                    </TableCell>
                    <TableCell>{h.city}</TableCell>
                    <TableCell>
                      <Badge
                        variant={h.active ? "default" : "secondary"}
                      >
                        {h.active ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Delete Dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Destination</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;{data.name}&quot;? This
              action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {deleteMutation.error && (
            <p className="text-sm text-destructive">
              {deleteMutation.error.message}
            </p>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={deleteMutation.isPending}
              onClick={() => deleteMutation.mutate({ id })}
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
