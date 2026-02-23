"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
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
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  CHILD_AGE_CATEGORY_LABELS,
  CHILD_BEDDING_LABELS,
  CONTRACT_STATUS_LABELS,
  CONTRACT_STATUS_VARIANTS,
  OCCUPANCY_SUPPLEMENT_LABELS,
  RATE_BASIS_LABELS,
  SUPPLEMENT_VALUE_TYPE_LABELS,
} from "@/lib/constants/contracting";
import { trpc } from "@/lib/trpc";
import {
  contractSeasonCreateSchema,
  contractSeasonUpdateSchema,
} from "@/lib/validations/contracting";

type SeasonFormValues = z.input<typeof contractSeasonCreateSchema>;

type SeasonData = {
  id: string;
  name: string;
  code: string;
  dateFrom: string | Date;
  dateTo: string | Date;
  sortOrder: number;
  releaseDays: number;
  minimumStay: number | null;
};

type ContractRoomTypeData = {
  id: string;
  roomTypeId: string;
  isBase: boolean;
  roomType: { id: string; name: string; code: string; maxAdults: number; maxChildren: number };
};

type ContractMealBasisData = {
  id: string;
  mealBasisId: string;
  isBase: boolean;
  mealBasis: { id: string; name: string; mealCode: string };
};

type BaseRateData = {
  id: string;
  seasonId: string;
  rate: string | number;
  singleRate: string | number | null;
  doubleRate: string | number | null;
  tripleRate: string | number | null;
  season: { id: string; name: string; code: string };
};

type SupplementData = {
  id: string;
  contractId: string;
  seasonId: string;
  supplementType: string;
  roomTypeId: string | null;
  mealBasisId: string | null;
  forAdults: number | null;
  forChildCategory: string | null;
  forChildBedding: string | null;
  valueType: string;
  value: string | number;
  isReduction: boolean;
  perPerson: boolean;
  perNight: boolean;
  label: string | null;
  notes: string | null;
  sortOrder: number;
  season: { id: string; name: string; code: string };
  roomType: { id: string; name: string; code: string } | null;
  mealBasis: { id: string; name: string; mealCode: string } | null;
};

type ContractData = {
  id: string;
  name: string;
  code: string;
  status: string;
  hotelId: string;
  validFrom: string | Date;
  validTo: string | Date;
  rateBasis: string;
  minimumStay: number;
  maximumStay: number | null;
  terms: string | null;
  internalNotes: string | null;
  hotelNotes: string | null;
  createdAt: string | Date;
  hotel: { id: string; name: string; code: string };
  baseCurrency: { id: string; code: string; name: string };
  baseRoomType: { id: string; name: string; code: string };
  baseMealBasis: { id: string; name: string; mealCode: string };
  createdBy: { id: string; name: string | null } | null;
  postedBy: { id: string; name: string | null } | null;
  postedAt: string | Date | null;
  publishedBy: { id: string; name: string | null } | null;
  publishedAt: string | Date | null;
  seasons: SeasonData[];
  roomTypes: ContractRoomTypeData[];
  mealBases: ContractMealBasisData[];
  baseRates: BaseRateData[];
  supplements: SupplementData[];
};

export default function ContractDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const utils = trpc.useUtils();

  const { data: rawContract, isLoading } =
    trpc.contracting.contract.getById.useQuery({ id });
  const contract = rawContract as ContractData | undefined;

  const postMutation = trpc.contracting.contract.post.useMutation({
    onSuccess: () => utils.contracting.contract.getById.invalidate({ id }),
  });
  const publishMutation = trpc.contracting.contract.publish.useMutation({
    onSuccess: () => utils.contracting.contract.getById.invalidate({ id }),
  });
  const resetMutation = trpc.contracting.contract.resetToDraft.useMutation({
    onSuccess: () => utils.contracting.contract.getById.invalidate({ id }),
  });
  const deleteMutation = trpc.contracting.contract.delete.useMutation({
    onSuccess: () => {
      utils.contracting.contract.list.invalidate();
      router.push("/contracting/contracts");
    },
  });

  const [showDelete, setShowDelete] = useState(false);

  if (isLoading) {
    return (
      <div className="py-10 text-center text-muted-foreground">Loading...</div>
    );
  }

  if (!contract) return null;

  const isDraft = contract.status === "DRAFT";
  const isPosted = contract.status === "POSTED";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight">
              {contract.name}
            </h1>
            <Badge
              variant={
                (CONTRACT_STATUS_VARIANTS[contract.status] as
                  | "default"
                  | "secondary"
                  | "outline"
                  | "destructive") ?? "secondary"
              }
            >
              {CONTRACT_STATUS_LABELS[contract.status] ?? contract.status}
            </Badge>
          </div>
          <p className="text-muted-foreground">
            {contract.hotel.name} &middot; {contract.code}
          </p>
        </div>
        <div className="flex gap-2">
          {isDraft && (
            <>
              <Button
                variant="outline"
                onClick={() => postMutation.mutate({ id })}
                disabled={postMutation.isPending}
              >
                {postMutation.isPending ? "Posting..." : "Post"}
              </Button>
              <Button
                variant="destructive"
                onClick={() => setShowDelete(true)}
              >
                Delete
              </Button>
            </>
          )}
          {isPosted && (
            <>
              <Button
                onClick={() => publishMutation.mutate({ id })}
                disabled={publishMutation.isPending}
              >
                {publishMutation.isPending ? "Publishing..." : "Publish"}
              </Button>
              <Button
                variant="outline"
                onClick={() => resetMutation.mutate({ id })}
                disabled={resetMutation.isPending}
              >
                Reset to Draft
              </Button>
            </>
          )}
          {contract.status === "PUBLISHED" && (
            <Button
              variant="outline"
              onClick={() => resetMutation.mutate({ id })}
              disabled={resetMutation.isPending}
            >
              Reset to Draft
            </Button>
          )}
        </div>
      </div>

      {(postMutation.error || publishMutation.error || resetMutation.error) && (
        <p className="text-sm text-destructive">
          {postMutation.error?.message ??
            publishMutation.error?.message ??
            resetMutation.error?.message}
        </p>
      )}

      {/* Tabs */}
      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="seasons">
            Seasons ({contract.seasons.length})
          </TabsTrigger>
          <TabsTrigger value="roomTypes">
            Room Types ({contract.roomTypes.length})
          </TabsTrigger>
          <TabsTrigger value="mealBasis">
            Meal Basis ({contract.mealBases.length})
          </TabsTrigger>
          <TabsTrigger value="baseRates">Base Rates</TabsTrigger>
          <TabsTrigger value="supplements">Supplements</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <OverviewTab contract={contract} />
        </TabsContent>
        <TabsContent value="seasons">
          <SeasonsTab contractId={id} contract={contract} />
        </TabsContent>
        <TabsContent value="roomTypes">
          <RoomTypesTab contractId={id} contract={contract} />
        </TabsContent>
        <TabsContent value="mealBasis">
          <MealBasisTab contractId={id} contract={contract} />
        </TabsContent>
        <TabsContent value="baseRates">
          <BaseRatesTab contractId={id} contract={contract} />
        </TabsContent>
        <TabsContent value="supplements">
          <SupplementsTab contractId={id} contract={contract} />
        </TabsContent>
      </Tabs>

      {/* Delete Dialog */}
      <Dialog open={showDelete} onOpenChange={setShowDelete}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Contract</DialogTitle>
            <DialogDescription>
              This will permanently delete &quot;{contract.name}&quot; and all
              its seasons, assignments, and rates. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDelete(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteMutation.mutate({ id })}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Overview Tab ──────────────────────────────────────────

function OverviewTab({ contract }: { contract: ContractData }) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Contract Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Name</span>
            <span className="font-medium">{contract.name}</span>
          </div>
          <Separator />
          <div className="flex justify-between">
            <span className="text-muted-foreground">Code</span>
            <span className="font-mono">{contract.code}</span>
          </div>
          <Separator />
          <div className="flex justify-between">
            <span className="text-muted-foreground">Rate Basis</span>
            <span>{RATE_BASIS_LABELS[contract.rateBasis] ?? contract.rateBasis}</span>
          </div>
          <Separator />
          <div className="flex justify-between">
            <span className="text-muted-foreground">Min Stay</span>
            <span>{contract.minimumStay} night(s)</span>
          </div>
          {contract.maximumStay && (
            <>
              <Separator />
              <div className="flex justify-between">
                <span className="text-muted-foreground">Max Stay</span>
                <span>{contract.maximumStay} night(s)</span>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Dates & Hotel</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Hotel</span>
            <span className="font-medium">{contract.hotel.name}</span>
          </div>
          <Separator />
          <div className="flex justify-between">
            <span className="text-muted-foreground">Valid From</span>
            <span>{format(new Date(contract.validFrom), "dd MMM yyyy")}</span>
          </div>
          <Separator />
          <div className="flex justify-between">
            <span className="text-muted-foreground">Valid To</span>
            <span>{format(new Date(contract.validTo), "dd MMM yyyy")}</span>
          </div>
          <Separator />
          <div className="flex justify-between">
            <span className="text-muted-foreground">Currency</span>
            <span>{contract.baseCurrency.code} — {contract.baseCurrency.name}</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Base Assignments</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Base Room Type</span>
            <span className="font-medium">
              {contract.baseRoomType.name} ({contract.baseRoomType.code})
            </span>
          </div>
          <Separator />
          <div className="flex justify-between">
            <span className="text-muted-foreground">Base Meal Basis</span>
            <span className="font-medium">{contract.baseMealBasis.name}</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Workflow</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Created By</span>
            <span>{contract.createdBy?.name ?? "—"}</span>
          </div>
          <Separator />
          <div className="flex justify-between">
            <span className="text-muted-foreground">Created At</span>
            <span>{format(new Date(contract.createdAt), "dd MMM yyyy HH:mm")}</span>
          </div>
          {contract.postedBy && (
            <>
              <Separator />
              <div className="flex justify-between">
                <span className="text-muted-foreground">Posted By</span>
                <span>{contract.postedBy.name}</span>
              </div>
              <Separator />
              <div className="flex justify-between">
                <span className="text-muted-foreground">Posted At</span>
                <span>
                  {contract.postedAt
                    ? format(new Date(contract.postedAt), "dd MMM yyyy HH:mm")
                    : "—"}
                </span>
              </div>
            </>
          )}
          {contract.publishedBy && (
            <>
              <Separator />
              <div className="flex justify-between">
                <span className="text-muted-foreground">Published By</span>
                <span>{contract.publishedBy.name}</span>
              </div>
              <Separator />
              <div className="flex justify-between">
                <span className="text-muted-foreground">Published At</span>
                <span>
                  {contract.publishedAt
                    ? format(
                        new Date(contract.publishedAt),
                        "dd MMM yyyy HH:mm",
                      )
                    : "—"}
                </span>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {(contract.terms || contract.internalNotes || contract.hotelNotes) && (
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Notes & Terms</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            {contract.terms && (
              <div>
                <p className="mb-1 font-medium text-muted-foreground">
                  Terms & Conditions
                </p>
                <p className="whitespace-pre-wrap">{contract.terms}</p>
              </div>
            )}
            {contract.internalNotes && (
              <div>
                <p className="mb-1 font-medium text-muted-foreground">
                  Internal Notes
                </p>
                <p className="whitespace-pre-wrap">{contract.internalNotes}</p>
              </div>
            )}
            {contract.hotelNotes && (
              <div>
                <p className="mb-1 font-medium text-muted-foreground">
                  Hotel Notes
                </p>
                <p className="whitespace-pre-wrap">{contract.hotelNotes}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ─── Seasons Tab ──────────────────────────────────────────

function SeasonsTab({
  contractId,
  contract,
}: {
  contractId: string;
  contract: ContractData;
}) {
  const utils = trpc.useUtils();
  const [showDialog, setShowDialog] = useState(false);
  const [editingSeason, setEditingSeason] = useState<ContractData["seasons"][number] | null>(null);

  const createMutation = trpc.contracting.contractSeason.create.useMutation({
    onSuccess: () => {
      utils.contracting.contract.getById.invalidate({ id: contractId });
      setShowDialog(false);
    },
  });

  const updateMutation = trpc.contracting.contractSeason.update.useMutation({
    onSuccess: () => {
      utils.contracting.contract.getById.invalidate({ id: contractId });
      setShowDialog(false);
      setEditingSeason(null);
    },
  });

  const deleteMutation = trpc.contracting.contractSeason.delete.useMutation({
    onSuccess: () => {
      utils.contracting.contract.getById.invalidate({ id: contractId });
    },
  });

  const form = useForm<SeasonFormValues>({
    resolver: zodResolver(contractSeasonCreateSchema),
    defaultValues: {
      contractId,
      name: "",
      code: "",
      dateFrom: "",
      dateTo: "",
      sortOrder: 0,
      releaseDays: 21,
      minimumStay: null,
    },
  });

  useEffect(() => {
    if (editingSeason) {
      form.reset({
        contractId,
        name: editingSeason.name,
        code: editingSeason.code,
        dateFrom: format(new Date(editingSeason.dateFrom), "yyyy-MM-dd"),
        dateTo: format(new Date(editingSeason.dateTo), "yyyy-MM-dd"),
        sortOrder: editingSeason.sortOrder,
        releaseDays: editingSeason.releaseDays,
        minimumStay: editingSeason.minimumStay,
      });
      setShowDialog(true);
    }
  }, [editingSeason, contractId, form]);

  function onSubmit(values: SeasonFormValues) {
    if (editingSeason) {
      updateMutation.mutate({
        id: editingSeason.id,
        contractId,
        data: {
          name: values.name,
          code: values.code,
          dateFrom: values.dateFrom,
          dateTo: values.dateTo,
          sortOrder: values.sortOrder,
          releaseDays: values.releaseDays,
          minimumStay: values.minimumStay ?? null,
        },
      });
    } else {
      createMutation.mutate(values);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button
          onClick={() => {
            setEditingSeason(null);
            form.reset({
              contractId,
              name: "",
              code: "",
              dateFrom: "",
              dateTo: "",
              sortOrder: contract.seasons.length,
              releaseDays: 21,
              minimumStay: null,
            });
            setShowDialog(true);
          }}
        >
          Add Season
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Code</TableHead>
            <TableHead>Date From</TableHead>
            <TableHead>Date To</TableHead>
            <TableHead>Release Days</TableHead>
            <TableHead>Min Stay</TableHead>
            <TableHead className="w-[100px]" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {contract.seasons.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center text-muted-foreground">
                No seasons defined yet
              </TableCell>
            </TableRow>
          ) : (
            contract.seasons.map((s) => (
              <TableRow key={s.id}>
                <TableCell className="font-medium">{s.name}</TableCell>
                <TableCell className="font-mono">{s.code}</TableCell>
                <TableCell>
                  {format(new Date(s.dateFrom), "dd MMM yyyy")}
                </TableCell>
                <TableCell>
                  {format(new Date(s.dateTo), "dd MMM yyyy")}
                </TableCell>
                <TableCell>{s.releaseDays}</TableCell>
                <TableCell>{s.minimumStay ?? "—"}</TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditingSeason(s)}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive"
                      onClick={() =>
                        deleteMutation.mutate({
                          id: s.id,
                          contractId,
                        })
                      }
                    >
                      Remove
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      {/* Season Dialog */}
      <Dialog
        open={showDialog}
        onOpenChange={(open) => {
          setShowDialog(open);
          if (!open) setEditingSeason(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingSeason ? "Edit Season" : "Add Season"}
            </DialogTitle>
            <DialogDescription>
              Season dates must be within the contract period (
              {format(new Date(contract.validFrom), "dd MMM yyyy")} —{" "}
              {format(new Date(contract.validTo), "dd MMM yyyy")})
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input placeholder="High Season" {...field} />
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
                        <Input placeholder="HIGH" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="dateFrom"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date From</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="dateTo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date To</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="releaseDays"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Release Days</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={0}
                          {...field}
                          onChange={(e) =>
                            field.onChange(Number(e.target.value) || 0)
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="minimumStay"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Min Stay</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={1}
                          {...field}
                          value={field.value ?? ""}
                          onChange={(e) =>
                            field.onChange(
                              e.target.value ? Number(e.target.value) : null,
                            )
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="sortOrder"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Sort Order</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          {...field}
                          onChange={(e) =>
                            field.onChange(Number(e.target.value) || 0)
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {(createMutation.error || updateMutation.error) && (
                <p className="text-sm text-destructive">
                  {createMutation.error?.message ??
                    updateMutation.error?.message}
                </p>
              )}

              <DialogFooter>
                <Button
                  type="submit"
                  disabled={
                    createMutation.isPending || updateMutation.isPending
                  }
                >
                  {editingSeason ? "Update" : "Add"} Season
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Room Types Tab ───────────────────────────────────────

function RoomTypesTab({
  contractId,
  contract,
}: {
  contractId: string;
  contract: ContractData;
}) {
  const utils = trpc.useUtils();
  const [showAdd, setShowAdd] = useState(false);
  const [selectedRoomTypeId, setSelectedRoomTypeId] = useState("");

  // Get all room types from the hotel
  const { data: hotelDetail } = trpc.contracting.hotel.getById.useQuery({
    id: contract.hotelId,
  });

  const addMutation = trpc.contracting.contractRoomType.add.useMutation({
    onSuccess: () => {
      utils.contracting.contract.getById.invalidate({ id: contractId });
      setShowAdd(false);
      setSelectedRoomTypeId("");
    },
  });

  const removeMutation = trpc.contracting.contractRoomType.remove.useMutation({
    onSuccess: () => {
      utils.contracting.contract.getById.invalidate({ id: contractId });
    },
  });

  // Filter out already-assigned room types
  const assignedIds = new Set(contract.roomTypes.map((rt) => rt.roomTypeId));
  const availableRoomTypes = (hotelDetail?.roomTypes ?? []).filter(
    (rt) => !assignedIds.has(rt.id),
  );

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setShowAdd(true)} disabled={availableRoomTypes.length === 0}>
          Add Room Type
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Room Type</TableHead>
            <TableHead>Code</TableHead>
            <TableHead>Max Adults</TableHead>
            <TableHead>Max Children</TableHead>
            <TableHead>Role</TableHead>
            <TableHead className="w-[80px]" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {contract.roomTypes.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-muted-foreground">
                No room types assigned
              </TableCell>
            </TableRow>
          ) : (
            contract.roomTypes.map((crt) => (
              <TableRow key={crt.id}>
                <TableCell className="font-medium">
                  {crt.roomType.name}
                </TableCell>
                <TableCell className="font-mono">
                  {crt.roomType.code}
                </TableCell>
                <TableCell>{crt.roomType.maxAdults}</TableCell>
                <TableCell>{crt.roomType.maxChildren}</TableCell>
                <TableCell>
                  {crt.isBase && <Badge>Base</Badge>}
                </TableCell>
                <TableCell>
                  {!crt.isBase && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive"
                      onClick={() =>
                        removeMutation.mutate({ id: crt.id, contractId })
                      }
                    >
                      Remove
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      {/* Add Room Type Dialog */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Room Type</DialogTitle>
            <DialogDescription>
              Select a room type from {contract.hotel.name} to assign to this contract.
            </DialogDescription>
          </DialogHeader>
          <Select
            onValueChange={setSelectedRoomTypeId}
            value={selectedRoomTypeId}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select room type" />
            </SelectTrigger>
            <SelectContent>
              {availableRoomTypes.map((rt) => (
                <SelectItem key={rt.id} value={rt.id}>
                  {rt.name} ({rt.code})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {addMutation.error && (
            <p className="text-sm text-destructive">
              {addMutation.error.message}
            </p>
          )}
          <DialogFooter>
            <Button
              disabled={!selectedRoomTypeId || addMutation.isPending}
              onClick={() =>
                addMutation.mutate({
                  contractId,
                  roomTypeId: selectedRoomTypeId,
                  isBase: false,
                  sortOrder: contract.roomTypes.length,
                })
              }
            >
              Add
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Meal Basis Tab ───────────────────────────────────────

function MealBasisTab({
  contractId,
  contract,
}: {
  contractId: string;
  contract: ContractData;
}) {
  const utils = trpc.useUtils();
  const [showAdd, setShowAdd] = useState(false);
  const [selectedMealBasisId, setSelectedMealBasisId] = useState("");

  const { data: hotelDetail } = trpc.contracting.hotel.getById.useQuery({
    id: contract.hotelId,
  });

  const addMutation = trpc.contracting.contractMealBasis.add.useMutation({
    onSuccess: () => {
      utils.contracting.contract.getById.invalidate({ id: contractId });
      setShowAdd(false);
      setSelectedMealBasisId("");
    },
  });

  const removeMutation = trpc.contracting.contractMealBasis.remove.useMutation({
    onSuccess: () => {
      utils.contracting.contract.getById.invalidate({ id: contractId });
    },
  });

  const assignedIds = new Set(contract.mealBases.map((mb) => mb.mealBasisId));
  const availableMealBasis = (hotelDetail?.mealBasis ?? []).filter(
    (mb) => !assignedIds.has(mb.id),
  );

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setShowAdd(true)} disabled={availableMealBasis.length === 0}>
          Add Meal Basis
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Meal Plan</TableHead>
            <TableHead>Code</TableHead>
            <TableHead>Role</TableHead>
            <TableHead className="w-[80px]" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {contract.mealBases.length === 0 ? (
            <TableRow>
              <TableCell colSpan={4} className="text-center text-muted-foreground">
                No meal basis assigned
              </TableCell>
            </TableRow>
          ) : (
            contract.mealBases.map((cmb) => (
              <TableRow key={cmb.id}>
                <TableCell className="font-medium">
                  {cmb.mealBasis.name}
                </TableCell>
                <TableCell className="font-mono">
                  {cmb.mealBasis.mealCode}
                </TableCell>
                <TableCell>
                  {cmb.isBase && <Badge>Base</Badge>}
                </TableCell>
                <TableCell>
                  {!cmb.isBase && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive"
                      onClick={() =>
                        removeMutation.mutate({ id: cmb.id, contractId })
                      }
                    >
                      Remove
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      {/* Add Meal Basis Dialog */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Meal Basis</DialogTitle>
            <DialogDescription>
              Select a meal plan from {contract.hotel.name} to assign to this contract.
            </DialogDescription>
          </DialogHeader>
          <Select
            onValueChange={setSelectedMealBasisId}
            value={selectedMealBasisId}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select meal plan" />
            </SelectTrigger>
            <SelectContent>
              {availableMealBasis.map((mb) => (
                <SelectItem key={mb.id} value={mb.id}>
                  {mb.name} ({mb.mealCode})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {addMutation.error && (
            <p className="text-sm text-destructive">
              {addMutation.error.message}
            </p>
          )}
          <DialogFooter>
            <Button
              disabled={!selectedMealBasisId || addMutation.isPending}
              onClick={() =>
                addMutation.mutate({
                  contractId,
                  mealBasisId: selectedMealBasisId,
                  isBase: false,
                  sortOrder: contract.mealBases.length,
                })
              }
            >
              Add
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Base Rates Tab ───────────────────────────────────────

function BaseRatesTab({
  contractId,
  contract,
}: {
  contractId: string;
  contract: ContractData;
}) {
  const utils = trpc.useUtils();

  // Build rate map: seasonId → rate data
  const rateMap = new Map<
    string,
    { rate: number; singleRate: number | null; doubleRate: number | null; tripleRate: number | null }
  >();
  for (const br of contract.baseRates) {
    rateMap.set(br.seasonId, {
      rate: Number(br.rate),
      singleRate: br.singleRate ? Number(br.singleRate) : null,
      doubleRate: br.doubleRate ? Number(br.doubleRate) : null,
      tripleRate: br.tripleRate ? Number(br.tripleRate) : null,
    });
  }

  const [rates, setRates] = useState<
    Record<string, { rate: string; singleRate: string; doubleRate: string; tripleRate: string }>
  >(() => {
    const initial: Record<string, { rate: string; singleRate: string; doubleRate: string; tripleRate: string }> = {};
    for (const season of contract.seasons) {
      const existing = rateMap.get(season.id);
      initial[season.id] = {
        rate: existing?.rate?.toString() ?? "",
        singleRate: existing?.singleRate?.toString() ?? "",
        doubleRate: existing?.doubleRate?.toString() ?? "",
        tripleRate: existing?.tripleRate?.toString() ?? "",
      };
    }
    return initial;
  });

  const saveMutation = trpc.contracting.contractBaseRate.bulkSave.useMutation({
    onSuccess: () => {
      utils.contracting.contract.getById.invalidate({ id: contractId });
    },
  });

  function handleSave() {
    const rateEntries = contract.seasons
      .filter((s) => rates[s.id]?.rate)
      .map((s) => ({
        seasonId: s.id,
        rate: Number(rates[s.id].rate) || 0,
        singleRate: rates[s.id].singleRate
          ? Number(rates[s.id].singleRate)
          : null,
        doubleRate: rates[s.id].doubleRate
          ? Number(rates[s.id].doubleRate)
          : null,
        tripleRate: rates[s.id].tripleRate
          ? Number(rates[s.id].tripleRate)
          : null,
      }));

    saveMutation.mutate({ contractId, rates: rateEntries });
  }

  function updateRate(
    seasonId: string,
    field: "rate" | "singleRate" | "doubleRate" | "tripleRate",
    value: string,
  ) {
    setRates((prev) => ({
      ...prev,
      [seasonId]: {
        ...prev[seasonId],
        [field]: value,
      },
    }));
  }

  if (contract.seasons.length === 0) {
    return (
      <div className="py-10 text-center text-muted-foreground">
        Add seasons first before entering base rates.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saveMutation.isPending}>
          {saveMutation.isPending ? "Saving..." : "Save All Rates"}
        </Button>
      </div>

      {saveMutation.error && (
        <p className="text-sm text-destructive">
          {saveMutation.error.message}
        </p>
      )}

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Season</TableHead>
            <TableHead>Base Rate</TableHead>
            <TableHead>Single Rate</TableHead>
            <TableHead>Double Rate</TableHead>
            <TableHead>Triple Rate</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {contract.seasons.map((s) => (
            <TableRow key={s.id}>
              <TableCell className="font-medium">
                {s.name}
                <span className="ml-2 text-xs text-muted-foreground">
                  ({format(new Date(s.dateFrom), "dd MMM")} —{" "}
                  {format(new Date(s.dateTo), "dd MMM")})
                </span>
              </TableCell>
              <TableCell>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  className="w-28"
                  value={rates[s.id]?.rate ?? ""}
                  onChange={(e) => updateRate(s.id, "rate", e.target.value)}
                />
              </TableCell>
              <TableCell>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  className="w-28"
                  value={rates[s.id]?.singleRate ?? ""}
                  onChange={(e) =>
                    updateRate(s.id, "singleRate", e.target.value)
                  }
                />
              </TableCell>
              <TableCell>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  className="w-28"
                  value={rates[s.id]?.doubleRate ?? ""}
                  onChange={(e) =>
                    updateRate(s.id, "doubleRate", e.target.value)
                  }
                />
              </TableCell>
              <TableCell>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  className="w-28"
                  value={rates[s.id]?.tripleRate ?? ""}
                  onChange={(e) =>
                    updateRate(s.id, "tripleRate", e.target.value)
                  }
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

// ─── Supplements Tab ─────────────────────────────────────

type CellValue = { value: string; valueType: string };
type GridState = Record<string, CellValue>; // key = "rowId:seasonId"

function cellKey(rowId: string, seasonId: string) {
  return `${rowId}:${seasonId}`;
}

function SupplementsTab({
  contractId,
  contract,
}: {
  contractId: string;
  contract: ContractData;
}) {
  const utils = trpc.useUtils();
  const seasons = contract.seasons;

  // Fetch hotel detail for child policies
  const { data: hotelDetail } = trpc.contracting.hotel.getById.useQuery({
    id: contract.hotelId,
  });

  // Non-base room types & meal bases
  const nonBaseRoomTypes = contract.roomTypes.filter((rt) => !rt.isBase);
  const nonBaseMealBases = contract.mealBases.filter((mb) => !mb.isBase);

  // Child policies
  const childPolicies: { category: string; bedding: string; label: string }[] = [];
  for (const cp of hotelDetail?.childrenPolicies ?? []) {
    const cat = cp.category as string;
    const catLabel = CHILD_AGE_CATEGORY_LABELS[cat] ?? cat;
    if (cp.freeInSharing) {
      childPolicies.push({
        category: cat,
        bedding: "SHARING_WITH_PARENTS",
        label: `${catLabel} — Sharing`,
      });
    }
    if (cp.extraBedAllowed) {
      childPolicies.push({
        category: cat,
        bedding: "EXTRA_BED",
        label: `${catLabel} — Extra Bed`,
      });
    }
  }

  // Group existing supplements by type
  const byType: Record<string, SupplementData[]> = {};
  for (const s of contract.supplements) {
    if (!byType[s.supplementType]) byType[s.supplementType] = [];
    byType[s.supplementType].push(s);
  }

  if (seasons.length === 0) {
    return (
      <div className="py-10 text-center text-muted-foreground">
        Add seasons first before configuring supplements.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Room Type Supplements */}
      <RoomTypeSupplementGrid
        contractId={contractId}
        seasons={seasons}
        roomTypes={nonBaseRoomTypes}
        existing={byType["ROOM_TYPE"] ?? []}
        utils={utils}
      />

      {/* Meal Supplements */}
      <MealSupplementGrid
        contractId={contractId}
        seasons={seasons}
        mealBases={nonBaseMealBases}
        existing={byType["MEAL"] ?? []}
        utils={utils}
      />

      {/* Occupancy Supplements */}
      <OccupancySupplementGrid
        contractId={contractId}
        seasons={seasons}
        existing={byType["OCCUPANCY"] ?? []}
        utils={utils}
      />

      {/* Child Supplements */}
      <ChildSupplementGrid
        contractId={contractId}
        seasons={seasons}
        childPolicies={childPolicies}
        existing={byType["CHILD"] ?? []}
        utils={utils}
      />

      {/* Extra Bed Supplements */}
      <ExtraBedSupplementGrid
        contractId={contractId}
        seasons={seasons}
        existing={byType["EXTRA_BED"] ?? []}
        utils={utils}
      />

      {/* View Supplements */}
      <ViewSupplementSection
        contractId={contractId}
        seasons={seasons}
        existing={byType["VIEW"] ?? []}
        utils={utils}
      />
    </div>
  );
}

// ─── Room Type Supplement Grid ────────────────────────────

function RoomTypeSupplementGrid({
  contractId,
  seasons,
  roomTypes,
  existing,
  utils,
}: {
  contractId: string;
  seasons: SeasonData[];
  roomTypes: ContractRoomTypeData[];
  existing: SupplementData[];
  utils: ReturnType<typeof trpc.useUtils>;
}) {
  const [grid, setGrid] = useState<GridState>(() => {
    const init: GridState = {};
    for (const s of existing) {
      if (s.roomTypeId && s.seasonId) {
        init[cellKey(s.roomTypeId, s.seasonId)] = {
          value: String(Number(s.value)),
          valueType: s.valueType,
        };
      }
    }
    return init;
  });

  const saveMutation = trpc.contracting.contractSupplement.bulkSaveRoomType.useMutation({
    onSuccess: () => utils.contracting.contract.getById.invalidate({ id: contractId }),
  });

  function handleSave() {
    const items: { seasonId: string; roomTypeId: string; value: number; valueType: "FIXED" | "PERCENTAGE"; perPerson: boolean; perNight: boolean }[] = [];
    for (const rt of roomTypes) {
      for (const season of seasons) {
        const cell = grid[cellKey(rt.roomTypeId, season.id)];
        if (cell && cell.value && Number(cell.value) !== 0) {
          items.push({
            seasonId: season.id,
            roomTypeId: rt.roomTypeId,
            value: Number(cell.value),
            valueType: (cell.valueType as "FIXED" | "PERCENTAGE") || "FIXED",
            perPerson: true,
            perNight: true,
          });
        }
      }
    }
    saveMutation.mutate({ contractId, items });
  }

  if (roomTypes.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Room Type Supplements</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Add non-base room types to the contract first.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Room Type Supplements</CardTitle>
        <Button size="sm" onClick={handleSave} disabled={saveMutation.isPending}>
          {saveMutation.isPending ? "Saving..." : "Save"}
        </Button>
      </CardHeader>
      <CardContent>
        {saveMutation.error && (
          <p className="mb-2 text-sm text-destructive">{saveMutation.error.message}</p>
        )}
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Room Type</TableHead>
              {seasons.map((s) => (
                <TableHead key={s.id}>{s.name}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {roomTypes.map((rt) => (
              <TableRow key={rt.roomTypeId}>
                <TableCell className="font-medium">{rt.roomType.name}</TableCell>
                {seasons.map((s) => {
                  const key = cellKey(rt.roomTypeId, s.id);
                  return (
                    <TableCell key={s.id}>
                      <div className="flex items-center gap-1">
                        <Input
                          type="number"
                          step="0.01"
                          className="w-24"
                          value={grid[key]?.value ?? ""}
                          onChange={(e) =>
                            setGrid((prev) => ({
                              ...prev,
                              [key]: {
                                value: e.target.value,
                                valueType: prev[key]?.valueType ?? "FIXED",
                              },
                            }))
                          }
                        />
                        <Select
                          value={grid[key]?.valueType ?? "FIXED"}
                          onValueChange={(vt) =>
                            setGrid((prev) => ({
                              ...prev,
                              [key]: {
                                value: prev[key]?.value ?? "",
                                valueType: vt,
                              },
                            }))
                          }
                        >
                          <SelectTrigger className="w-16">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="FIXED">{SUPPLEMENT_VALUE_TYPE_LABELS.FIXED}</SelectItem>
                            <SelectItem value="PERCENTAGE">{SUPPLEMENT_VALUE_TYPE_LABELS.PERCENTAGE}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </TableCell>
                  );
                })}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

// ─── Meal Supplement Grid ─────────────────────────────────

function MealSupplementGrid({
  contractId,
  seasons,
  mealBases,
  existing,
  utils,
}: {
  contractId: string;
  seasons: SeasonData[];
  mealBases: ContractMealBasisData[];
  existing: SupplementData[];
  utils: ReturnType<typeof trpc.useUtils>;
}) {
  const [grid, setGrid] = useState<GridState>(() => {
    const init: GridState = {};
    for (const s of existing) {
      if (s.mealBasisId && s.seasonId) {
        init[cellKey(s.mealBasisId, s.seasonId)] = {
          value: String(Number(s.value)),
          valueType: s.valueType,
        };
      }
    }
    return init;
  });

  const saveMutation = trpc.contracting.contractSupplement.bulkSaveMeal.useMutation({
    onSuccess: () => utils.contracting.contract.getById.invalidate({ id: contractId }),
  });

  function handleSave() {
    const items: { seasonId: string; mealBasisId: string; value: number; valueType: "FIXED" | "PERCENTAGE"; isReduction: boolean; perPerson: boolean; perNight: boolean }[] = [];
    for (const mb of mealBases) {
      for (const season of seasons) {
        const cell = grid[cellKey(mb.mealBasisId, season.id)];
        if (cell && cell.value && Number(cell.value) !== 0) {
          items.push({
            seasonId: season.id,
            mealBasisId: mb.mealBasisId,
            value: Math.abs(Number(cell.value)),
            valueType: (cell.valueType as "FIXED" | "PERCENTAGE") || "FIXED",
            isReduction: Number(cell.value) < 0,
            perPerson: true,
            perNight: true,
          });
        }
      }
    }
    saveMutation.mutate({ contractId, items });
  }

  if (mealBases.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Meal Plan Supplements</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Add non-base meal plans to the contract first.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Meal Plan Supplements</CardTitle>
        <Button size="sm" onClick={handleSave} disabled={saveMutation.isPending}>
          {saveMutation.isPending ? "Saving..." : "Save"}
        </Button>
      </CardHeader>
      <CardContent>
        {saveMutation.error && (
          <p className="mb-2 text-sm text-destructive">{saveMutation.error.message}</p>
        )}
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Meal Plan</TableHead>
              {seasons.map((s) => (
                <TableHead key={s.id}>{s.name}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {mealBases.map((mb) => (
              <TableRow key={mb.mealBasisId}>
                <TableCell className="font-medium">{mb.mealBasis.name}</TableCell>
                {seasons.map((s) => {
                  const key = cellKey(mb.mealBasisId, s.id);
                  return (
                    <TableCell key={s.id}>
                      <div className="flex items-center gap-1">
                        <Input
                          type="number"
                          step="0.01"
                          className="w-24"
                          value={grid[key]?.value ?? ""}
                          onChange={(e) =>
                            setGrid((prev) => ({
                              ...prev,
                              [key]: {
                                value: e.target.value,
                                valueType: prev[key]?.valueType ?? "FIXED",
                              },
                            }))
                          }
                        />
                        <Select
                          value={grid[key]?.valueType ?? "FIXED"}
                          onValueChange={(vt) =>
                            setGrid((prev) => ({
                              ...prev,
                              [key]: {
                                value: prev[key]?.value ?? "",
                                valueType: vt,
                              },
                            }))
                          }
                        >
                          <SelectTrigger className="w-16">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="FIXED">{SUPPLEMENT_VALUE_TYPE_LABELS.FIXED}</SelectItem>
                            <SelectItem value="PERCENTAGE">{SUPPLEMENT_VALUE_TYPE_LABELS.PERCENTAGE}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </TableCell>
                  );
                })}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

// ─── Occupancy Supplement Grid ────────────────────────────

const OCCUPANCY_ROWS = [
  { forAdults: 1, label: OCCUPANCY_SUPPLEMENT_LABELS[1] },
  { forAdults: 3, label: OCCUPANCY_SUPPLEMENT_LABELS[3] },
];

function OccupancySupplementGrid({
  contractId,
  seasons,
  existing,
  utils,
}: {
  contractId: string;
  seasons: SeasonData[];
  existing: SupplementData[];
  utils: ReturnType<typeof trpc.useUtils>;
}) {
  const [grid, setGrid] = useState<GridState>(() => {
    const init: GridState = {};
    for (const s of existing) {
      if (s.forAdults != null) {
        init[cellKey(String(s.forAdults), s.seasonId)] = {
          value: String(Number(s.value)),
          valueType: s.valueType,
        };
      }
    }
    return init;
  });

  const saveMutation = trpc.contracting.contractSupplement.bulkSaveOccupancy.useMutation({
    onSuccess: () => utils.contracting.contract.getById.invalidate({ id: contractId }),
  });

  function handleSave() {
    const items: { seasonId: string; forAdults: number; value: number; valueType: "FIXED" | "PERCENTAGE"; isReduction: boolean; perNight: boolean }[] = [];
    for (const row of OCCUPANCY_ROWS) {
      for (const season of seasons) {
        const cell = grid[cellKey(String(row.forAdults), season.id)];
        if (cell && cell.value && Number(cell.value) !== 0) {
          items.push({
            seasonId: season.id,
            forAdults: row.forAdults,
            value: Math.abs(Number(cell.value)),
            valueType: (cell.valueType as "FIXED" | "PERCENTAGE") || "FIXED",
            isReduction: row.forAdults === 3,
            perNight: true,
          });
        }
      }
    }
    saveMutation.mutate({ contractId, items });
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Occupancy Supplements</CardTitle>
        <Button size="sm" onClick={handleSave} disabled={saveMutation.isPending}>
          {saveMutation.isPending ? "Saving..." : "Save"}
        </Button>
      </CardHeader>
      <CardContent>
        {saveMutation.error && (
          <p className="mb-2 text-sm text-destructive">{saveMutation.error.message}</p>
        )}
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Occupancy</TableHead>
              {seasons.map((s) => (
                <TableHead key={s.id}>{s.name}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {OCCUPANCY_ROWS.map((row) => (
              <TableRow key={row.forAdults}>
                <TableCell className="font-medium">{row.label}</TableCell>
                {seasons.map((s) => {
                  const key = cellKey(String(row.forAdults), s.id);
                  return (
                    <TableCell key={s.id}>
                      <div className="flex items-center gap-1">
                        <Input
                          type="number"
                          step="0.01"
                          className="w-24"
                          value={grid[key]?.value ?? ""}
                          onChange={(e) =>
                            setGrid((prev) => ({
                              ...prev,
                              [key]: {
                                value: e.target.value,
                                valueType: prev[key]?.valueType ?? "FIXED",
                              },
                            }))
                          }
                        />
                        <Select
                          value={grid[key]?.valueType ?? "FIXED"}
                          onValueChange={(vt) =>
                            setGrid((prev) => ({
                              ...prev,
                              [key]: {
                                value: prev[key]?.value ?? "",
                                valueType: vt,
                              },
                            }))
                          }
                        >
                          <SelectTrigger className="w-16">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="FIXED">{SUPPLEMENT_VALUE_TYPE_LABELS.FIXED}</SelectItem>
                            <SelectItem value="PERCENTAGE">{SUPPLEMENT_VALUE_TYPE_LABELS.PERCENTAGE}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </TableCell>
                  );
                })}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

// ─── Child Supplement Grid ────────────────────────────────

function ChildSupplementGrid({
  contractId,
  seasons,
  childPolicies,
  existing,
  utils,
}: {
  contractId: string;
  seasons: SeasonData[];
  childPolicies: { category: string; bedding: string; label: string }[];
  existing: SupplementData[];
  utils: ReturnType<typeof trpc.useUtils>;
}) {
  const [grid, setGrid] = useState<GridState>(() => {
    const init: GridState = {};
    for (const s of existing) {
      if (s.forChildCategory && s.forChildBedding) {
        init[cellKey(`${s.forChildCategory}:${s.forChildBedding}`, s.seasonId)] = {
          value: String(Number(s.value)),
          valueType: s.valueType,
        };
      }
    }
    return init;
  });

  const saveMutation = trpc.contracting.contractSupplement.bulkSaveChild.useMutation({
    onSuccess: () => utils.contracting.contract.getById.invalidate({ id: contractId }),
  });

  function handleSave() {
    const items: { seasonId: string; forChildCategory: "INFANT" | "CHILD" | "TEEN"; forChildBedding: "SHARING_WITH_PARENTS" | "EXTRA_BED" | "OWN_BED"; value: number; valueType: "FIXED" | "PERCENTAGE"; perNight: boolean }[] = [];
    for (const cp of childPolicies) {
      for (const season of seasons) {
        const cell = grid[cellKey(`${cp.category}:${cp.bedding}`, season.id)];
        if (cell && cell.value && Number(cell.value) !== 0) {
          items.push({
            seasonId: season.id,
            forChildCategory: cp.category as "INFANT" | "CHILD" | "TEEN",
            forChildBedding: cp.bedding as "SHARING_WITH_PARENTS" | "EXTRA_BED" | "OWN_BED",
            value: Number(cell.value),
            valueType: (cell.valueType as "FIXED" | "PERCENTAGE") || "FIXED",
            perNight: true,
          });
        }
      }
    }
    saveMutation.mutate({ contractId, items });
  }

  if (childPolicies.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Child Supplements</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No child policies defined for this hotel. Add child policies in hotel settings first.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Child Supplements</CardTitle>
        <Button size="sm" onClick={handleSave} disabled={saveMutation.isPending}>
          {saveMutation.isPending ? "Saving..." : "Save"}
        </Button>
      </CardHeader>
      <CardContent>
        {saveMutation.error && (
          <p className="mb-2 text-sm text-destructive">{saveMutation.error.message}</p>
        )}
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Child Category</TableHead>
              {seasons.map((s) => (
                <TableHead key={s.id}>{s.name}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {childPolicies.map((cp) => {
              const rowId = `${cp.category}:${cp.bedding}`;
              return (
                <TableRow key={rowId}>
                  <TableCell className="font-medium">{cp.label}</TableCell>
                  {seasons.map((s) => {
                    const key = cellKey(rowId, s.id);
                    return (
                      <TableCell key={s.id}>
                        <div className="flex items-center gap-1">
                          <Input
                            type="number"
                            step="0.01"
                            className="w-24"
                            value={grid[key]?.value ?? ""}
                            onChange={(e) =>
                              setGrid((prev) => ({
                                ...prev,
                                [key]: {
                                  value: e.target.value,
                                  valueType: prev[key]?.valueType ?? "FIXED",
                                },
                              }))
                            }
                          />
                          <Select
                            value={grid[key]?.valueType ?? "FIXED"}
                            onValueChange={(vt) =>
                              setGrid((prev) => ({
                                ...prev,
                                [key]: {
                                  value: prev[key]?.value ?? "",
                                  valueType: vt,
                                },
                              }))
                            }
                          >
                            <SelectTrigger className="w-16">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="FIXED">{SUPPLEMENT_VALUE_TYPE_LABELS.FIXED}</SelectItem>
                              <SelectItem value="PERCENTAGE">{SUPPLEMENT_VALUE_TYPE_LABELS.PERCENTAGE}</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </TableCell>
                    );
                  })}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

// ─── Extra Bed Supplement Grid ────────────────────────────

function ExtraBedSupplementGrid({
  contractId,
  seasons,
  existing,
  utils,
}: {
  contractId: string;
  seasons: SeasonData[];
  existing: SupplementData[];
  utils: ReturnType<typeof trpc.useUtils>;
}) {
  const [grid, setGrid] = useState<GridState>(() => {
    const init: GridState = {};
    for (const s of existing) {
      init[cellKey("extrabed", s.seasonId)] = {
        value: String(Number(s.value)),
        valueType: s.valueType,
      };
    }
    return init;
  });

  const saveMutation = trpc.contracting.contractSupplement.bulkSaveExtraBed.useMutation({
    onSuccess: () => utils.contracting.contract.getById.invalidate({ id: contractId }),
  });

  function handleSave() {
    const items: { seasonId: string; value: number; valueType: "FIXED" | "PERCENTAGE"; perNight: boolean }[] = [];
    for (const season of seasons) {
      const cell = grid[cellKey("extrabed", season.id)];
      if (cell && cell.value && Number(cell.value) !== 0) {
        items.push({
          seasonId: season.id,
          value: Number(cell.value),
          valueType: (cell.valueType as "FIXED" | "PERCENTAGE") || "FIXED",
          perNight: true,
        });
      }
    }
    saveMutation.mutate({ contractId, items });
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Extra Bed Supplement</CardTitle>
        <Button size="sm" onClick={handleSave} disabled={saveMutation.isPending}>
          {saveMutation.isPending ? "Saving..." : "Save"}
        </Button>
      </CardHeader>
      <CardContent>
        {saveMutation.error && (
          <p className="mb-2 text-sm text-destructive">{saveMutation.error.message}</p>
        )}
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Type</TableHead>
              {seasons.map((s) => (
                <TableHead key={s.id}>{s.name}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell className="font-medium">Extra Bed</TableCell>
              {seasons.map((s) => {
                const key = cellKey("extrabed", s.id);
                return (
                  <TableCell key={s.id}>
                    <div className="flex items-center gap-1">
                      <Input
                        type="number"
                        step="0.01"
                        className="w-24"
                        value={grid[key]?.value ?? ""}
                        onChange={(e) =>
                          setGrid((prev) => ({
                            ...prev,
                            [key]: {
                              value: e.target.value,
                              valueType: prev[key]?.valueType ?? "FIXED",
                            },
                          }))
                        }
                      />
                      <Select
                        value={grid[key]?.valueType ?? "FIXED"}
                        onValueChange={(vt) =>
                          setGrid((prev) => ({
                            ...prev,
                            [key]: {
                              value: prev[key]?.value ?? "",
                              valueType: vt,
                            },
                          }))
                        }
                      >
                        <SelectTrigger className="w-16">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="FIXED">{SUPPLEMENT_VALUE_TYPE_LABELS.FIXED}</SelectItem>
                          <SelectItem value="PERCENTAGE">{SUPPLEMENT_VALUE_TYPE_LABELS.PERCENTAGE}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </TableCell>
                );
              })}
            </TableRow>
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

// ─── View Supplement Section ──────────────────────────────

function ViewSupplementSection({
  contractId,
  seasons,
  existing,
  utils,
}: {
  contractId: string;
  seasons: SeasonData[];
  existing: SupplementData[];
  utils: ReturnType<typeof trpc.useUtils>;
}) {
  const [showDialog, setShowDialog] = useState(false);
  const [editing, setEditing] = useState<SupplementData | null>(null);
  const [label, setLabel] = useState("");
  const [seasonId, setSeasonId] = useState("");
  const [value, setValue] = useState("");
  const [valueType, setValueType] = useState("FIXED");
  const [notes, setNotes] = useState("");

  const createMutation = trpc.contracting.contractSupplement.createView.useMutation({
    onSuccess: () => {
      utils.contracting.contract.getById.invalidate({ id: contractId });
      setShowDialog(false);
      resetForm();
    },
  });

  const updateMutation = trpc.contracting.contractSupplement.updateView.useMutation({
    onSuccess: () => {
      utils.contracting.contract.getById.invalidate({ id: contractId });
      setShowDialog(false);
      setEditing(null);
      resetForm();
    },
  });

  const deleteMutation = trpc.contracting.contractSupplement.delete.useMutation({
    onSuccess: () => utils.contracting.contract.getById.invalidate({ id: contractId }),
  });

  function resetForm() {
    setLabel("");
    setSeasonId("");
    setValue("");
    setValueType("FIXED");
    setNotes("");
  }

  function openCreate() {
    resetForm();
    setEditing(null);
    setShowDialog(true);
  }

  function openEdit(s: SupplementData) {
    setEditing(s);
    setLabel(s.label ?? "");
    setSeasonId(s.seasonId);
    setValue(String(Number(s.value)));
    setValueType(s.valueType);
    setNotes(s.notes ?? "");
    setShowDialog(true);
  }

  function handleSubmit() {
    if (editing) {
      updateMutation.mutate({
        id: editing.id,
        data: {
          label,
          seasonId,
          value: Number(value),
          valueType: valueType as "FIXED" | "PERCENTAGE",
          notes: notes || null,
        },
      });
    } else {
      createMutation.mutate({
        contractId,
        seasonId,
        label,
        value: Number(value),
        valueType: valueType as "FIXED" | "PERCENTAGE",
        perPerson: true,
        perNight: true,
        notes: notes || null,
        sortOrder: existing.length,
      });
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>View Supplements</CardTitle>
        <Button size="sm" onClick={openCreate}>
          Add View
        </Button>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Label</TableHead>
              <TableHead>Season</TableHead>
              <TableHead>Value</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Notes</TableHead>
              <TableHead className="w-[120px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {existing.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                  No view supplements defined
                </TableCell>
              </TableRow>
            ) : (
              existing.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">{s.label}</TableCell>
                  <TableCell>{s.season.name}</TableCell>
                  <TableCell>{Number(s.value)}</TableCell>
                  <TableCell>{SUPPLEMENT_VALUE_TYPE_LABELS[s.valueType]}</TableCell>
                  <TableCell className="max-w-[200px] truncate">{s.notes ?? "—"}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" onClick={() => openEdit(s)}>
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive"
                        onClick={() => deleteMutation.mutate({ id: s.id })}
                      >
                        Remove
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        <Dialog
          open={showDialog}
          onOpenChange={(open) => {
            setShowDialog(open);
            if (!open) {
              setEditing(null);
              resetForm();
            }
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editing ? "Edit View Supplement" : "Add View Supplement"}</DialogTitle>
              <DialogDescription>
                Define a view supplement (e.g., Sea View, Garden View) for a specific season.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Label</label>
                <Input
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  placeholder="Sea View"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Season</label>
                <Select value={seasonId} onValueChange={setSeasonId}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select season" />
                  </SelectTrigger>
                  <SelectContent>
                    {seasons.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Value</label>
                  <Input
                    type="number"
                    step="0.01"
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Type</label>
                  <Select value={valueType} onValueChange={setValueType}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="FIXED">Fixed</SelectItem>
                      <SelectItem value="PERCENTAGE">Percentage</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">Notes</label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Optional notes..."
                />
              </div>
            </div>
            {(createMutation.error || updateMutation.error) && (
              <p className="text-sm text-destructive">
                {createMutation.error?.message ?? updateMutation.error?.message}
              </p>
            )}
            <DialogFooter>
              <Button
                onClick={handleSubmit}
                disabled={
                  !label || !seasonId || !value ||
                  createMutation.isPending || updateMutation.isPending
                }
              >
                {editing ? "Update" : "Add"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
