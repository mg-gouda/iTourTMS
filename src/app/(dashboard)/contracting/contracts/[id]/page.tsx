"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { useParams, useRouter } from "next/navigation";
import { Fragment, useEffect, useState } from "react";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import type { z } from "zod";

import { ArrowLeftRight, FileDown, FileSpreadsheet, Plus, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
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
  CANCELLATION_CHARGE_TYPE_LABELS,
  OFFER_TYPE_LABELS,
  OCCUPANCY_SUPPLEMENT_LABELS,
  RATE_BASIS_LABELS,
  SUPPLEMENT_VALUE_TYPE_LABELS,
} from "@/lib/constants/contracting";
import { exportContractToExcel } from "@/lib/export/contract-excel";
import { formatCurrency } from "@/lib/format";
import { trpc } from "@/lib/trpc";
import { formatSeasonLabel } from "@/lib/utils";
import {
  contractSeasonCreateSchema,
  contractSeasonUpdateSchema,
} from "@/lib/validations/contracting";

type SeasonFormValues = z.input<typeof contractSeasonCreateSchema>;

type SeasonData = {
  id: string;
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
  season: { id: string; dateFrom: string | Date; dateTo: string | Date };
};

type SupplementData = {
  id: string;
  contractId: string;
  supplementType: string;
  roomTypeId: string | null;
  mealBasisId: string | null;
  forAdults: number | null;
  forChildCategory: string | null;
  forChildBedding: string | null;
  childPosition: number | null;
  valueType: string;
  value: string | number;
  isReduction: boolean;
  perPerson: boolean;
  perNight: boolean;
  label: string | null;
  notes: string | null;
  sortOrder: number;
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
  travelFrom: string | Date | null;
  travelTo: string | Date | null;
  season: string | null;
  rateBasis: string;
  minimumStay: number;
  maximumStay: number | null;
  terms: string | null;
  internalNotes: string | null;
  hotelNotes: string | null;
  version: number;
  isTemplate: boolean;
  parentContractId: string | null;
  parentContract: { id: string; name: string; code: string; version: number } | null;
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
  markets: { id: string; market: { id: string; name: string; code: string } }[];
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

  const cloneMutation = trpc.contracting.contract.clone.useMutation({
    onSuccess: (data) => {
      utils.contracting.contract.list.invalidate();
      router.push(`/contracting/contracts/${data.id}`);
    },
  });

  const saveTemplateMutation = trpc.contracting.contract.saveAsTemplate.useMutation({
    onSuccess: (data) => {
      utils.contracting.contract.listTemplates.invalidate();
      router.push(`/contracting/contracts/${data.id}`);
    },
  });

  const [exporting, setExporting] = useState(false);

  const handleExportExcel = async () => {
    setExporting(true);
    try {
      const fullData = await utils.contracting.contract.getForExport.fetch({ id });
      await exportContractToExcel(fullData as Parameters<typeof exportContractToExcel>[0]);
    } finally {
      setExporting(false);
    }
  };

  const [showDelete, setShowDelete] = useState(false);
  const [showClone, setShowClone] = useState(false);
  const [showSaveTemplate, setShowSaveTemplate] = useState(false);

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
            {contract.isTemplate ? (
              <Badge variant="secondary">Template</Badge>
            ) : (
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
            )}
            {!contract.isTemplate && contract.version > 1 && (
              <Badge variant="outline">v{contract.version}</Badge>
            )}
          </div>
          <p className="text-muted-foreground">
            {contract.hotel.name} &middot; {contract.code}
          </p>
        </div>
        <div className="flex gap-2">
          {contract.isTemplate ? (
            <>
              <Button onClick={() => setShowClone(true)}>
                Use Template
              </Button>
              <Button
                variant="destructive"
                onClick={() => setShowDelete(true)}
              >
                Delete
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="outline"
                onClick={() => setShowClone(true)}
              >
                Clone
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowSaveTemplate(true)}
              >
                Save as Template
              </Button>
            </>
          )}
          <Button
            variant="outline"
            onClick={() =>
              window.open(`/api/export/contract-pdf/${id}`, "_blank")
            }
          >
            <FileDown className="mr-1 h-4 w-4" />
            Download PDF
          </Button>
          <Button
            variant="outline"
            onClick={handleExportExcel}
            disabled={exporting}
          >
            <FileSpreadsheet className="mr-1 h-4 w-4" />
            {exporting ? "Exporting..." : "Export Excel"}
          </Button>
          {!contract.isTemplate && isDraft && (
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
          {!contract.isTemplate && isPosted && (
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
          {!contract.isTemplate && contract.status === "PUBLISHED" && (
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
      <Tabs defaultValue="overview" orientation="vertical">
        <TabsList className="w-48 shrink-0 self-start sticky top-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="markets">Markets</TabsTrigger>
          <TabsTrigger value="tourOperators">Tour Operators</TabsTrigger>
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
          <TabsTrigger value="rateSheet">Rate Sheet</TabsTrigger>
          <TabsTrigger value="specialOffers">Special Offers</TabsTrigger>
          <TabsTrigger value="seasonSpos">Season SPOs</TabsTrigger>
          <TabsTrigger value="allotments">Allotments</TabsTrigger>
          <TabsTrigger value="childPolicies">Child Policies</TabsTrigger>
          <TabsTrigger value="specialMeals">Special Meals</TabsTrigger>
          <TabsTrigger value="cancellation">Cancellation</TabsTrigger>
          <TabsTrigger value="simulator">Simulator</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <OverviewTab contract={contract} />
        </TabsContent>
        <TabsContent value="markets">
          <MarketsTab contractId={id} />
        </TabsContent>
        <TabsContent value="tourOperators">
          <TourOperatorsTab contractId={id} />
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
        <TabsContent value="rateSheet">
          <RateSheetTab contractId={id} contract={contract} />
        </TabsContent>
        <TabsContent value="specialOffers">
          <SpecialOffersTab contractId={id} />
        </TabsContent>
        <TabsContent value="seasonSpos">
          <SeasonSpoTab contractId={id} />
        </TabsContent>
        <TabsContent value="allotments">
          <AllotmentsTab contractId={id} contract={contract} />
        </TabsContent>
        <TabsContent value="childPolicies">
          <ChildPoliciesTab contractId={id} hotelId={contract.hotelId} />
        </TabsContent>
        <TabsContent value="specialMeals">
          <SpecialMealsTab contractId={id} />
        </TabsContent>
        <TabsContent value="cancellation">
          <CancellationPolicyTab contractId={id} />
        </TabsContent>
        <TabsContent value="simulator">
          <SimulatorTab contractId={id} />
        </TabsContent>
        <TabsContent value="activity">
          <ActivityTab contractId={id} />
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

      {/* Clone / Use Template Dialog */}
      <CloneContractDialog
        contract={contract}
        open={showClone}
        onOpenChange={setShowClone}
        onClone={(data) => cloneMutation.mutate(data)}
        isPending={cloneMutation.isPending}
        error={cloneMutation.error?.message}
      />

      {/* Save as Template Dialog */}
      <SaveAsTemplateDialog
        contract={contract}
        open={showSaveTemplate}
        onOpenChange={setShowSaveTemplate}
        onSave={(data) => saveTemplateMutation.mutate(data)}
        isPending={saveTemplateMutation.isPending}
        error={saveTemplateMutation.error?.message}
      />
    </div>
  );
}

// ─── Clone Contract Dialog ────────────────────────────────────

function CloneContractDialog({
  contract,
  open,
  onOpenChange,
  onClone,
  isPending,
  error,
}: {
  contract: ContractData;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onClone: (data: {
    sourceContractId: string;
    name: string;
    code: string;
    validFrom: string;
    validTo: string;
  }) => void;
  isPending: boolean;
  error?: string;
}) {
  const [name, setName] = useState(`${contract.name} (Copy)`);
  const [code, setCode] = useState(`${contract.code}-V2`);
  const [validFrom, setValidFrom] = useState("");
  const [validTo, setValidTo] = useState("");

  useEffect(() => {
    if (open) {
      setName(`${contract.name} (Copy)`);
      setCode(`${contract.code}-V2`);
      setValidFrom("");
      setValidTo("");
    }
  }, [open, contract.name, contract.code]);

  const canSubmit = name.trim() && code.trim() && validFrom && validTo && validTo > validFrom;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{contract.isTemplate ? "Use Template" : "Clone Contract"}</DialogTitle>
          <DialogDescription>
            {contract.isTemplate
              ? `Create a new contract from template "${contract.name}" with all seasons, rates, supplements, and policies.`
              : `Create a copy of "${contract.name}" with all seasons, rates, supplements, special offers, and allotments.`}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Name</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Code</label>
            <Input value={code} onChange={(e) => setCode(e.target.value)} maxLength={20} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Valid From</label>
              <Input
                type="date"
                value={validFrom}
                onChange={(e) => setValidFrom(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Valid To</label>
              <Input
                type="date"
                value={validTo}
                onChange={(e) => setValidTo(e.target.value)}
              />
            </div>
          </div>
          {validFrom && validTo && validTo <= validFrom && (
            <p className="text-sm text-destructive">Valid To must be after Valid From</p>
          )}
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() =>
              onClone({
                sourceContractId: contract.id,
                name: name.trim(),
                code: code.trim(),
                validFrom,
                validTo,
              })
            }
            disabled={!canSubmit || isPending}
          >
            {isPending
              ? (contract.isTemplate ? "Creating..." : "Cloning...")
              : (contract.isTemplate ? "Create Contract" : "Clone Contract")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Save As Template Dialog ──────────────────────────────────

function SaveAsTemplateDialog({
  contract,
  open,
  onOpenChange,
  onSave,
  isPending,
  error,
}: {
  contract: ContractData;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: { contractId: string; name: string; code: string }) => void;
  isPending: boolean;
  error?: string;
}) {
  const [name, setName] = useState(`${contract.name} Template`);
  const [code, setCode] = useState(`${contract.code}-TPL`);

  useEffect(() => {
    if (open) {
      setName(`${contract.name} Template`);
      setCode(`${contract.code}-TPL`);
    }
  }, [open, contract.name, contract.code]);

  const canSubmit = name.trim() && code.trim();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Save as Template</DialogTitle>
          <DialogDescription>
            Save &quot;{contract.name}&quot; as a reusable template. All
            seasons, rates, supplements, and policies will be copied.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Template Name</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Template Code</label>
            <Input value={code} onChange={(e) => setCode(e.target.value)} maxLength={20} />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={!canSubmit || isPending}
            onClick={() =>
              onSave({
                contractId: contract.id,
                name: name.trim(),
                code: code.trim(),
              })
            }
          >
            {isPending ? "Saving..." : "Save Template"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
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
          <Separator />
          <div className="flex justify-between items-start">
            <span className="text-muted-foreground">Market Validity</span>
            <div className="flex flex-wrap justify-end gap-1">
              {contract.markets.length > 0 ? (
                contract.markets.map((cm) => (
                  <Badge key={cm.id} variant="secondary" className="text-xs">
                    {cm.market.name}
                  </Badge>
                ))
              ) : (
                <span className="text-muted-foreground">All Markets</span>
              )}
            </div>
          </div>
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
          {contract.season && (
            <>
              <Separator />
              <div className="flex justify-between">
                <span className="text-muted-foreground">Season</span>
                <span>{contract.season}</span>
              </div>
            </>
          )}
          <Separator />
          <div className="flex justify-between">
            <span className="text-muted-foreground">Booking From</span>
            <span>{format(new Date(contract.validFrom), "dd MMM yyyy")}</span>
          </div>
          <Separator />
          <div className="flex justify-between">
            <span className="text-muted-foreground">Booking To</span>
            <span>{format(new Date(contract.validTo), "dd MMM yyyy")}</span>
          </div>
          {(contract.travelFrom || contract.travelTo) && (
            <>
              <Separator />
              <div className="flex justify-between">
                <span className="text-muted-foreground">Travel From</span>
                <span>{contract.travelFrom ? format(new Date(contract.travelFrom), "dd MMM yyyy") : "—"}</span>
              </div>
              <Separator />
              <div className="flex justify-between">
                <span className="text-muted-foreground">Travel To</span>
                <span>{contract.travelTo ? format(new Date(contract.travelTo), "dd MMM yyyy") : "—"}</span>
              </div>
            </>
          )}
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

      <VersionHistoryCard contractId={contract.id} />
    </div>
  );
}

// ─── Version History Card ─────────────────────────────────────

function VersionHistoryCard({ contractId }: { contractId: string }) {
  const router = useRouter();
  const { data: history } =
    trpc.contracting.contract.getVersionHistory.useQuery({ contractId });

  // Only show if there are multiple versions in the lineage
  if (!history || history.length <= 1) return null;

  return (
    <Card className="md:col-span-2">
      <CardHeader>
        <CardTitle>Version History</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Version</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Code</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Season</TableHead>
              <TableHead>Booking From</TableHead>
              <TableHead>Booking To</TableHead>
              <TableHead>Travel From</TableHead>
              <TableHead>Travel To</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="w-[90px]">Compare</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {history.map((v) => (
              <TableRow
                key={v.id}
                className={`cursor-pointer ${v.id === contractId ? "bg-muted/50" : ""}`}
                onClick={() => {
                  if (v.id !== contractId) {
                    router.push(`/contracting/contracts/${v.id}`);
                  }
                }}
              >
                <TableCell className="font-mono">v{v.version}</TableCell>
                <TableCell className="font-medium">
                  {v.name}
                  {v.id === contractId && (
                    <Badge variant="outline" className="ml-2 text-xs">Current</Badge>
                  )}
                </TableCell>
                <TableCell className="font-mono">{v.code}</TableCell>
                <TableCell>
                  <Badge
                    variant={
                      (CONTRACT_STATUS_VARIANTS[v.status] as
                        | "default"
                        | "secondary"
                        | "outline"
                        | "destructive") ?? "secondary"
                    }
                  >
                    {CONTRACT_STATUS_LABELS[v.status] ?? v.status}
                  </Badge>
                </TableCell>
                <TableCell>{v.season ?? "—"}</TableCell>
                <TableCell>{format(new Date(v.validFrom), "dd MMM yyyy")}</TableCell>
                <TableCell>{format(new Date(v.validTo), "dd MMM yyyy")}</TableCell>
                <TableCell>{v.travelFrom ? format(new Date(v.travelFrom), "dd MMM yyyy") : "—"}</TableCell>
                <TableCell>{v.travelTo ? format(new Date(v.travelTo), "dd MMM yyyy") : "—"}</TableCell>
                <TableCell>{format(new Date(v.createdAt), "dd MMM yyyy")}</TableCell>
                <TableCell>
                  {v.id !== contractId && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(
                          `/contracting/contracts/compare?a=${contractId}&b=${v.id}`,
                        );
                      }}
                    >
                      <ArrowLeftRight className="mr-1 h-3.5 w-3.5" />
                      Compare
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
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
            <TableHead>Season</TableHead>
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
              <TableCell colSpan={6} className="text-center text-muted-foreground">
                No seasons defined yet
              </TableCell>
            </TableRow>
          ) : (
            contract.seasons.map((s) => (
              <TableRow key={s.id}>
                <TableCell className="font-medium">{formatSeasonLabel(s.dateFrom, s.dateTo)}</TableCell>
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
  const rateMap = new Map<string, { rate: number }>();
  for (const br of contract.baseRates) {
    rateMap.set(br.seasonId, { rate: Number(br.rate) });
  }

  const [rates, setRates] = useState<Record<string, { rate: string }>>(() => {
    const initial: Record<string, { rate: string }> = {};
    for (const season of contract.seasons) {
      const existing = rateMap.get(season.id);
      initial[season.id] = { rate: existing?.rate?.toString() ?? "" };
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
      }));

    saveMutation.mutate({ contractId, rates: rateEntries });
  }

  function updateRate(seasonId: string, value: string) {
    setRates((prev) => ({
      ...prev,
      [seasonId]: { rate: value },
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

      <Table className="w-auto">
        <TableHeader>
          <TableRow>
            <TableHead>Season</TableHead>
            <TableHead>Base Rate</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {contract.seasons.map((s) => (
            <TableRow key={s.id}>
              <TableCell className="font-medium">
                {formatSeasonLabel(s.dateFrom, s.dateTo)}
              </TableCell>
              <TableCell>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  className="w-28"
                  value={rates[s.id]?.rate ?? ""}
                  onChange={(e) => updateRate(s.id, e.target.value)}
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
type GridState = Record<string, CellValue>; // key = rowId

function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

type ChildSupColumn = {
  position: number;
  category: "INFANT" | "CHILD" | "TEEN" | null;
  label: string;
  key: string;
};

function SupplementsTab({
  contractId,
  contract,
}: {
  contractId: string;
  contract: ContractData;
}) {
  const utils = trpc.useUtils();

  // Non-base room types & meal bases
  const nonBaseRoomTypes = contract.roomTypes.filter((rt) => !rt.isBase);
  const nonBaseMealBases = contract.mealBases.filter((mb) => !mb.isBase);

  // Compute max children across all contracted room types
  const maxChildren = Math.max(
    0,
    ...contract.roomTypes.map((rt) => rt.roomType.maxChildren ?? 1),
  );

  // Build position-based child supplement columns
  const childColumns: ChildSupColumn[] = [];
  if (maxChildren >= 1) {
    childColumns.push({ position: 1, category: null, label: "1st Child", key: "pos:1:cat:null" });
  }
  for (let pos = 2; pos <= maxChildren; pos++) {
    for (const cat of ["INFANT", "CHILD", "TEEN"] as const) {
      const catLabel = CHILD_AGE_CATEGORY_LABELS[cat] ?? cat;
      childColumns.push({
        position: pos,
        category: cat,
        label: `${ordinal(pos)} Chd (${catLabel})`,
        key: `pos:${pos}:cat:${cat}`,
      });
    }
  }

  // Group existing supplements by type
  const byType: Record<string, SupplementData[]> = {};
  for (const s of contract.supplements) {
    if (!byType[s.supplementType]) byType[s.supplementType] = [];
    byType[s.supplementType].push(s);
  }

  return (
    <div className="space-y-6">
      {/* Room Type Supplements */}
      <RoomTypeSupplementGrid
        contractId={contractId}
        roomTypes={nonBaseRoomTypes}
        existing={byType["ROOM_TYPE"] ?? []}
        utils={utils}
      />

      {/* Meal Supplements */}
      <MealSupplementGrid
        contractId={contractId}
        mealBases={nonBaseMealBases}
        existing={byType["MEAL"] ?? []}
        utils={utils}
      />

      {/* Occupancy Supplements */}
      <OccupancySupplementGrid
        contractId={contractId}
        existing={byType["OCCUPANCY"] ?? []}
        utils={utils}
      />

      {/* Child Supplements */}
      <ChildSupplementGrid
        contractId={contractId}
        childColumns={childColumns}
        existing={byType["CHILD"] ?? []}
        utils={utils}
      />

      {/* Extra Bed Supplements */}
      <ExtraBedSupplementGrid
        contractId={contractId}
        existing={byType["EXTRA_BED"] ?? []}
        utils={utils}
      />

      {/* View Supplements */}
      <ViewSupplementGrid
        contractId={contractId}
        roomTypes={contract.roomTypes}
        existing={byType["VIEW"] ?? []}
        utils={utils}
      />

    </div>
  );
}

// ─── Room Type Supplement Grid ────────────────────────────

function RoomTypeSupplementGrid({
  contractId,
  roomTypes,
  existing,
  utils,
}: {
  contractId: string;
  roomTypes: ContractRoomTypeData[];
  existing: SupplementData[];
  utils: ReturnType<typeof trpc.useUtils>;
}) {
  const [grid, setGrid] = useState<GridState>(() => {
    const init: GridState = {};
    for (const s of existing) {
      if (s.roomTypeId) {
        init[s.roomTypeId] = {
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
    const items: { roomTypeId: string; value: number; valueType: "FIXED" | "PERCENTAGE"; perPerson: boolean; perNight: boolean }[] = [];
    for (const rt of roomTypes) {
      const cell = grid[rt.roomTypeId];
      if (cell && cell.value && Number(cell.value) !== 0) {
        items.push({
          roomTypeId: rt.roomTypeId,
          value: Number(cell.value),
          valueType: (cell.valueType as "FIXED" | "PERCENTAGE") || "FIXED",
          perPerson: true,
          perNight: true,
        });
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
        <Table className="w-auto">
          <TableHeader>
            <TableRow>
              <TableHead>Room Type</TableHead>
              <TableHead>Value</TableHead>
              <TableHead>Type</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {roomTypes.map((rt) => (
              <TableRow key={rt.roomTypeId}>
                <TableCell className="font-medium">{rt.roomType.name}</TableCell>
                <TableCell>
                  <Input
                    type="number"
                    step="0.01"
                    className="w-24"
                    value={grid[rt.roomTypeId]?.value ?? ""}
                    onChange={(e) =>
                      setGrid((prev) => ({
                        ...prev,
                        [rt.roomTypeId]: {
                          value: e.target.value,
                          valueType: prev[rt.roomTypeId]?.valueType ?? "FIXED",
                        },
                      }))
                    }
                  />
                </TableCell>
                <TableCell>
                  <Select
                    value={grid[rt.roomTypeId]?.valueType ?? "FIXED"}
                    onValueChange={(vt) =>
                      setGrid((prev) => ({
                        ...prev,
                        [rt.roomTypeId]: {
                          value: prev[rt.roomTypeId]?.value ?? "",
                          valueType: vt,
                        },
                      }))
                    }
                  >
                    <SelectTrigger className="w-20">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="FIXED">{SUPPLEMENT_VALUE_TYPE_LABELS.FIXED}</SelectItem>
                      <SelectItem value="PERCENTAGE">{SUPPLEMENT_VALUE_TYPE_LABELS.PERCENTAGE}</SelectItem>
                    </SelectContent>
                  </Select>
                </TableCell>
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
  mealBases,
  existing,
  utils,
}: {
  contractId: string;
  mealBases: ContractMealBasisData[];
  existing: SupplementData[];
  utils: ReturnType<typeof trpc.useUtils>;
}) {
  const [grid, setGrid] = useState<GridState>(() => {
    const init: GridState = {};
    for (const s of existing) {
      if (s.mealBasisId) {
        const storedValue = s.isReduction ? -Number(s.value) : Number(s.value);
        init[s.mealBasisId] = {
          value: String(storedValue),
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
    const items: { mealBasisId: string; value: number; valueType: "FIXED" | "PERCENTAGE"; isReduction: boolean; perPerson: boolean; perNight: boolean }[] = [];
    for (const mb of mealBases) {
      const cell = grid[mb.mealBasisId];
      if (cell && cell.value && Number(cell.value) !== 0) {
        items.push({
          mealBasisId: mb.mealBasisId,
          value: Math.abs(Number(cell.value)),
          valueType: (cell.valueType as "FIXED" | "PERCENTAGE") || "FIXED",
          isReduction: Number(cell.value) < 0,
          perPerson: true,
          perNight: true,
        });
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
        <Table className="w-auto">
          <TableHeader>
            <TableRow>
              <TableHead>Meal Plan</TableHead>
              <TableHead>Value</TableHead>
              <TableHead>Type</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {mealBases.map((mb) => (
              <TableRow key={mb.mealBasisId}>
                <TableCell className="font-medium">{mb.mealBasis.name}</TableCell>
                <TableCell>
                  <Input
                    type="number"
                    step="0.01"
                    className="w-24"
                    value={grid[mb.mealBasisId]?.value ?? ""}
                    onChange={(e) =>
                      setGrid((prev) => ({
                        ...prev,
                        [mb.mealBasisId]: {
                          value: e.target.value,
                          valueType: prev[mb.mealBasisId]?.valueType ?? "FIXED",
                        },
                      }))
                    }
                  />
                </TableCell>
                <TableCell>
                  <Select
                    value={grid[mb.mealBasisId]?.valueType ?? "FIXED"}
                    onValueChange={(vt) =>
                      setGrid((prev) => ({
                        ...prev,
                        [mb.mealBasisId]: {
                          value: prev[mb.mealBasisId]?.value ?? "",
                          valueType: vt,
                        },
                      }))
                    }
                  >
                    <SelectTrigger className="w-20">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="FIXED">{SUPPLEMENT_VALUE_TYPE_LABELS.FIXED}</SelectItem>
                      <SelectItem value="PERCENTAGE">{SUPPLEMENT_VALUE_TYPE_LABELS.PERCENTAGE}</SelectItem>
                    </SelectContent>
                  </Select>
                </TableCell>
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
  existing,
  utils,
}: {
  contractId: string;
  existing: SupplementData[];
  utils: ReturnType<typeof trpc.useUtils>;
}) {
  const [grid, setGrid] = useState<GridState>(() => {
    const init: GridState = {};
    for (const s of existing) {
      if (s.forAdults != null) {
        init[String(s.forAdults)] = {
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
    const items: { forAdults: number; value: number; valueType: "FIXED" | "PERCENTAGE"; isReduction: boolean; perNight: boolean }[] = [];
    for (const row of OCCUPANCY_ROWS) {
      const key = String(row.forAdults);
      const cell = grid[key];
      if (cell && cell.value && Number(cell.value) !== 0) {
        items.push({
          forAdults: row.forAdults,
          value: Math.abs(Number(cell.value)),
          valueType: (cell.valueType as "FIXED" | "PERCENTAGE") || "FIXED",
          isReduction: row.forAdults === 3,
          perNight: true,
        });
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
        <Table className="w-auto">
          <TableHeader>
            <TableRow>
              <TableHead>Occupancy</TableHead>
              <TableHead>Value</TableHead>
              <TableHead>Type</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {OCCUPANCY_ROWS.map((row) => {
              const key = String(row.forAdults);
              return (
                <TableRow key={row.forAdults}>
                  <TableCell className="font-medium">{row.label}</TableCell>
                  <TableCell>
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
                  </TableCell>
                  <TableCell>
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
                      <SelectTrigger className="w-20">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="FIXED">{SUPPLEMENT_VALUE_TYPE_LABELS.FIXED}</SelectItem>
                        <SelectItem value="PERCENTAGE">{SUPPLEMENT_VALUE_TYPE_LABELS.PERCENTAGE}</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

// ─── Child Supplement Grid ────────────────────────────────

function ChildSupplementGrid({
  contractId,
  childColumns,
  existing,
  utils,
}: {
  contractId: string;
  childColumns: ChildSupColumn[];
  existing: SupplementData[];
  utils: ReturnType<typeof trpc.useUtils>;
}) {
  const [grid, setGrid] = useState<GridState>(() => {
    const init: GridState = {};
    for (const s of existing) {
      if (s.childPosition != null) {
        const catKey = s.forChildCategory ?? "null";
        init[`pos:${s.childPosition}:cat:${catKey}`] = {
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
    const items: { childPosition: number; forChildCategory: "INFANT" | "CHILD" | "TEEN" | null; value: number; valueType: "FIXED" | "PERCENTAGE"; perNight: boolean }[] = [];
    for (const col of childColumns) {
      const cell = grid[col.key];
      if (cell && cell.value && Number(cell.value) !== 0) {
        items.push({
          childPosition: col.position,
          forChildCategory: col.category,
          value: Number(cell.value),
          valueType: (cell.valueType as "FIXED" | "PERCENTAGE") || "PERCENTAGE",
          perNight: true,
        });
      }
    }
    saveMutation.mutate({ contractId, items });
  }

  if (childColumns.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Child Discount Supplements</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No room types configured or max children is 0.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Child Discount Supplements</CardTitle>
        <Button size="sm" onClick={handleSave} disabled={saveMutation.isPending}>
          {saveMutation.isPending ? "Saving..." : "Save"}
        </Button>
      </CardHeader>
      <CardContent>
        {saveMutation.error && (
          <p className="mb-2 text-sm text-destructive">{saveMutation.error.message}</p>
        )}
        <div className="overflow-x-auto">
          <Table className="w-auto">
            <TableHeader>
              <TableRow>
                {childColumns.map((col) => (
                  <TableHead key={col.key} className="text-center min-w-[120px]">
                    {col.label}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                {childColumns.map((col) => (
                  <TableCell key={col.key}>
                    <div className="flex flex-col gap-1">
                      <Input
                        type="number"
                        step="0.01"
                        className="w-24"
                        value={grid[col.key]?.value ?? ""}
                        onChange={(e) =>
                          setGrid((prev) => ({
                            ...prev,
                            [col.key]: {
                              value: e.target.value,
                              valueType: prev[col.key]?.valueType ?? "PERCENTAGE",
                            },
                          }))
                        }
                      />
                      <Select
                        value={grid[col.key]?.valueType ?? "PERCENTAGE"}
                        onValueChange={(vt) =>
                          setGrid((prev) => ({
                            ...prev,
                            [col.key]: {
                              value: prev[col.key]?.value ?? "",
                              valueType: vt,
                            },
                          }))
                        }
                      >
                        <SelectTrigger className="w-20">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="PERCENTAGE">%</SelectItem>
                          <SelectItem value="FIXED">Fixed</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </TableCell>
                ))}
              </TableRow>
            </TableBody>
          </Table>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Values are discounts off base rate. 1st Child applies to Child age category only (Infants are free, Teens charged as adults).
        </p>
      </CardContent>
    </Card>
  );
}

// ─── Extra Bed Supplement Grid ────────────────────────────

function ExtraBedSupplementGrid({
  contractId,
  existing,
  utils,
}: {
  contractId: string;
  existing: SupplementData[];
  utils: ReturnType<typeof trpc.useUtils>;
}) {
  const [grid, setGrid] = useState<GridState>(() => {
    const init: GridState = {};
    for (const s of existing) {
      init["extrabed"] = {
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
    const items: { value: number; valueType: "FIXED" | "PERCENTAGE"; perNight: boolean }[] = [];
    const cell = grid["extrabed"];
    if (cell && cell.value && Number(cell.value) !== 0) {
      items.push({
        value: Number(cell.value),
        valueType: (cell.valueType as "FIXED" | "PERCENTAGE") || "FIXED",
        perNight: true,
      });
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
        <Table className="w-auto">
          <TableHeader>
            <TableRow>
              <TableHead>Type</TableHead>
              <TableHead>Value</TableHead>
              <TableHead>Type</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell className="font-medium">Extra Bed</TableCell>
              <TableCell>
                <Input
                  type="number"
                  step="0.01"
                  className="w-24"
                  value={grid["extrabed"]?.value ?? ""}
                  onChange={(e) =>
                    setGrid((prev) => ({
                      ...prev,
                      ["extrabed"]: {
                        value: e.target.value,
                        valueType: prev["extrabed"]?.valueType ?? "FIXED",
                      },
                    }))
                  }
                />
              </TableCell>
              <TableCell>
                <Select
                  value={grid["extrabed"]?.valueType ?? "FIXED"}
                  onValueChange={(vt) =>
                    setGrid((prev) => ({
                      ...prev,
                      ["extrabed"]: {
                        value: prev["extrabed"]?.value ?? "",
                        valueType: vt,
                      },
                    }))
                  }
                >
                  <SelectTrigger className="w-20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="FIXED">{SUPPLEMENT_VALUE_TYPE_LABELS.FIXED}</SelectItem>
                    <SelectItem value="PERCENTAGE">{SUPPLEMENT_VALUE_TYPE_LABELS.PERCENTAGE}</SelectItem>
                  </SelectContent>
                </Select>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

// ─── View Supplement Section ──────────────────────────────

type ViewRow = {
  roomTypeId: string;
  label: string;
  value: string;
  valueType: string;
  perPerson: boolean;
  perNight: boolean;
};

function ViewSupplementGrid({
  contractId,
  roomTypes,
  existing,
  utils,
}: {
  contractId: string;
  roomTypes: ContractRoomTypeData[];
  existing: SupplementData[];
  utils: ReturnType<typeof trpc.useUtils>;
}) {
  const [rows, setRows] = useState<ViewRow[]>(() =>
    existing.length > 0
      ? existing.map((s) => ({
          roomTypeId: s.roomTypeId ?? "",
          label: s.label ?? "",
          value: String(Number(s.value)),
          valueType: s.valueType,
          perPerson: s.perPerson,
          perNight: s.perNight,
        }))
      : [{ roomTypeId: "", label: "", value: "", valueType: "FIXED", perPerson: true, perNight: true }],
  );

  const saveMutation = trpc.contracting.contractSupplement.bulkSaveView.useMutation({
    onSuccess: () => utils.contracting.contract.getById.invalidate({ id: contractId }),
  });

  function addRow() {
    setRows((prev) => [
      ...prev,
      { roomTypeId: "", label: "", value: "", valueType: "FIXED", perPerson: true, perNight: true },
    ]);
  }

  function removeRow(idx: number) {
    setRows((prev) => prev.filter((_, i) => i !== idx));
  }

  function updateRow(idx: number, field: keyof ViewRow, val: string | boolean) {
    setRows((prev) =>
      prev.map((r, i) => (i === idx ? { ...r, [field]: val } : r)),
    );
  }

  function handleSave() {
    const items = rows
      .filter((r) => r.roomTypeId && r.label && r.value && Number(r.value) !== 0)
      .map((r) => ({
        roomTypeId: r.roomTypeId,
        label: r.label,
        value: Number(r.value),
        valueType: r.valueType as "FIXED" | "PERCENTAGE",
        perPerson: r.perPerson,
        perNight: r.perNight,
      }));
    saveMutation.mutate({ contractId, items });
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>View Supplements</CardTitle>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={addRow}>
            <Plus className="mr-1 size-3" /> Add Row
          </Button>
          <Button size="sm" onClick={handleSave} disabled={saveMutation.isPending}>
            {saveMutation.isPending ? "Saving..." : "Save"}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {saveMutation.error && (
          <p className="mb-2 text-sm text-destructive">{saveMutation.error.message}</p>
        )}
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Room Type</TableHead>
              <TableHead>View Label</TableHead>
              <TableHead>Value</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Per Person</TableHead>
              <TableHead>Per Night</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row, idx) => (
              <TableRow key={idx}>
                <TableCell>
                  <Select
                    value={row.roomTypeId}
                    onValueChange={(v) => updateRow(idx, "roomTypeId", v)}
                  >
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="Select..." />
                    </SelectTrigger>
                    <SelectContent>
                      {roomTypes.map((rt) => (
                        <SelectItem key={rt.roomTypeId} value={rt.roomTypeId}>
                          {rt.roomType.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell>
                  <Input
                    placeholder="e.g. Sea View"
                    className="w-36"
                    value={row.label}
                    onChange={(e) => updateRow(idx, "label", e.target.value)}
                  />
                </TableCell>
                <TableCell>
                  <Input
                    type="number"
                    step="0.01"
                    className="w-24"
                    value={row.value}
                    onChange={(e) => updateRow(idx, "value", e.target.value)}
                  />
                </TableCell>
                <TableCell>
                  <Select
                    value={row.valueType}
                    onValueChange={(v) => updateRow(idx, "valueType", v)}
                  >
                    <SelectTrigger className="w-20">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="FIXED">{SUPPLEMENT_VALUE_TYPE_LABELS.FIXED}</SelectItem>
                      <SelectItem value="PERCENTAGE">{SUPPLEMENT_VALUE_TYPE_LABELS.PERCENTAGE}</SelectItem>
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell>
                  <Checkbox
                    checked={row.perPerson}
                    onCheckedChange={(checked) => updateRow(idx, "perPerson", checked === true)}
                  />
                </TableCell>
                <TableCell>
                  <Checkbox
                    checked={row.perNight}
                    onCheckedChange={(checked) => updateRow(idx, "perNight", checked === true)}
                  />
                </TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => removeRow(idx)}
                  >
                    <X className="size-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-4">
                  No view supplements. Click &quot;Add Row&quot; to add one.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

// ─── Season SPO Dialog ──────────────────────────────────

type SeasonSpoRow = {
  id?: string | null;
  dateFrom: string;
  dateTo: string;
  basePp: string;
  sglSup: string;
  thirdAdultRed: string;
  firstChildPct: string;
  secondChildPct: string;
  bookFrom: string;
  bookTo: string;
  value: string;
  valueType: "FIXED" | "PERCENTAGE";
  active: boolean;
};

function emptyRow(): SeasonSpoRow {
  return {
    dateFrom: "",
    dateTo: "",
    basePp: "",
    sglSup: "",
    thirdAdultRed: "",
    firstChildPct: "",
    secondChildPct: "",
    bookFrom: "",
    bookTo: "",
    value: "",
    valueType: "PERCENTAGE",
    active: true,
  };
}

function SeasonSpoTab({ contractId }: { contractId: string }) {
  const utils = trpc.useUtils();
  const [activeTab, setActiveTab] = useState("RATE_OVERRIDE");

  const [rateRows, setRateRows] = useState<SeasonSpoRow[]>([]);
  const [bookingRows, setBookingRows] = useState<SeasonSpoRow[]>([]);
  const [pctRows, setPctRows] = useState<SeasonSpoRow[]>([]);

  const { data: allSpos } = trpc.contracting.seasonSpo.listByContract.useQuery(
    { contractId },
  );

  const bulkSaveMutation = trpc.contracting.seasonSpo.bulkSave.useMutation({
    onSuccess: () => {
      utils.contracting.seasonSpo.listByContract.invalidate({ contractId });
    },
  });

  const toggleMutation = trpc.contracting.seasonSpo.toggleActive.useMutation({
    onSuccess: () => {
      utils.contracting.seasonSpo.listByContract.invalidate({ contractId });
    },
  });

  // Sync fetched data into local state when dialog opens
  useEffect(() => {
    if (!allSpos) return;
    const toRow = (s: typeof allSpos[number]): SeasonSpoRow => ({
      id: s.id,
      dateFrom: format(new Date(s.dateFrom), "yyyy-MM-dd"),
      dateTo: format(new Date(s.dateTo), "yyyy-MM-dd"),
      basePp: s.basePp != null ? String(Number(s.basePp)) : "",
      sglSup: s.sglSup != null ? String(Number(s.sglSup)) : "",
      thirdAdultRed: s.thirdAdultRed != null ? String(Number(s.thirdAdultRed)) : "",
      firstChildPct: s.firstChildPct != null ? String(Number(s.firstChildPct)) : "",
      secondChildPct: s.secondChildPct != null ? String(Number(s.secondChildPct)) : "",
      bookFrom: s.bookFrom ? format(new Date(s.bookFrom), "yyyy-MM-dd") : "",
      bookTo: s.bookTo ? format(new Date(s.bookTo), "yyyy-MM-dd") : "",
      value: s.value != null ? String(Number(s.value)) : "",
      valueType: (s.valueType as "FIXED" | "PERCENTAGE") ?? "PERCENTAGE",
      active: s.active,
    });
    setRateRows(allSpos.filter((s) => s.spoType === "RATE_OVERRIDE").map(toRow));
    setBookingRows(allSpos.filter((s) => s.spoType === "BOOKING_WINDOW").map(toRow));
    setPctRows(allSpos.filter((s) => s.spoType === "PERCENTAGE").map(toRow));
  }, [allSpos]);

  function getRowsForTab(tab: string) {
    if (tab === "RATE_OVERRIDE") return rateRows;
    if (tab === "BOOKING_WINDOW") return bookingRows;
    return pctRows;
  }

  function setRowsForTab(tab: string, rows: SeasonSpoRow[]) {
    if (tab === "RATE_OVERRIDE") setRateRows(rows);
    else if (tab === "BOOKING_WINDOW") setBookingRows(rows);
    else setPctRows(rows);
  }

  function updateRow(tab: string, idx: number, field: keyof SeasonSpoRow, val: string | boolean) {
    const rows = [...getRowsForTab(tab)];
    rows[idx] = { ...rows[idx], [field]: val };
    setRowsForTab(tab, rows);
  }

  function addRow(tab: string) {
    setRowsForTab(tab, [...getRowsForTab(tab), emptyRow()]);
  }

  function removeRow(tab: string, idx: number) {
    const rows = getRowsForTab(tab).filter((_, i) => i !== idx);
    setRowsForTab(tab, rows);
  }

  function handleSave(spoType: string) {
    const rows = getRowsForTab(spoType);
    bulkSaveMutation.mutate({
      contractId,
      spoType: spoType as "RATE_OVERRIDE" | "BOOKING_WINDOW" | "PERCENTAGE",
      items: rows
        .filter((r) => r.dateFrom && r.dateTo)
        .map((r) => ({
          id: r.id,
          dateFrom: r.dateFrom,
          dateTo: r.dateTo,
          basePp: r.basePp ? Number(r.basePp) : null,
          sglSup: r.sglSup ? Number(r.sglSup) : null,
          thirdAdultRed: r.thirdAdultRed ? Number(r.thirdAdultRed) : null,
          firstChildPct: r.firstChildPct ? Number(r.firstChildPct) : null,
          secondChildPct: r.secondChildPct ? Number(r.secondChildPct) : null,
          bookFrom: r.bookFrom || null,
          bookTo: r.bookTo || null,
          value: r.value ? Number(r.value) : null,
          valueType: r.valueType || null,
          active: r.active,
        })),
    });
  }

  function handleToggle(row: SeasonSpoRow, tab: string, idx: number) {
    if (row.id) {
      toggleMutation.mutate({ id: row.id });
    }
    updateRow(tab, idx, "active", !row.active);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Season Special Offers</CardTitle>
        <p className="text-sm text-muted-foreground">
          Manage season-level rate overrides, booking window offers, and percentage discounts.
        </p>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3 mb-4">
            <TabsTrigger value="RATE_OVERRIDE">Rate Override</TabsTrigger>
            <TabsTrigger value="BOOKING_WINDOW">Booking Window</TabsTrigger>
            <TabsTrigger value="PERCENTAGE">Percentage SPO</TabsTrigger>
          </TabsList>

          {/* ── Rate Override Grid ── */}
          <TabsContent value="RATE_OVERRIDE">
              <div className="space-y-3">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[120px]">From</TableHead>
                      <TableHead className="w-[120px]">To</TableHead>
                      <TableHead>Base PP</TableHead>
                      <TableHead>SGL Sup %</TableHead>
                      <TableHead>3rd Adult Red</TableHead>
                      <TableHead>1st Child %</TableHead>
                      <TableHead>2nd Child %</TableHead>
                      <TableHead className="w-[70px]">Active</TableHead>
                      <TableHead className="w-[40px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rateRows.map((row, idx) => (
                      <TableRow key={idx} className={!row.active ? "opacity-50 line-through" : ""}>
                        <TableCell><Input type="date" value={row.dateFrom} onChange={(e) => updateRow("RATE_OVERRIDE", idx, "dateFrom", e.target.value)} className="h-8 text-xs" /></TableCell>
                        <TableCell><Input type="date" value={row.dateTo} onChange={(e) => updateRow("RATE_OVERRIDE", idx, "dateTo", e.target.value)} className="h-8 text-xs" /></TableCell>
                        <TableCell><Input type="number" value={row.basePp} onChange={(e) => updateRow("RATE_OVERRIDE", idx, "basePp", e.target.value)} className="h-8 w-20 text-xs" /></TableCell>
                        <TableCell><Input type="number" value={row.sglSup} onChange={(e) => updateRow("RATE_OVERRIDE", idx, "sglSup", e.target.value)} className="h-8 w-20 text-xs" /></TableCell>
                        <TableCell><Input type="number" value={row.thirdAdultRed} onChange={(e) => updateRow("RATE_OVERRIDE", idx, "thirdAdultRed", e.target.value)} className="h-8 w-20 text-xs" /></TableCell>
                        <TableCell><Input type="number" value={row.firstChildPct} onChange={(e) => updateRow("RATE_OVERRIDE", idx, "firstChildPct", e.target.value)} className="h-8 w-20 text-xs" /></TableCell>
                        <TableCell><Input type="number" value={row.secondChildPct} onChange={(e) => updateRow("RATE_OVERRIDE", idx, "secondChildPct", e.target.value)} className="h-8 w-20 text-xs" /></TableCell>
                        <TableCell><Switch checked={row.active} onCheckedChange={() => handleToggle(row, "RATE_OVERRIDE", idx)} /></TableCell>
                        <TableCell><Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-destructive" onClick={() => removeRow("RATE_OVERRIDE", idx)}>×</Button></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => addRow("RATE_OVERRIDE")}>Add Row</Button>
                  <Button size="sm" onClick={() => handleSave("RATE_OVERRIDE")} disabled={bulkSaveMutation.isPending}>Save All</Button>
                </div>
              </div>
            </TabsContent>

            {/* ── Booking Window Grid ── */}
            <TabsContent value="BOOKING_WINDOW">
              <div className="space-y-3">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[120px]">From</TableHead>
                      <TableHead className="w-[120px]">To</TableHead>
                      <TableHead className="w-[120px]">Book From</TableHead>
                      <TableHead className="w-[120px]">Book To</TableHead>
                      <TableHead>Value</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead className="w-[70px]">Active</TableHead>
                      <TableHead className="w-[40px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {bookingRows.map((row, idx) => (
                      <TableRow key={idx} className={!row.active ? "opacity-50 line-through" : ""}>
                        <TableCell><Input type="date" value={row.dateFrom} onChange={(e) => updateRow("BOOKING_WINDOW", idx, "dateFrom", e.target.value)} className="h-8 text-xs" /></TableCell>
                        <TableCell><Input type="date" value={row.dateTo} onChange={(e) => updateRow("BOOKING_WINDOW", idx, "dateTo", e.target.value)} className="h-8 text-xs" /></TableCell>
                        <TableCell><Input type="date" value={row.bookFrom} onChange={(e) => updateRow("BOOKING_WINDOW", idx, "bookFrom", e.target.value)} className="h-8 text-xs" /></TableCell>
                        <TableCell><Input type="date" value={row.bookTo} onChange={(e) => updateRow("BOOKING_WINDOW", idx, "bookTo", e.target.value)} className="h-8 text-xs" /></TableCell>
                        <TableCell><Input type="number" value={row.value} onChange={(e) => updateRow("BOOKING_WINDOW", idx, "value", e.target.value)} className="h-8 w-24 text-xs" /></TableCell>
                        <TableCell>
                          <Select value={row.valueType} onValueChange={(v) => updateRow("BOOKING_WINDOW", idx, "valueType", v)}>
                            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="FIXED">Fixed</SelectItem>
                              <SelectItem value="PERCENTAGE">%</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell><Switch checked={row.active} onCheckedChange={() => handleToggle(row, "BOOKING_WINDOW", idx)} /></TableCell>
                        <TableCell><Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-destructive" onClick={() => removeRow("BOOKING_WINDOW", idx)}>×</Button></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => addRow("BOOKING_WINDOW")}>Add Row</Button>
                  <Button size="sm" onClick={() => handleSave("BOOKING_WINDOW")} disabled={bulkSaveMutation.isPending}>Save All</Button>
                </div>
              </div>
            </TabsContent>

            {/* ── Percentage SPO Grid ── */}
            <TabsContent value="PERCENTAGE">
              <div className="space-y-3">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[140px]">From</TableHead>
                      <TableHead className="w-[140px]">To</TableHead>
                      <TableHead>Discount %</TableHead>
                      <TableHead className="w-[70px]">Active</TableHead>
                      <TableHead className="w-[40px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pctRows.map((row, idx) => (
                      <TableRow key={idx} className={!row.active ? "opacity-50 line-through" : ""}>
                        <TableCell><Input type="date" value={row.dateFrom} onChange={(e) => updateRow("PERCENTAGE", idx, "dateFrom", e.target.value)} className="h-8 text-xs" /></TableCell>
                        <TableCell><Input type="date" value={row.dateTo} onChange={(e) => updateRow("PERCENTAGE", idx, "dateTo", e.target.value)} className="h-8 text-xs" /></TableCell>
                        <TableCell><Input type="number" value={row.value} onChange={(e) => updateRow("PERCENTAGE", idx, "value", e.target.value)} className="h-8 w-28 text-xs" /></TableCell>
                        <TableCell><Switch checked={row.active} onCheckedChange={() => handleToggle(row, "PERCENTAGE", idx)} /></TableCell>
                        <TableCell><Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-destructive" onClick={() => removeRow("PERCENTAGE", idx)}>×</Button></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => addRow("PERCENTAGE")}>Add Row</Button>
                  <Button size="sm" onClick={() => handleSave("PERCENTAGE")} disabled={bulkSaveMutation.isPending}>Save All</Button>
                </div>
              </div>
            </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

// ─── Special Offers Tab ──────────────────────────────────

type SpecialOfferData = {
  id: string;
  contractId: string;
  name: string;
  offerType: string;
  description: string | null;
  validFrom: string | Date | null;
  validTo: string | Date | null;
  bookByDate: string | Date | null;
  minimumNights: number | null;
  minimumRooms: number | null;
  advanceBookDays: number | null;
  discountType: string;
  discountValue: string | number;
  stayNights: number | null;
  payNights: number | null;
  bookFromDate: string | Date | null;
  stayDateType: string | null;
  paymentPct: number | null;
  paymentDeadline: string | Date | null;
  roomingListBy: string | Date | null;
  combinable: boolean;
  active: boolean;
  sortOrder: number;
};

function SpecialOffersTab({ contractId }: { contractId: string }) {
  const utils = trpc.useUtils();
  const [showDialog, setShowDialog] = useState(false);
  const [editing, setEditing] = useState<SpecialOfferData | null>(null);
  const [tierOfferId, setTierOfferId] = useState<string | null>(null);
  const [tierOfferName, setTierOfferName] = useState("");
  const [tierOfferType, setTierOfferType] = useState("");
  const [tierRows, setTierRows] = useState<{ thresholdValue: string; discountType: string; discountValue: string }[]>([]);

  // Form state
  const [name, setName] = useState("");
  const [offerType, setOfferType] = useState("EARLY_BIRD");
  const [discountType, setDiscountType] = useState("PERCENTAGE");
  const [discountValue, setDiscountValue] = useState("");
  const [validFrom, setValidFrom] = useState("");
  const [validTo, setValidTo] = useState("");
  const [bookByDate, setBookByDate] = useState("");
  const [minimumNights, setMinimumNights] = useState("");
  const [minimumRooms, setMinimumRooms] = useState("");
  const [advanceBookDays, setAdvanceBookDays] = useState("");
  const [stayNights, setStayNights] = useState("");
  const [payNights, setPayNights] = useState("");
  const [bookFromDate, setBookFromDate] = useState("");
  const [stayDateType, setStayDateType] = useState("COMPLETED");
  const [paymentPct, setPaymentPct] = useState("");
  const [paymentDeadline, setPaymentDeadline] = useState("");
  const [roomingListBy, setRoomingListBy] = useState("");
  const [combinable, setCombinable] = useState(true);

  const { data: offers, isLoading } = trpc.contracting.specialOffer.listByContract.useQuery(
    { contractId },
  );

  const createMutation = trpc.contracting.specialOffer.create.useMutation({
    onSuccess: () => {
      utils.contracting.specialOffer.listByContract.invalidate({ contractId });
      setShowDialog(false);
      resetForm();
    },
  });

  const updateMutation = trpc.contracting.specialOffer.update.useMutation({
    onSuccess: () => {
      utils.contracting.specialOffer.listByContract.invalidate({ contractId });
      setShowDialog(false);
      setEditing(null);
      resetForm();
    },
  });

  const deleteMutation = trpc.contracting.specialOffer.delete.useMutation({
    onSuccess: () => utils.contracting.specialOffer.listByContract.invalidate({ contractId }),
  });

  const toggleMutation = trpc.contracting.specialOffer.toggleActive.useMutation({
    onSuccess: () => utils.contracting.specialOffer.listByContract.invalidate({ contractId }),
  });

  const { data: tierData } = trpc.contracting.specialOffer.listTiers.useQuery(
    { offerId: tierOfferId! },
    { enabled: !!tierOfferId },
  );

  const saveTiersMutation = trpc.contracting.specialOffer.saveTiers.useMutation({
    onSuccess: () => {
      setTierOfferId(null);
      toast.success("Tiers saved");
    },
    onError: (err: { message: string }) => toast.error(err.message),
  });

  function openTiers(o: SpecialOfferData) {
    setTierOfferId(o.id);
    setTierOfferName(o.name);
    setTierOfferType(o.offerType);
    // Tiers will load via the query above, we set initial state when data arrives
    setTierRows([]);
  }

  // Sync tier rows when data loads
  useEffect(() => {
    if (tierData && tierOfferId) {
      if (tierData.length > 0) {
        setTierRows(tierData.map((t) => ({
          thresholdValue: String(t.thresholdValue),
          discountType: t.discountType,
          discountValue: String(Number(t.discountValue)),
        })));
      } else {
        setTierRows([{ thresholdValue: "", discountType: "PERCENTAGE", discountValue: "" }]);
      }
    }
  }, [tierData, tierOfferId]);

  function handleSaveTiers() {
    if (!tierOfferId) return;
    const tiers = tierRows
      .filter((r) => r.thresholdValue && r.discountValue)
      .map((r, idx) => ({
        thresholdValue: Number(r.thresholdValue),
        discountType: r.discountType as "FIXED" | "PERCENTAGE",
        discountValue: Number(r.discountValue),
        sortOrder: idx,
      }));
    saveTiersMutation.mutate({ offerId: tierOfferId, tiers });
  }

  function resetForm() {
    setName("");
    setOfferType("EARLY_BIRD");
    setDiscountType("PERCENTAGE");
    setDiscountValue("");
    setValidFrom("");
    setValidTo("");
    setBookByDate("");
    setMinimumNights("");
    setMinimumRooms("");
    setAdvanceBookDays("");
    setStayNights("");
    setPayNights("");
    setBookFromDate("");
    setStayDateType("COMPLETED");
    setPaymentPct("");
    setPaymentDeadline("");
    setRoomingListBy("");
    setCombinable(true);
  }

  function openCreate() {
    resetForm();
    setEditing(null);
    setShowDialog(true);
  }

  function openEdit(o: SpecialOfferData) {
    setEditing(o);
    setName(o.name);
    setOfferType(o.offerType);
    setDiscountType(o.discountType);
    setDiscountValue(String(Number(o.discountValue)));
    setValidFrom(o.validFrom ? format(new Date(o.validFrom), "yyyy-MM-dd") : "");
    setValidTo(o.validTo ? format(new Date(o.validTo), "yyyy-MM-dd") : "");
    setBookByDate(o.bookByDate ? format(new Date(o.bookByDate), "yyyy-MM-dd") : "");
    setMinimumNights(o.minimumNights ? String(o.minimumNights) : "");
    setMinimumRooms(o.minimumRooms ? String(o.minimumRooms) : "");
    setAdvanceBookDays(o.advanceBookDays ? String(o.advanceBookDays) : "");
    setStayNights(o.stayNights ? String(o.stayNights) : "");
    setPayNights(o.payNights ? String(o.payNights) : "");
    setBookFromDate(o.bookFromDate ? format(new Date(o.bookFromDate), "yyyy-MM-dd") : "");
    setStayDateType(o.stayDateType ?? "COMPLETED");
    setPaymentPct(o.paymentPct ? String(o.paymentPct) : "");
    setPaymentDeadline(o.paymentDeadline ? format(new Date(o.paymentDeadline), "yyyy-MM-dd") : "");
    setRoomingListBy(o.roomingListBy ? format(new Date(o.roomingListBy), "yyyy-MM-dd") : "");
    setCombinable(o.combinable);
    setShowDialog(true);
  }

  function handleSubmit() {
    const base = {
      name,
      offerType: offerType as "EARLY_BIRD" | "NORMAL_EBD" | "LONG_STAY" | "FREE_NIGHTS" | "HONEYMOON" | "GROUP_DISCOUNT",
      description: null,
      discountType: discountType as "FIXED" | "PERCENTAGE",
      discountValue: Number(discountValue) || 0,
      validFrom: validFrom || null,
      validTo: validTo || null,
      bookByDate: bookByDate || null,
      minimumNights: minimumNights ? Number(minimumNights) : null,
      minimumRooms: minimumRooms ? Number(minimumRooms) : null,
      advanceBookDays: advanceBookDays ? Number(advanceBookDays) : null,
      stayNights: stayNights ? Number(stayNights) : null,
      payNights: payNights ? Number(payNights) : null,
      bookFromDate: bookFromDate || null,
      stayDateType: (stayDateType as "COMPLETED" | "ARRIVAL") || null,
      paymentPct: paymentPct ? Number(paymentPct) : null,
      paymentDeadline: paymentDeadline || null,
      roomingListBy: roomingListBy || null,
      combinable,
    };

    if (editing) {
      updateMutation.mutate({ id: editing.id, data: base });
    } else {
      createMutation.mutate({
        ...base,
        contractId,
        active: true,
        sortOrder: (offers?.length ?? 0),
      });
    }
  }

  const typedOffers = (offers ?? []) as unknown as SpecialOfferData[];

  function formatDiscount(o: SpecialOfferData) {
    if (o.offerType === "FREE_NIGHTS") {
      return `Stay ${o.stayNights}, Pay ${o.payNights}`;
    }
    const val = Number(o.discountValue);
    return o.discountType === "PERCENTAGE" ? `${val}%` : formatCurrency(val);
  }

  if (isLoading) {
    return <div className="p-8 text-center text-muted-foreground">Loading special offers...</div>;
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Special Offers</CardTitle>
        <Button size="sm" onClick={openCreate}>
          Add Contract Offers
        </Button>
      </CardHeader>
      <CardContent>
        {typedOffers.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            No special offers configured. Click &quot;Add Contract Offers&quot; to create one.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Discount</TableHead>
                <TableHead>Conditions</TableHead>
                <TableHead>Valid Period</TableHead>
                <TableHead>Active</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {typedOffers.map((o) => (
                <TableRow key={o.id}>
                  <TableCell className="font-medium">{o.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {OFFER_TYPE_LABELS[o.offerType] ?? o.offerType}
                    </Badge>
                  </TableCell>
                  <TableCell>{formatDiscount(o)}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {o.offerType === "EARLY_BIRD" && o.advanceBookDays && `${o.advanceBookDays}+ days advance`}
                    {o.offerType === "NORMAL_EBD" && (
                      <span>
                        Book: {o.bookFromDate ? format(new Date(o.bookFromDate), "dd MMM") : "—"}–{o.bookByDate ? format(new Date(o.bookByDate), "dd MMM") : "—"}
                        {" | "}Stay ({o.stayDateType ?? "COMPLETED"}): {o.validFrom ? format(new Date(o.validFrom), "dd MMM") : "—"}–{o.validTo ? format(new Date(o.validTo), "dd MMM") : "—"}
                        {o.paymentPct && o.paymentDeadline && (
                          <> {" | "}{o.paymentPct}% by {format(new Date(o.paymentDeadline), "dd MMM yyyy")}</>
                        )}
                      </span>
                    )}
                    {o.offerType === "LONG_STAY" && o.minimumNights && `${o.minimumNights}+ nights`}
                    {o.offerType === "FREE_NIGHTS" && `${o.stayNights}+ nights`}
                    {o.offerType === "GROUP_DISCOUNT" && o.minimumRooms && `${o.minimumRooms}+ rooms`}
                    {o.offerType === "HONEYMOON" && "—"}
                    {o.combinable ? "" : " (non-combinable)"}
                  </TableCell>
                  <TableCell className="text-sm">
                    {o.validFrom || o.validTo ? (
                      <>
                        {o.validFrom ? format(new Date(o.validFrom), "dd MMM yyyy") : "—"}{" "}
                        to{" "}
                        {o.validTo ? format(new Date(o.validTo), "dd MMM yyyy") : "—"}
                      </>
                    ) : (
                      <span className="text-muted-foreground">Always</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={o.active}
                      onCheckedChange={() => toggleMutation.mutate({ id: o.id })}
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    {(o.offerType === "EARLY_BIRD" || o.offerType === "LONG_STAY") && (
                      <Button variant="ghost" size="sm" onClick={() => openTiers(o)}>
                        Tiers
                      </Button>
                    )}
                    <Button variant="ghost" size="sm" onClick={() => openEdit(o)}>
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive"
                      onClick={() => deleteMutation.mutate({ id: o.id })}
                    >
                      Delete
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        {/* Tier Management Dialog */}
        <Dialog open={!!tierOfferId} onOpenChange={(open) => { if (!open) setTierOfferId(null); }}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>
                Manage Tiers — {tierOfferName}
              </DialogTitle>
              <DialogDescription>
                {tierOfferType === "EARLY_BIRD"
                  ? "Define graduated discounts based on advance booking days."
                  : "Define graduated discounts based on minimum stay nights."}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>
                      {tierOfferType === "EARLY_BIRD" ? "Min Advance Days" : "Min Nights"}
                    </TableHead>
                    <TableHead>Discount</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tierRows.map((row, idx) => (
                    <TableRow key={idx}>
                      <TableCell>
                        <Input
                          type="number"
                          min={1}
                          className="w-24"
                          value={row.thresholdValue}
                          onChange={(e) => setTierRows((prev) =>
                            prev.map((r, i) => i === idx ? { ...r, thresholdValue: e.target.value } : r)
                          )}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min={0}
                          step="0.01"
                          className="w-24"
                          value={row.discountValue}
                          onChange={(e) => setTierRows((prev) =>
                            prev.map((r, i) => i === idx ? { ...r, discountValue: e.target.value } : r)
                          )}
                        />
                      </TableCell>
                      <TableCell>
                        <Select
                          value={row.discountType}
                          onValueChange={(v) => setTierRows((prev) =>
                            prev.map((r, i) => i === idx ? { ...r, discountType: v } : r)
                          )}
                        >
                          <SelectTrigger className="w-24">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="PERCENTAGE">%</SelectItem>
                            <SelectItem value="FIXED">Fixed</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => setTierRows((prev) => prev.filter((_, i) => i !== idx))}
                        >
                          <X className="size-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setTierRows((prev) => [...prev, { thresholdValue: "", discountType: "PERCENTAGE", discountValue: "" }])}
              >
                <Plus className="mr-1 size-3" /> Add Tier
              </Button>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setTierOfferId(null)}>Cancel</Button>
              <Button onClick={handleSaveTiers} disabled={saveTiersMutation.isPending}>
                {saveTiersMutation.isPending ? "Saving..." : "Save Tiers"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent className="sm:max-w-[1100px]">
            <DialogHeader>
              <DialogTitle>{editing ? "Edit Offer" : "Add Special Offer"}</DialogTitle>
              <DialogDescription>
                {editing ? "Update offer details." : "Configure a new special offer for this contract."}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-3 py-4">
              {/* Row 1: Name + Type + Discount (or Stay/Pay for FREE_NIGHTS) */}
              <div className="grid grid-cols-4 gap-3">
                <div>
                  <label className="text-sm font-medium">Name</label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Early Bird 60 Days" />
                </div>
                <div>
                  <label className="text-sm font-medium">Type</label>
                  <Select value={offerType} onValueChange={setOfferType}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(OFFER_TYPE_LABELS).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {offerType !== "FREE_NIGHTS" ? (
                  <>
                    <div>
                      <label className="text-sm font-medium">Discount Value</label>
                      <Input type="number" value={discountValue} onChange={(e) => setDiscountValue(e.target.value)} min={0} />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Discount Type</label>
                      <Select value={discountType} onValueChange={setDiscountType}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="PERCENTAGE">Percentage (%)</SelectItem>
                          <SelectItem value="FIXED">Fixed Amount</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <label className="text-sm font-medium">Stay Nights</label>
                      <Input type="number" value={stayNights} onChange={(e) => setStayNights(e.target.value)} min={2} placeholder="e.g. 7" />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Pay Nights</label>
                      <Input type="number" value={payNights} onChange={(e) => setPayNights(e.target.value)} min={1} placeholder="e.g. 5" />
                    </div>
                  </>
                )}
              </div>

              {/* Row 2 (non-EBD types): type-specific field + dates on one row */}
              {offerType !== "NORMAL_EBD" && (
                <div className="grid grid-cols-4 gap-3">
                  <div>
                    <label className="text-sm font-medium">Valid From</label>
                    <Input type="date" value={validFrom} onChange={(e) => setValidFrom(e.target.value)} />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Valid To</label>
                    <Input type="date" value={validTo} onChange={(e) => setValidTo(e.target.value)} />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Book By</label>
                    <Input type="date" value={bookByDate} onChange={(e) => setBookByDate(e.target.value)} />
                  </div>
                  <div>
                    {offerType === "EARLY_BIRD" && (
                      <>
                        <label className="text-sm font-medium">Advance Days</label>
                        <Input type="number" value={advanceBookDays} onChange={(e) => setAdvanceBookDays(e.target.value)} min={1} placeholder="e.g. 60" />
                      </>
                    )}
                    {offerType === "LONG_STAY" && (
                      <>
                        <label className="text-sm font-medium">Min Nights</label>
                        <Input type="number" value={minimumNights} onChange={(e) => setMinimumNights(e.target.value)} min={1} placeholder="e.g. 7" />
                      </>
                    )}
                    {offerType === "GROUP_DISCOUNT" && (
                      <>
                        <label className="text-sm font-medium">Min Rooms</label>
                        <Input type="number" value={minimumRooms} onChange={(e) => setMinimumRooms(e.target.value)} min={1} placeholder="e.g. 5" />
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* Normal EBD: Row 2 — Booking window + Stay window (4 cols) */}
              {offerType === "NORMAL_EBD" && (
                <>
                  <div className="grid grid-cols-4 gap-3">
                    <div>
                      <label className="text-sm font-medium">Booking From</label>
                      <Input type="date" value={bookFromDate} onChange={(e) => setBookFromDate(e.target.value)} />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Booking To</label>
                      <Input type="date" value={bookByDate} onChange={(e) => setBookByDate(e.target.value)} />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Stay From</label>
                      <Input type="date" value={validFrom} onChange={(e) => setValidFrom(e.target.value)} />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Stay To</label>
                      <Input type="date" value={validTo} onChange={(e) => setValidTo(e.target.value)} />
                    </div>
                  </div>
                  {/* Row 3 — Stay Date Type + Payment + Rooming List */}
                  <div className="grid grid-cols-4 gap-3">
                    <div>
                      <label className="text-sm font-medium">Stay Date Type</label>
                      <Select value={stayDateType} onValueChange={setStayDateType}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="COMPLETED">Completed</SelectItem>
                          <SelectItem value="ARRIVAL">Arrival Only</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Payment %</label>
                      <Input type="number" value={paymentPct} onChange={(e) => setPaymentPct(e.target.value)} min={1} max={100} placeholder="e.g. 50" />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Payment Deadline</label>
                      <Input type="date" value={paymentDeadline} onChange={(e) => setPaymentDeadline(e.target.value)} />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Rooming List By</label>
                      <Input type="date" value={roomingListBy} onChange={(e) => setRoomingListBy(e.target.value)} />
                    </div>
                  </div>
                </>
              )}

              {/* Combinable toggle */}
              <div className="flex items-center gap-2">
                <Switch checked={combinable} onCheckedChange={setCombinable} />
                <label className="text-sm font-medium">Combinable with other offers</label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleSubmit} disabled={!name || createMutation.isPending || updateMutation.isPending}>
                {editing ? "Update" : "Create"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}

// ─── Allotments Tab ──────────────────────────────────────

type AllotmentCellValue = {
  totalRooms: string;
  freeSale: boolean;
  basis: "FREESALE" | "ON_REQUEST" | "COMMITMENT" | "ALLOCATION";
};
type AllotmentGridState = Record<string, AllotmentCellValue>;

type StopSaleData = {
  id: string;
  contractId: string;
  roomTypeId: string | null;
  dateFrom: string | Date;
  dateTo: string | Date;
  reason: string | null;
  roomType: { id: string; name: string; code: string } | null;
};

function cellKey(rowId: string, colId: string) {
  return `${rowId}:${colId}`;
}

function AllotmentsTab({
  contractId,
  contract,
}: {
  contractId: string;
  contract: ContractData;
}) {
  return (
    <div className="space-y-6">
      <AllotmentGrid
        contractId={contractId}
        seasons={contract.seasons}
        roomTypes={contract.roomTypes}
      />
      <StopSalesSection
        contractId={contractId}
        roomTypes={contract.roomTypes}
      />
    </div>
  );
}

function AllotmentGrid({
  contractId,
  seasons,
  roomTypes,
}: {
  contractId: string;
  seasons: SeasonData[];
  roomTypes: ContractRoomTypeData[];
}) {
  const utils = trpc.useUtils();

  const { data: allotments } =
    trpc.contracting.contractAllotment.listByContract.useQuery({ contractId });

  const [grid, setGrid] = useState<AllotmentGridState>({});
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (!allotments) return;
    const init: AllotmentGridState = {};
    for (const a of allotments) {
      init[cellKey(a.roomTypeId, a.seasonId)] = {
        totalRooms: a.freeSale ? "" : String(a.totalRooms),
        freeSale: a.freeSale,
        basis: a.basis as AllotmentCellValue["basis"],
      };
    }
    setGrid(init);
    setInitialized(true);
  }, [allotments]);

  const saveMutation = trpc.contracting.contractAllotment.bulkSave.useMutation({
    onSuccess: () => {
      utils.contracting.contractAllotment.listByContract.invalidate({ contractId });
    },
  });

  function handleSave() {
    const items: { seasonId: string; roomTypeId: string; basis: AllotmentCellValue["basis"]; totalRooms: number; freeSale: boolean }[] = [];
    for (const rt of roomTypes) {
      for (const season of seasons) {
        const cell = grid[cellKey(rt.roomTypeId, season.id)];
        if (cell && (cell.freeSale || (cell.totalRooms && Number(cell.totalRooms) > 0))) {
          items.push({
            seasonId: season.id,
            roomTypeId: rt.roomTypeId,
            basis: cell.basis,
            totalRooms: cell.freeSale ? 0 : (Number(cell.totalRooms) || 0),
            freeSale: cell.freeSale,
          });
        }
      }
    }
    saveMutation.mutate({ contractId, items });
  }

  function updateCell(key: string, field: "totalRooms" | "freeSale" | "basis", value: string | boolean) {
    setGrid((prev) => ({
      ...prev,
      [key]: {
        ...prev[key] ?? { totalRooms: "", freeSale: false, basis: "ALLOCATION" as const },
        [field]: value,
      },
    }));
  }

  if (seasons.length === 0 || roomTypes.length === 0) {
    return (
      <div className="py-10 text-center text-muted-foreground">
        Configure seasons and room types first to set up allotments.
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Room Allotments</CardTitle>
        <Button
          size="sm"
          onClick={handleSave}
          disabled={saveMutation.isPending || !initialized}
        >
          {saveMutation.isPending ? "Saving..." : "Save Allotments"}
        </Button>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[200px]">Room Type</TableHead>
              {seasons.map((s) => (
                <TableHead key={s.id} className="text-center">
                  {formatSeasonLabel(s.dateFrom, s.dateTo)}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {roomTypes.map((rt) => (
              <TableRow key={rt.roomTypeId}>
                <TableCell className="font-medium">
                  {rt.roomType.name}
                  {rt.isBase && (
                    <Badge variant="secondary" className="ml-2">
                      Base
                    </Badge>
                  )}
                </TableCell>
                {seasons.map((s) => {
                  const key = cellKey(rt.roomTypeId, s.id);
                  const cell = grid[key] ?? { totalRooms: "", freeSale: false, basis: "ALLOCATION" as const };
                  return (
                    <TableCell key={s.id}>
                      <div className="flex flex-col gap-1.5">
                        <div className="flex items-center gap-2">
                          {cell.freeSale ? (
                            <div className="flex h-9 w-20 items-center justify-center rounded-md border bg-muted text-lg font-semibold text-muted-foreground">
                              &infin;
                            </div>
                          ) : (
                            <Input
                              type="number"
                              min={0}
                              className="w-20"
                              value={cell.totalRooms}
                              onChange={(e) => updateCell(key, "totalRooms", e.target.value)}
                            />
                          )}
                          <div className="flex items-center gap-1">
                            <Checkbox
                              checked={cell.freeSale}
                              onCheckedChange={(checked) =>
                                updateCell(key, "freeSale", checked === true)
                              }
                            />
                            <span className="text-xs text-muted-foreground">Free</span>
                          </div>
                        </div>
                        <Select
                          value={cell.basis}
                          onValueChange={(v) => updateCell(key, "basis", v)}
                        >
                          <SelectTrigger className="h-7 w-full text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="ALLOCATION">Allocation</SelectItem>
                            <SelectItem value="FREESALE">Free Sale</SelectItem>
                            <SelectItem value="ON_REQUEST">On Request</SelectItem>
                            <SelectItem value="COMMITMENT">Commitment</SelectItem>
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

function StopSalesSection({
  contractId,
  roomTypes,
}: {
  contractId: string;
  roomTypes: ContractRoomTypeData[];
}) {
  const utils = trpc.useUtils();
  const [showDialog, setShowDialog] = useState(false);
  const [roomTypeId, setRoomTypeId] = useState<string | null>(null);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [reason, setReason] = useState("");

  const { data: stopSales } =
    trpc.contracting.contractAllotment.listStopSales.useQuery({ contractId });

  const createMutation = trpc.contracting.contractAllotment.createStopSale.useMutation({
    onSuccess: () => {
      utils.contracting.contractAllotment.listStopSales.invalidate({ contractId });
      setShowDialog(false);
      resetForm();
    },
  });

  const deleteMutation = trpc.contracting.contractAllotment.deleteStopSale.useMutation({
    onSuccess: () => utils.contracting.contractAllotment.listStopSales.invalidate({ contractId }),
  });

  function resetForm() {
    setRoomTypeId(null);
    setDateFrom("");
    setDateTo("");
    setReason("");
  }

  function handleCreate() {
    createMutation.mutate({
      contractId,
      roomTypeId: roomTypeId || null,
      dateFrom,
      dateTo,
      reason: reason || null,
    });
  }

  const typedStopSales = (stopSales ?? []) as unknown as StopSaleData[];

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Stop Sales</CardTitle>
        <Button size="sm" onClick={() => { resetForm(); setShowDialog(true); }}>
          Add Stop Sale
        </Button>
      </CardHeader>
      <CardContent>
        {typedStopSales.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            No stop sales configured.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Room Type</TableHead>
                <TableHead>Date From</TableHead>
                <TableHead>Date To</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {typedStopSales.map((ss) => (
                <TableRow key={ss.id}>
                  <TableCell className="font-medium">
                    {ss.roomType ? ss.roomType.name : (
                      <span className="text-muted-foreground">All Room Types</span>
                    )}
                  </TableCell>
                  <TableCell>{format(new Date(ss.dateFrom), "dd MMM yyyy")}</TableCell>
                  <TableCell>{format(new Date(ss.dateTo), "dd MMM yyyy")}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {ss.reason || "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive"
                      onClick={() => deleteMutation.mutate({ id: ss.id })}
                    >
                      Delete
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Add Stop Sale</DialogTitle>
              <DialogDescription>
                Stop sales for a specific room type or all room types during a date range.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div>
                <label className="text-sm font-medium">Room Type</label>
                <Select
                  value={roomTypeId ?? "__all__"}
                  onValueChange={(v) => setRoomTypeId(v === "__all__" ? null : v)}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">All Room Types</SelectItem>
                    {roomTypes.map((rt) => (
                      <SelectItem key={rt.roomTypeId} value={rt.roomTypeId}>
                        {rt.roomType.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Date From</label>
                  <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
                </div>
                <div>
                  <label className="text-sm font-medium">Date To</label>
                  <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">Reason</label>
                <Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2} placeholder="Optional reason for stop sale" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreate} disabled={!dateFrom || !dateTo || createMutation.isPending}>
                {createMutation.isPending ? "Creating..." : "Create"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}

// ─── Rate Sheet Tab ──────────────────────────────────────

function RateSheetTab({
  contractId,
  contract,
}: {
  contractId: string;
  contract: ContractData;
}) {
  const { data: rateSheet, isLoading } =
    trpc.contracting.rateCalculator.getRateSheet.useQuery({ contractId });

  // Calculator state — booking-oriented flow
  const [arrivalDate, setArrivalDate] = useState("");
  const [departureDate, setDepartureDate] = useState("");
  const [adults, setAdults] = useState(2);
  const [childCount, setChildCount] = useState(0);
  const [childDobs, setChildDobs] = useState<string[]>([]);
  const [mealBasisId, setMealBasisId] = useState(contract.mealBases[0]?.mealBasisId ?? "");
  const [extraBed, setExtraBed] = useState(false);
  const [bookingDate, setBookingDate] = useState("");

  // Auto-calculate nights
  const calcNights = arrivalDate && departureDate
    ? Math.max(0, Math.floor((new Date(departureDate).getTime() - new Date(arrivalDate).getTime()) / (1000 * 60 * 60 * 24)))
    : 0;

  // Sync childDobs array length with childCount
  useEffect(() => {
    setChildDobs((prev) => {
      if (prev.length === childCount) return prev;
      if (childCount < prev.length) return prev.slice(0, childCount);
      return [...prev, ...Array(childCount - prev.length).fill("")];
    });
  }, [childCount]);

  const allChildDobsFilled = childCount === 0 || childDobs.every((d) => d.length > 0);

  const { data: multiResult, isLoading: isCalculating } =
    trpc.contracting.rateCalculator.calculateMultiRoom.useQuery(
      {
        contractId,
        arrivalDate,
        departureDate,
        adults,
        childDobs: childDobs.filter((d) => d.length > 0),
        mealBasisId,
        extraBed,
        bookingDate: bookingDate || null,
      },
      { enabled: !!arrivalDate && !!departureDate && departureDate > arrivalDate && !!mealBasisId && allChildDobsFilled },
    );

  if (contract.seasons.length === 0 || contract.baseRates.length === 0) {
    return (
      <div className="py-10 text-center text-muted-foreground">
        Configure seasons and base rates first to view the rate sheet.
      </div>
    );
  }

  // Build rate lookup for the grid (stores full breakdown per cell)
  type CellBreakdown = NonNullable<typeof rateSheet>["cells"][number]["breakdown"] | undefined;
  const rateLookup = new Map<string, { rate: number; breakdown: CellBreakdown }>();
  if (rateSheet) {
    for (const cell of rateSheet.cells) {
      rateLookup.set(`${cell.roomTypeId}:${cell.mealBasisId}:${cell.seasonId}`, {
        rate: cell.rate,
        breakdown: cell.breakdown,
      });
    }
  }

  return (
    <div className="space-y-6">
      {/* Rate Matrix */}
      <Card>
        <CardHeader>
          <CardTitle>Rate Matrix (Per Person in Double / Per Night)</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-6 text-center text-muted-foreground">
              Computing rates...
            </div>
          ) : rateSheet ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[250px]">Room Type / Meal Plan</TableHead>
                  {rateSheet.seasons.map((s) => (
                    <TableHead key={s.id} className="text-right text-xs">
                      {format(new Date(s.dateFrom), "dd MMM")} — {format(new Date(s.dateTo), "dd MMM yyyy")}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {rateSheet.roomTypes.map((rt) => (
                  <Fragment key={`rt-${rt.id}`}>
                    <TableRow className="bg-muted/50">
                      <TableCell
                        colSpan={rateSheet.seasons.length + 1}
                        className="font-semibold"
                      >
                        {rt.name}
                        {rt.isBase && (
                          <Badge variant="secondary" className="ml-2">
                            Base
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                    {rateSheet.mealBases.map((mb) => (
                      <TableRow key={`${rt.id}:${mb.id}`}>
                        <TableCell className="pl-8">
                          {mb.name}
                          {mb.isBase && (
                            <Badge variant="outline" className="ml-2 text-xs">
                              Base
                            </Badge>
                          )}
                        </TableCell>
                        {rateSheet.seasons.map((s) => {
                          const cell = rateLookup.get(`${rt.id}:${mb.id}:${s.id}`);
                          const bd = cell?.breakdown;
                          return (
                            <TableCell key={s.id} className="text-right align-top">
                              {bd ? (
                                <div className="space-y-0.5 text-xs font-mono">
                                  <div className="flex justify-between gap-4">
                                    <span className="text-muted-foreground">Base</span>
                                    <span>{formatCurrency(bd.baseRate)}</span>
                                  </div>
                                  {bd.roomTypeSupplement && bd.roomTypeSupplement.amount !== 0 && (
                                    <div className="flex justify-between gap-4">
                                      <span className="text-muted-foreground">Room</span>
                                      <span>{bd.roomTypeSupplement.amount > 0 ? "+" : ""}{formatCurrency(bd.roomTypeSupplement.amount)}</span>
                                    </div>
                                  )}
                                  {bd.mealSupplement && bd.mealSupplement.amount !== 0 && (
                                    <div className="flex justify-between gap-4">
                                      <span className="text-muted-foreground">Meal</span>
                                      <span>{bd.mealSupplement.amount > 0 ? "+" : ""}{formatCurrency(bd.mealSupplement.amount)}</span>
                                    </div>
                                  )}
                                  {bd.occupancySupplement && bd.occupancySupplement.amount !== 0 && (
                                    <div className="flex justify-between gap-4">
                                      <span className="text-muted-foreground">Occ.</span>
                                      <span>{bd.occupancySupplement.amount > 0 ? "+" : ""}{formatCurrency(bd.occupancySupplement.amount)}</span>
                                    </div>
                                  )}
                                  <div className="border-t pt-0.5 flex justify-between gap-4 font-semibold text-sm">
                                    <span>Total</span>
                                    <span>{formatCurrency(bd.adultTotalPerNight)}</span>
                                  </div>
                                </div>
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </TableCell>
                          );
                        })}
                      </TableRow>
                    ))}
                  </Fragment>
                ))}
              </TableBody>
            </Table>
          ) : null}
        </CardContent>
      </Card>

      {/* Interactive Calculator */}
      <Card>
        <CardHeader>
          <CardTitle>Rate Calculator</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Row 1: Arrival, Departure, Nights, Adults */}
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <div>
              <label className="text-sm font-medium">Arrival Date</label>
              <Input
                type="date"
                value={arrivalDate}
                onChange={(e) => setArrivalDate(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Departure Date</label>
              <Input
                type="date"
                value={departureDate}
                onChange={(e) => setDepartureDate(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Nights</label>
              <Input
                type="number"
                value={calcNights}
                readOnly
                className="bg-muted"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Adults</label>
              <Input
                type="number"
                min={1}
                max={6}
                value={adults}
                onChange={(e) => setAdults(Math.max(1, Math.min(6, Number(e.target.value) || 1)))}
              />
            </div>
          </div>

          {/* Row 2: Children, Meal Plan, Extra Bed, Booking Date */}
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <div>
              <label className="text-sm font-medium">Children</label>
              <Input
                type="number"
                min={0}
                max={4}
                value={childCount}
                onChange={(e) => setChildCount(Math.max(0, Math.min(4, Number(e.target.value) || 0)))}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Meal Plan</label>
              <Select value={mealBasisId} onValueChange={setMealBasisId}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {contract.mealBases.map((mb) => (
                    <SelectItem key={mb.mealBasisId} value={mb.mealBasisId}>
                      {mb.mealBasis.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end gap-2 pb-2">
              <Checkbox
                id="extraBed"
                checked={extraBed}
                onCheckedChange={(checked) => setExtraBed(checked === true)}
              />
              <label htmlFor="extraBed" className="text-sm font-medium">
                Extra Bed
              </label>
            </div>
            <div>
              <label className="text-sm font-medium">Booking Date</label>
              <Input
                type="date"
                value={bookingDate}
                onChange={(e) => setBookingDate(e.target.value)}
              />
            </div>
          </div>

          {/* Row 3: Child DOBs (dynamic) */}
          {childCount > 0 && (
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              {Array.from({ length: childCount }).map((_, idx) => (
                <div key={idx}>
                  <label className="text-sm font-medium">Child {idx + 1} DOB</label>
                  <Input
                    type="date"
                    value={childDobs[idx] ?? ""}
                    onChange={(e) =>
                      setChildDobs((prev) =>
                        prev.map((d, i) => (i === idx ? e.target.value : d)),
                      )
                    }
                  />
                </div>
              ))}
            </div>
          )}

          <Separator />

          {/* Results */}
          {isCalculating ? (
            <div className="py-4 text-center text-muted-foreground">
              Calculating...
            </div>
          ) : multiResult ? (
            <div className="space-y-4">
              {/* Header info */}
              <div className="flex flex-wrap items-center gap-3 text-sm">
                {multiResult.seasonLabel && (
                  <Badge variant="outline">
                    Season: {multiResult.seasonLabel}
                  </Badge>
                )}
                {multiResult.nights > 0 && (
                  <Badge variant="outline">
                    {multiResult.nights} night{multiResult.nights !== 1 ? "s" : ""}
                  </Badge>
                )}
                {multiResult.resolvedChildren.map((rc, idx) => (
                  <Badge key={idx} variant="secondary">
                    Child {idx + 1}: age {rc.ageAtCheckIn} ({rc.category})
                  </Badge>
                ))}
              </div>

              {/* Room type results */}
              {multiResult.results.length === 0 ? (
                <div className="rounded-lg border border-dashed p-6 text-center text-muted-foreground">
                  {!multiResult.seasonId
                    ? "No season matches the selected arrival date."
                    : "No room types match the selected occupancy criteria. Check that occupancy tables are configured for the requested combination."}
                </div>
              ) : (
                <div className="space-y-3">
                  {multiResult.results.map((room) => {
                    const bd = room.breakdown;
                    const cc = contract.baseCurrency.code;
                    const fmt = (n: number) => `${cc} ${formatCurrency(n)}`;
                    const isPP = bd.rateBasis === "PER_PERSON";
                    const adultRoomPerNight = isPP ? bd.adultTotalPerNight * room.occupancyMatch.adults : bd.adultTotalPerNight;

                    return (
                    <details key={room.roomTypeId} className="group rounded-lg border">
                      <summary className="flex cursor-pointer items-center justify-between p-4 hover:bg-muted/50">
                        <div>
                          <span className="font-semibold">{room.roomTypeName}</span>
                          <span className="ml-2 text-xs text-muted-foreground">
                            ({room.occupancyMatch.adults}A
                            {room.occupancyMatch.children > 0 && `+${room.occupancyMatch.children}C`}
                            {room.occupancyMatch.infants > 0 && `+${room.occupancyMatch.infants}I`}
                            {room.occupancyMatch.extraBeds > 0 && `+${room.occupancyMatch.extraBeds}EB`})
                          </span>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold">
                            {fmt(room.totalPerRoomAfterOffers)}
                          </div>
                          {room.totalPerRoom !== room.totalPerRoomAfterOffers && (
                            <div className="text-xs text-muted-foreground line-through">
                              {fmt(room.totalPerRoom)}
                            </div>
                          )}
                          <div className="text-xs text-muted-foreground">
                            {fmt(room.roomTotalPerNight)} / night
                          </div>
                        </div>
                      </summary>
                      <div className="border-t p-4">
                        <div className="rounded-lg border p-4 space-y-0">
                          {/* Section 1: Per-person adult rate build-up */}
                          <p className="text-xs font-medium text-muted-foreground mb-1">
                            {isPP ? "Adult Rate (per person / night)" : "Room Rate (per night)"}
                          </p>
                          <div className="space-y-1">
                            <div className="flex justify-between text-sm">
                              <span>{bd.baseRateLabel}</span>
                              <span className="font-mono">{fmt(bd.baseRate)}</span>
                            </div>
                            {bd.roomTypeSupplement && bd.roomTypeSupplement.amount !== 0 && (
                              <div className="flex justify-between text-sm">
                                <span>
                                  <span className="text-muted-foreground">{bd.roomTypeSupplement.amount > 0 ? "+" : ""} </span>
                                  Room Type ({bd.roomTypeSupplement.label})
                                </span>
                                <span className="font-mono">{fmt(bd.roomTypeSupplement.amount)}</span>
                              </div>
                            )}
                            {bd.mealSupplement && bd.mealSupplement.amount !== 0 && (
                              <div className="flex justify-between text-sm">
                                <span>
                                  <span className="text-muted-foreground">{bd.mealSupplement.amount >= 0 ? "+" : ""} </span>
                                  Meal Plan ({bd.mealSupplement.label})
                                </span>
                                <span className="font-mono">{fmt(bd.mealSupplement.amount)}</span>
                              </div>
                            )}
                            {bd.occupancySupplement && bd.occupancySupplement.amount !== 0 && (
                              <div className="flex justify-between text-sm">
                                <span>
                                  <span className="text-muted-foreground">{bd.occupancySupplement.amount >= 0 ? "+" : ""} </span>
                                  {bd.occupancySupplement.label}
                                </span>
                                <span className="font-mono">{fmt(bd.occupancySupplement.amount)}</span>
                              </div>
                            )}
                            {bd.extraBedSupplement && bd.extraBedSupplement.amount !== 0 && (
                              <div className="flex justify-between text-sm">
                                <span>
                                  <span className="text-muted-foreground">+ </span>
                                  {bd.extraBedSupplement.label}
                                </span>
                                <span className="font-mono">{fmt(bd.extraBedSupplement.amount)}</span>
                              </div>
                            )}
                          </div>

                          <Separator className="my-2" />

                          <div className="flex justify-between text-sm font-semibold">
                            <span>{isPP ? "Per Person / Night" : "Room Rate / Night"}</span>
                            <span className="font-mono">{fmt(bd.adultTotalPerNight)}</span>
                          </div>

                          {/* Section 2: Multiply by adults (PER_PERSON only) */}
                          {isPP && room.occupancyMatch.adults > 0 && (
                            <>
                              <Separator className="my-2" />
                              <p className="text-xs font-medium text-muted-foreground mb-1">Room Calculation</p>
                              <div className="flex justify-between text-sm">
                                <span>{fmt(bd.adultTotalPerNight)} x {room.occupancyMatch.adults} adult{room.occupancyMatch.adults !== 1 ? "s" : ""}</span>
                                <span className="font-mono">{fmt(adultRoomPerNight)}</span>
                              </div>
                            </>
                          )}

                          {/* Section 3: Child charges */}
                          {bd.childCharges.length > 0 && (
                            <>
                              {!(isPP && room.occupancyMatch.adults > 0) && <Separator className="my-2" />}
                              <div className="mt-1 space-y-1">
                                <p className="text-xs font-medium text-muted-foreground">Children</p>
                                {bd.childCharges.map((chc, idx) => (
                                  <div key={idx} className="flex justify-between text-sm">
                                    <span>
                                      <span className="text-muted-foreground">+ </span>
                                      {chc.label}
                                      {chc.isFree && (
                                        <Badge variant="secondary" className="ml-2 text-xs">Free</Badge>
                                      )}
                                    </span>
                                    <span className="font-mono">{fmt(chc.amount)}</span>
                                  </div>
                                ))}
                              </div>
                            </>
                          )}

                          {/* Section 4: Room total per night */}
                          <Separator className="my-2" />
                          <div className="flex justify-between font-semibold">
                            <span>Room Total / Night</span>
                            <span className="font-mono">{fmt(room.roomTotalPerNight)}</span>
                          </div>

                          {/* Section 5: Multiply by nights */}
                          {multiResult.nights > 1 && (
                            <div className="mt-1 flex justify-between text-sm">
                              <span className="text-muted-foreground">
                                {fmt(room.roomTotalPerNight)} x {multiResult.nights} nights
                              </span>
                              <span className="font-mono font-semibold">{fmt(room.totalPerRoom)}</span>
                            </div>
                          )}

                          <Separator className="my-2" />
                          <div className="flex justify-between text-lg font-bold">
                            <span>Total Stay</span>
                            <span className="font-mono">{fmt(room.totalPerRoom)}</span>
                          </div>

                          {/* Section 6: Special offers */}
                          {bd.offerDiscounts.length > 0 && (
                            <>
                              <Separator className="my-2" />
                              <p className="text-xs font-medium text-muted-foreground">Special Offers</p>
                              <div className="mt-1 space-y-1">
                                {bd.offerDiscounts.map((od, idx) => {
                                  const isEligible = od.discount > 0;
                                  const roomDiscount = bd.totalStay > 0
                                    ? od.discount * (room.totalPerRoom / bd.totalStay)
                                    : 0;
                                  return (
                                    <div
                                      key={idx}
                                      className={`flex justify-between text-sm ${isEligible ? "text-green-600" : "text-muted-foreground"}`}
                                    >
                                      <span>
                                        {isEligible ? "−" : ""} {od.offerName}
                                        <span className="ml-1 text-xs">({od.description})</span>
                                      </span>
                                      <span className="font-mono">
                                        {isEligible ? `−${fmt(roomDiscount)}` : "—"}
                                      </span>
                                    </div>
                                  );
                                })}
                              </div>

                              {room.totalPerRoomAfterOffers !== room.totalPerRoom && (
                                <>
                                  <Separator className="my-2" />
                                  <div className="flex justify-between text-lg font-bold text-green-600">
                                    <span>Final Total</span>
                                    <span className="font-mono">{fmt(room.totalPerRoomAfterOffers)}</span>
                                  </div>
                                </>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    </details>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            <div className="py-4 text-center text-sm text-muted-foreground">
              Enter arrival &amp; departure dates with a meal plan to search available rooms.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Rate Breakdown Display ──────────────────────────────

type BreakdownData = {
  baseRate: number;
  baseRateLabel: string;
  roomTypeSupplement: { label: string; amount: number } | null;
  mealSupplement: { label: string; amount: number } | null;
  occupancySupplement: { label: string; amount: number } | null;
  extraBedSupplement: { label: string; amount: number } | null;
  childCharges: { category: string; position: number; amount: number; isFree: boolean; label: string }[];
  adultTotalPerNight: number;
  childTotalPerNight: number;
  totalPerNight: number;
  totalStay: number;
  offerDiscounts: { offerName: string; offerType: string; discount: number; description: string }[];
  totalStayBeforeOffers: number;
  totalStayAfterOffers: number;
  nights: number;
  rateBasis: string;
};

function RateBreakdownDisplay({
  breakdown,
  currencyCode,
}: {
  breakdown: BreakdownData;
  currencyCode: string;
}) {
  const fmt = (n: number) => `${currencyCode} ${formatCurrency(n)}`;

  const lines: { label: string; amount: number; prefix?: string }[] = [
    { label: breakdown.baseRateLabel, amount: breakdown.baseRate },
  ];

  if (breakdown.roomTypeSupplement) {
    lines.push({
      label: `Room Type (${breakdown.roomTypeSupplement.label})`,
      amount: breakdown.roomTypeSupplement.amount,
      prefix: "+",
    });
  }
  if (breakdown.mealSupplement) {
    lines.push({
      label: `Meal Plan (${breakdown.mealSupplement.label})`,
      amount: breakdown.mealSupplement.amount,
      prefix: breakdown.mealSupplement.amount < 0 ? "" : "+",
    });
  }
  if (breakdown.occupancySupplement) {
    lines.push({
      label: breakdown.occupancySupplement.label,
      amount: breakdown.occupancySupplement.amount,
      prefix: breakdown.occupancySupplement.amount < 0 ? "" : "+",
    });
  }
  if (breakdown.extraBedSupplement) {
    lines.push({
      label: breakdown.extraBedSupplement.label,
      amount: breakdown.extraBedSupplement.amount,
      prefix: "+",
    });
  }

  return (
    <div className="rounded-lg border p-4">
      <div className="space-y-1">
        {lines.map((line, idx) => (
          <div key={idx} className="flex justify-between text-sm">
            <span>
              {line.prefix && (
                <span className="text-muted-foreground">{line.prefix} </span>
              )}
              {line.label}
            </span>
            <span className="font-mono">{fmt(line.amount)}</span>
          </div>
        ))}
      </div>

      <Separator className="my-2" />

      <div className="flex justify-between text-sm font-semibold">
        <span>Adult Total / Night</span>
        <span className="font-mono">{fmt(breakdown.adultTotalPerNight)}</span>
      </div>

      {breakdown.childCharges.length > 0 && (
        <>
          <div className="mt-3 space-y-1">
            <p className="text-xs font-medium text-muted-foreground">Children</p>
            {breakdown.childCharges.map((cc, idx) => (
              <div key={idx} className="flex justify-between text-sm">
                <span>
                  {cc.label}
                  {cc.isFree && (
                    <Badge variant="secondary" className="ml-2 text-xs">
                      Free
                    </Badge>
                  )}
                </span>
                <span className="font-mono">{fmt(cc.amount)}</span>
              </div>
            ))}
          </div>

          <Separator className="my-2" />

          <div className="flex justify-between text-sm font-semibold">
            <span>Child Total / Night</span>
            <span className="font-mono">{fmt(breakdown.childTotalPerNight)}</span>
          </div>
        </>
      )}

      <Separator className="my-2" />

      <div className="flex justify-between font-semibold">
        <span>Total Per Night</span>
        <span className="font-mono">{fmt(breakdown.totalPerNight)}</span>
      </div>

      {breakdown.nights > 1 && (
        <div className="mt-1 flex justify-between text-lg font-bold">
          <span>Total Stay ({breakdown.nights} nights)</span>
          <span className="font-mono">{fmt(breakdown.totalStay)}</span>
        </div>
      )}

      {breakdown.offerDiscounts.length > 0 && (
        <>
          <Separator className="my-2" />
          <p className="text-xs font-medium text-muted-foreground">Special Offers</p>
          <div className="mt-1 space-y-1">
            {breakdown.offerDiscounts.map((od, idx) => {
              const isEligible = od.discount > 0;
              return (
                <div
                  key={idx}
                  className={`flex justify-between text-sm ${isEligible ? "text-green-600" : "text-muted-foreground"}`}
                >
                  <span>
                    {isEligible ? "−" : ""} {od.offerName}
                    <span className="ml-1 text-xs">({od.description})</span>
                  </span>
                  <span className="font-mono">
                    {isEligible ? `−${fmt(od.discount)}` : "—"}
                  </span>
                </div>
              );
            })}
          </div>

          {breakdown.totalStayAfterOffers !== breakdown.totalStayBeforeOffers && (
            <>
              <Separator className="my-2" />
              <div className="flex justify-between text-lg font-bold text-green-600">
                <span>Final Total</span>
                <span className="font-mono">{fmt(breakdown.totalStayAfterOffers)}</span>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}

// ─── Markets Tab ────────────────────────────────────────────

function MarketsTab({ contractId }: { contractId: string }) {
  const utils = trpc.useUtils();
  const { data: assignedRaw } =
    trpc.contracting.market.listByContract.useQuery({ contractId });
  const assigned = assignedRaw ?? [];
  const { data: allMarkets } = trpc.contracting.market.list.useQuery();
  const markets = allMarkets ?? [];

  const assignMutation = trpc.contracting.market.assign.useMutation({
    onSuccess: () =>
      utils.contracting.market.listByContract.invalidate({ contractId }),
  });
  const unassignMutation = trpc.contracting.market.unassign.useMutation({
    onSuccess: () =>
      utils.contracting.market.listByContract.invalidate({ contractId }),
  });
  const [showAssign, setShowAssign] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const assignedMarketIds = new Set(assigned.map((a) => a.market.id));
  const availableMarkets = markets.filter(
    (m) => !assignedMarketIds.has(m.id) && m.active,
  );

  function handleAssign() {
    if (selectedIds.length === 0) return;
    assignMutation.mutate(
      { contractId, marketIds: selectedIds },
      {
        onSuccess: () => {
          setShowAssign(false);
          setSelectedIds([]);
        },
      },
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Markets</h3>
          <p className="text-sm text-muted-foreground">
            Assign source-country markets to this contract.
          </p>
        </div>
        <div className="flex gap-2">
          {markets.length > 0 && (
            <Button size="sm" onClick={() => setShowAssign(true)}>
              Add Market
            </Button>
          )}
        </div>
      </div>

      {assigned.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            {markets.length === 0
              ? "No markets defined. Go to Settings > Contracting to create markets."
              : "No markets assigned to this contract yet."}
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-wrap gap-2">
          {assigned.map((cm) => (
            <Badge
              key={cm.id}
              variant="secondary"
              className="gap-1 py-1.5 pl-3 pr-1 text-sm"
            >
              {cm.market.name} ({cm.market.code})
              <Button
                variant="ghost"
                size="sm"
                className="ml-1 h-5 w-5 p-0"
                onClick={() =>
                  unassignMutation.mutate({
                    contractId,
                    marketId: cm.market.id,
                  })
                }
                disabled={unassignMutation.isPending}
              >
                x
              </Button>
            </Badge>
          ))}
        </div>
      )}

      {/* Assign Dialog */}
      <Dialog open={showAssign} onOpenChange={setShowAssign}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Markets</DialogTitle>
            <DialogDescription>
              Select markets to assign to this contract.
            </DialogDescription>
          </DialogHeader>
          {availableMarkets.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              All markets are already assigned, or no markets have been created yet.
              Go to Settings &gt; Contracting to manage markets.
            </p>
          ) : (
            <div className="max-h-64 space-y-2 overflow-y-auto">
              {availableMarkets.map((m) => (
                <label
                  key={m.id}
                  className="flex items-center gap-2 rounded border p-2 text-sm hover:bg-muted/50"
                >
                  <Checkbox
                    checked={selectedIds.includes(m.id)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setSelectedIds([...selectedIds, m.id]);
                      } else {
                        setSelectedIds(selectedIds.filter((id) => id !== m.id));
                      }
                    }}
                  />
                  {m.name} ({m.code})
                </label>
              ))}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAssign(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleAssign}
              disabled={selectedIds.length === 0 || assignMutation.isPending}
            >
              {assignMutation.isPending
                ? "Assigning..."
                : `Assign (${selectedIds.length})`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}

// ─── Child Policies Tab ─────────────────────────────────────

type ContractChildPolicyData = {
  id: string;
  contractId: string;
  category: string;
  ageFrom: number;
  ageTo: number;
  label: string;
  freeInSharing: boolean;
  maxFreePerRoom: number;
  extraBedAllowed: boolean;
  mealsIncluded: boolean;
  notes: string | null;
};

type HotelChildPolicyData = {
  id: string;
  category: string;
  ageFrom: number;
  ageTo: number;
  label: string;
  freeInSharing: boolean;
  maxFreePerRoom: number;
  extraBedAllowed: boolean;
  mealsIncluded: boolean;
  notes: string | null;
};

function ChildPoliciesTab({
  contractId,
  hotelId,
}: {
  contractId: string;
  hotelId: string;
}) {
  const utils = trpc.useUtils();
  const { data: rawHotelPolicies } =
    trpc.contracting.childPolicy.list.useQuery({ hotelId });
  const hotelPolicies = (rawHotelPolicies ?? []) as unknown as HotelChildPolicyData[];

  const { data: rawContractPolicies } =
    trpc.contracting.contractChildPolicy.listByContract.useQuery({ contractId });
  const contractPolicies = (rawContractPolicies ?? []) as unknown as ContractChildPolicyData[];

  const createMutation = trpc.contracting.contractChildPolicy.create.useMutation({
    onSuccess: () => utils.contracting.contractChildPolicy.listByContract.invalidate({ contractId }),
  });
  const updateMutation = trpc.contracting.contractChildPolicy.update.useMutation({
    onSuccess: () => utils.contracting.contractChildPolicy.listByContract.invalidate({ contractId }),
  });
  const deleteMutation = trpc.contracting.contractChildPolicy.delete.useMutation({
    onSuccess: () => utils.contracting.contractChildPolicy.listByContract.invalidate({ contractId }),
  });

  const [showDialog, setShowDialog] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    category: "CHILD" as string,
    ageFrom: 0,
    ageTo: 0,
    label: "",
    freeInSharing: false,
    maxFreePerRoom: 0,
    extraBedAllowed: true,
    mealsIncluded: false,
    notes: "",
  });

  function openCreateDialog() {
    setEditingId(null);
    setFormData({
      category: "CHILD",
      ageFrom: 0,
      ageTo: 0,
      label: "",
      freeInSharing: false,
      maxFreePerRoom: 0,
      extraBedAllowed: true,
      mealsIncluded: false,
      notes: "",
    });
    setShowDialog(true);
  }

  function openEditDialog(cp: ContractChildPolicyData) {
    setEditingId(cp.id);
    setFormData({
      category: cp.category,
      ageFrom: cp.ageFrom,
      ageTo: cp.ageTo,
      label: cp.label,
      freeInSharing: cp.freeInSharing,
      maxFreePerRoom: cp.maxFreePerRoom,
      extraBedAllowed: cp.extraBedAllowed,
      mealsIncluded: cp.mealsIncluded,
      notes: cp.notes ?? "",
    });
    setShowDialog(true);
  }

  function handleSave() {
    if (editingId) {
      updateMutation.mutate(
        {
          id: editingId,
          contractId,
          ageFrom: formData.ageFrom,
          ageTo: formData.ageTo,
          label: formData.label,
          freeInSharing: formData.freeInSharing,
          maxFreePerRoom: formData.maxFreePerRoom,
          extraBedAllowed: formData.extraBedAllowed,
          mealsIncluded: formData.mealsIncluded,
          notes: formData.notes || null,
        },
        { onSuccess: () => setShowDialog(false) },
      );
    } else {
      createMutation.mutate(
        {
          contractId,
          category: formData.category as "INFANT" | "CHILD" | "TEEN",
          ageFrom: formData.ageFrom,
          ageTo: formData.ageTo,
          label: formData.label,
          freeInSharing: formData.freeInSharing,
          maxFreePerRoom: formData.maxFreePerRoom,
          extraBedAllowed: formData.extraBedAllowed,
          mealsIncluded: formData.mealsIncluded,
          notes: formData.notes || null,
        },
        { onSuccess: () => setShowDialog(false) },
      );
    }
  }

  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-6">
      {/* Hotel Defaults (read-only reference) */}
      <div>
        <h3 className="mb-3 text-lg font-semibold">Hotel Defaults</h3>
        {hotelPolicies.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No child policies defined for this hotel.
          </p>
        ) : (
          <div className="grid gap-4 md:grid-cols-3">
            {hotelPolicies.map((hp) => (
              <Card key={hp.id} className="opacity-70">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">
                    {CHILD_AGE_CATEGORY_LABELS[hp.category] ?? hp.category}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-1 text-xs text-muted-foreground">
                  <div>Label: {hp.label}</div>
                  <div>Age: {hp.ageFrom}–{hp.ageTo}</div>
                  <div>Free in Sharing: {hp.freeInSharing ? "Yes" : "No"}{hp.freeInSharing ? ` (max ${hp.maxFreePerRoom}/room)` : ""}</div>
                  <div>Extra Bed: {hp.extraBedAllowed ? "Allowed" : "Not Allowed"}</div>
                  <div>Meals: {hp.mealsIncluded ? "Included" : "Not Included"}</div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Separator />

      {/* Contract Child Policies — multiple rows per category allowed */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">Contract Child Policies</h3>
            <p className="text-sm text-muted-foreground">
              Define child policies for this contract. Multiple policies per category are allowed
              (e.g., Child 2-5 free, Child 6-11 paid).
            </p>
          </div>
          <Button size="sm" onClick={openCreateDialog}>
            Add Policy
          </Button>
        </div>

        {contractPolicies.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-sm text-muted-foreground">
              No child policies defined for this contract yet.
            </CardContent>
          </Card>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Category</TableHead>
                <TableHead>Label</TableHead>
                <TableHead>Age Range</TableHead>
                <TableHead>Free in Sharing</TableHead>
                <TableHead>Extra Bed</TableHead>
                <TableHead>Meals</TableHead>
                <TableHead className="w-[140px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {contractPolicies.map((cp) => (
                <TableRow key={cp.id}>
                  <TableCell className="font-medium">
                    {CHILD_AGE_CATEGORY_LABELS[cp.category] ?? cp.category}
                  </TableCell>
                  <TableCell>{cp.label}</TableCell>
                  <TableCell>{cp.ageFrom}–{cp.ageTo}</TableCell>
                  <TableCell>
                    {cp.freeInSharing ? (
                      <span>Yes (max {cp.maxFreePerRoom})</span>
                    ) : (
                      "No"
                    )}
                  </TableCell>
                  <TableCell>{cp.extraBedAllowed ? "Yes" : "No"}</TableCell>
                  <TableCell>{cp.mealsIncluded ? "Yes" : "No"}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openEditDialog(cp)}
                      >
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => deleteMutation.mutate({ id: cp.id, contractId })}
                        disabled={deleteMutation.isPending}
                      >
                        Delete
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Add/Edit Policy Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingId ? "Edit Child Policy" : "Add Child Policy"}
            </DialogTitle>
            <DialogDescription>
              {editingId
                ? "Update this child policy."
                : "Add a new child policy for this contract."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {!editingId && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Category</label>
                <Select
                  value={formData.category}
                  onValueChange={(val) => setFormData({ ...formData, category: val })}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="INFANT">Infant</SelectItem>
                    <SelectItem value="CHILD">Child</SelectItem>
                    <SelectItem value="TEEN">Teen</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-2">
              <label className="text-sm font-medium">Label</label>
              <Input
                value={formData.label}
                onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                placeholder="e.g. Child 2-5 free"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Age From</label>
                <Input
                  type="number"
                  min={0}
                  value={formData.ageFrom}
                  onChange={(e) =>
                    setFormData({ ...formData, ageFrom: parseInt(e.target.value) || 0 })
                  }
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Age To</label>
                <Input
                  type="number"
                  min={0}
                  value={formData.ageTo}
                  onChange={(e) =>
                    setFormData({ ...formData, ageTo: parseInt(e.target.value) || 0 })
                  }
                />
              </div>
            </div>
            {formData.ageTo < formData.ageFrom && (
              <p className="text-sm text-destructive">Age To must be &gt;= Age From</p>
            )}
            <div className="flex items-center gap-3">
              <Checkbox
                checked={formData.freeInSharing}
                onCheckedChange={(val) =>
                  setFormData({ ...formData, freeInSharing: !!val })
                }
              />
              <label className="text-sm">Free in Sharing</label>
            </div>
            {formData.freeInSharing && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Max Free Per Room</label>
                <Input
                  type="number"
                  min={0}
                  value={formData.maxFreePerRoom}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      maxFreePerRoom: parseInt(e.target.value) || 0,
                    })
                  }
                />
              </div>
            )}
            <div className="flex items-center gap-3">
              <Checkbox
                checked={formData.extraBedAllowed}
                onCheckedChange={(val) =>
                  setFormData({ ...formData, extraBedAllowed: !!val })
                }
              />
              <label className="text-sm">Extra Bed Allowed</label>
            </div>
            <div className="flex items-center gap-3">
              <Checkbox
                checked={formData.mealsIncluded}
                onCheckedChange={(val) =>
                  setFormData({ ...formData, mealsIncluded: !!val })
                }
              />
              <label className="text-sm">Meals Included</label>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Notes</label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={2}
              />
            </div>
            {(createMutation.error || updateMutation.error) && (
              <p className="text-sm text-destructive">
                {(createMutation.error ?? updateMutation.error)?.message}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={
                !formData.label.trim() ||
                formData.ageTo < formData.ageFrom ||
                isSaving
              }
            >
              {isSaving ? "Saving..." : editingId ? "Save Changes" : "Add Policy"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Cancellation Policy Tab ──────────────────────────────────

type CancellationPolicyData = {
  id: string;
  contractId: string;
  daysBefore: number;
  chargeType: string;
  chargeValue: string | number;
  description: string | null;
  sortOrder: number;
};

function CancellationPolicyTab({ contractId }: { contractId: string }) {
  const utils = trpc.useUtils();
  const { data: rawPolicies } =
    trpc.contracting.cancellationPolicy.listByContract.useQuery({ contractId });
  const policies = (rawPolicies ?? []) as unknown as CancellationPolicyData[];

  const createMutation = trpc.contracting.cancellationPolicy.create.useMutation({
    onSuccess: () =>
      utils.contracting.cancellationPolicy.listByContract.invalidate({ contractId }),
  });
  const updateMutation = trpc.contracting.cancellationPolicy.update.useMutation({
    onSuccess: () =>
      utils.contracting.cancellationPolicy.listByContract.invalidate({ contractId }),
  });
  const deleteMutation = trpc.contracting.cancellationPolicy.delete.useMutation({
    onSuccess: () =>
      utils.contracting.cancellationPolicy.listByContract.invalidate({ contractId }),
  });

  const [showDialog, setShowDialog] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    daysBefore: 0,
    chargeType: "PERCENTAGE" as string,
    chargeValue: 0,
    description: "",
  });

  function openCreate() {
    setEditingId(null);
    setForm({ daysBefore: 0, chargeType: "PERCENTAGE", chargeValue: 100, description: "" });
    setShowDialog(true);
  }

  function openEdit(p: CancellationPolicyData) {
    setEditingId(p.id);
    setForm({
      daysBefore: p.daysBefore,
      chargeType: p.chargeType,
      chargeValue: Number(p.chargeValue),
      description: p.description ?? "",
    });
    setShowDialog(true);
  }

  function handleSave() {
    if (editingId) {
      updateMutation.mutate(
        {
          id: editingId,
          daysBefore: form.daysBefore,
          chargeType: form.chargeType as "PERCENTAGE" | "FIXED" | "FIRST_NIGHT",
          chargeValue: form.chargeType === "FIRST_NIGHT" ? 0 : form.chargeValue,
          description: form.description || null,
        },
        { onSuccess: () => setShowDialog(false) },
      );
    } else {
      createMutation.mutate(
        {
          contractId,
          daysBefore: form.daysBefore,
          chargeType: form.chargeType as "PERCENTAGE" | "FIXED" | "FIRST_NIGHT",
          chargeValue: form.chargeType === "FIRST_NIGHT" ? 0 : form.chargeValue,
          description: form.description || null,
          sortOrder: policies.length,
        },
        { onSuccess: () => setShowDialog(false) },
      );
    }
  }

  function formatCharge(p: CancellationPolicyData) {
    if (p.chargeType === "FIRST_NIGHT") return "First Night";
    if (p.chargeType === "PERCENTAGE") return `${Number(p.chargeValue)}%`;
    return `${Number(p.chargeValue).toFixed(2)} (Fixed)`;
  }

  function formatSummary(p: CancellationPolicyData) {
    const charge = formatCharge(p);
    if (p.daysBefore === 0) return `Day of arrival / No-show: ${charge} charge`;
    return `Within ${p.daysBefore} day${p.daysBefore !== 1 ? "s" : ""}: ${charge} charge`;
  }

  const isPending = createMutation.isPending || updateMutation.isPending;
  const error = createMutation.error ?? updateMutation.error;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Cancellation Policy</h3>
          <p className="text-sm text-muted-foreground">
            Define penalty tiers based on days before check-in.
          </p>
        </div>
        <Button onClick={openCreate}>Add Tier</Button>
      </div>

      {policies.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            No cancellation policy tiers defined. Add tiers to specify penalties.
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="pt-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Days Before</TableHead>
                  <TableHead>Charge Type</TableHead>
                  <TableHead>Charge</TableHead>
                  <TableHead>Summary</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="w-[120px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {policies.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-mono">{p.daysBefore}</TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {CANCELLATION_CHARGE_TYPE_LABELS[p.chargeType] ?? p.chargeType}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono">{formatCharge(p)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatSummary(p)}
                    </TableCell>
                    <TableCell className="text-sm">{p.description ?? "—"}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button size="sm" variant="outline" onClick={() => openEdit(p)}>
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => deleteMutation.mutate({ id: p.id })}
                          disabled={deleteMutation.isPending}
                        >
                          Delete
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingId ? "Edit Cancellation Tier" : "Add Cancellation Tier"}
            </DialogTitle>
            <DialogDescription>
              Define the penalty for cancellations within a certain number of days before check-in.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Days Before Check-in</label>
              <Input
                type="number"
                min={0}
                value={form.daysBefore}
                onChange={(e) => setForm({ ...form, daysBefore: parseInt(e.target.value) || 0 })}
              />
              <p className="text-xs text-muted-foreground">
                0 = day of arrival / no-show
              </p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Charge Type</label>
              <Select
                value={form.chargeType}
                onValueChange={(val) => setForm({ ...form, chargeType: val })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PERCENTAGE">Percentage</SelectItem>
                  <SelectItem value="FIXED">Fixed Amount</SelectItem>
                  <SelectItem value="FIRST_NIGHT">First Night</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {form.chargeType !== "FIRST_NIGHT" && (
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  {form.chargeType === "PERCENTAGE" ? "Percentage (%)" : "Amount"}
                </label>
                <Input
                  type="number"
                  min={0}
                  step={form.chargeType === "PERCENTAGE" ? 1 : 0.01}
                  value={form.chargeValue}
                  onChange={(e) =>
                    setForm({ ...form, chargeValue: parseFloat(e.target.value) || 0 })
                  }
                />
              </div>
            )}
            <div className="space-y-2">
              <label className="text-sm font-medium">Description (optional)</label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={2}
              />
            </div>
            {error && <p className="text-sm text-destructive">{error.message}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isPending}>
              {isPending ? "Saving..." : editingId ? "Update" : "Add"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Activity Tab — Audit log timeline
// ---------------------------------------------------------------------------

const ACTION_ICONS: Record<string, string> = {
  CREATE: "plus-circle",
  UPDATE: "pencil",
  DELETE: "trash-2",
  POST: "send",
  PUBLISH: "check-circle",
  RESET_DRAFT: "rotate-ccw",
  CLONE: "copy",
};

const ACTION_COLORS: Record<string, string> = {
  CREATE: "bg-emerald-500",
  UPDATE: "bg-blue-500",
  DELETE: "bg-red-500",
  POST: "bg-amber-500",
  PUBLISH: "bg-green-600",
  RESET_DRAFT: "bg-slate-500",
  CLONE: "bg-violet-500",
};

function formatRelativeTime(date: Date | string) {
  const now = new Date();
  const d = new Date(date);
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return `${diffDay}d ago`;
  return format(d, "dd MMM yyyy HH:mm");
}

function TourOperatorsTab({ contractId }: { contractId: string }) {
  const utils = trpc.useUtils();
  const { data: assignedRaw } =
    trpc.contracting.tourOperator.listByContract.useQuery({ contractId });
  const assigned = assignedRaw ?? [];
  const { data: allTOs } = trpc.contracting.tourOperator.list.useQuery();
  const tourOperators = allTOs ?? [];

  const assignMutation = trpc.contracting.tourOperator.assignToContract.useMutation({
    onSuccess: () =>
      utils.contracting.tourOperator.listByContract.invalidate({ contractId }),
  });
  const unassignMutation = trpc.contracting.tourOperator.unassignFromContract.useMutation({
    onSuccess: () =>
      utils.contracting.tourOperator.listByContract.invalidate({ contractId }),
  });
  const [showAssign, setShowAssign] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const assignedTOIds = new Set(assigned.map((a) => a.tourOperator.id));
  const availableTOs = tourOperators.filter(
    (t) => !assignedTOIds.has(t.id) && t.active,
  );

  function handleAssign() {
    if (selectedIds.length === 0) return;
    assignMutation.mutate(
      { contractId, tourOperatorIds: selectedIds },
      {
        onSuccess: () => {
          setShowAssign(false);
          setSelectedIds([]);
        },
      },
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Tour Operators</h3>
          <p className="text-sm text-muted-foreground">
            Assign tour operators who can access this contract&apos;s rates and tariffs.
          </p>
        </div>
        <div className="flex gap-2">
          {tourOperators.length > 0 && (
            <Button size="sm" onClick={() => setShowAssign(true)}>
              Add Tour Operator
            </Button>
          )}
        </div>
      </div>

      {assigned.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            {tourOperators.length === 0
              ? "No tour operators defined. Go to Master Data > Tour Operators to create them."
              : "No tour operators assigned to this contract yet."}
          </CardContent>
        </Card>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Code</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Market</TableHead>
              <TableHead>Country</TableHead>
              <TableHead className="w-[80px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {assigned.map((a) => (
              <TableRow key={a.id}>
                <TableCell className="font-medium">{a.tourOperator.name}</TableCell>
                <TableCell className="font-mono">{a.tourOperator.code}</TableCell>
                <TableCell>
                  {a.tourOperator.contactPerson || a.tourOperator.email || "—"}
                </TableCell>
                <TableCell>{a.tourOperator.market?.name ?? "—"}</TableCell>
                <TableCell>{a.tourOperator.country?.name ?? "—"}</TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      unassignMutation.mutate({
                        contractId,
                        tourOperatorId: a.tourOperator.id,
                      })
                    }
                  >
                    <X className="size-3" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {/* Assign Dialog */}
      <Dialog open={showAssign} onOpenChange={setShowAssign}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Tour Operators</DialogTitle>
            <DialogDescription>
              Select tour operators to assign to this contract.
            </DialogDescription>
          </DialogHeader>
          {availableTOs.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">
              All active tour operators are already assigned.
            </p>
          ) : (
            <div className="max-h-64 overflow-y-auto space-y-1 py-2">
              {availableTOs.map((to) => (
                <label
                  key={to.id}
                  className="flex items-center gap-2 text-sm cursor-pointer hover:bg-muted/50 rounded px-2 py-1"
                >
                  <Checkbox
                    checked={selectedIds.includes(to.id)}
                    onCheckedChange={(checked) => {
                      setSelectedIds((prev) =>
                        checked
                          ? [...prev, to.id]
                          : prev.filter((id) => id !== to.id),
                      );
                    }}
                  />
                  <span className="font-medium">{to.name}</span>
                  <span className="text-muted-foreground font-mono">({to.code})</span>
                </label>
              ))}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAssign(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleAssign}
              disabled={selectedIds.length === 0 || assignMutation.isPending}
            >
              {assignMutation.isPending
                ? "Assigning..."
                : `Assign (${selectedIds.length})`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Special Meals Tab (Gala Dinners)
// ---------------------------------------------------------------------------

const OCCASION_LABELS: Record<string, string> = {
  NYE: "New Year's Eve",
  CHRISTMAS: "Christmas",
  EASTER: "Easter",
  CUSTOM: "Custom",
};

function SpecialMealsTab({ contractId }: { contractId: string }) {
  const utils = trpc.useUtils();
  const { data: meals, isLoading } =
    trpc.contracting.specialMeal.listByContract.useQuery({ contractId });

  const [showCreate, setShowCreate] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  // Create form state
  const [occasion, setOccasion] = useState<string>("NYE");
  const [customName, setCustomName] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [mandatory, setMandatory] = useState(true);
  const [adultPrice, setAdultPrice] = useState(0);
  const [childPrice, setChildPrice] = useState(0);
  const [teenPrice, setTeenPrice] = useState(0);
  const [infantPrice, setInfantPrice] = useState(0);
  const [notes, setNotes] = useState("");

  const createMutation = trpc.contracting.specialMeal.create.useMutation({
    onSuccess: () => {
      utils.contracting.specialMeal.listByContract.invalidate({ contractId });
      setShowCreate(false);
      resetForm();
    },
  });

  const deleteMutation = trpc.contracting.specialMeal.delete.useMutation({
    onSuccess: () => {
      utils.contracting.specialMeal.listByContract.invalidate({ contractId });
    },
  });

  function resetForm() {
    setOccasion("NYE");
    setCustomName("");
    setDateFrom("");
    setDateTo("");
    setMandatory(true);
    setAdultPrice(0);
    setChildPrice(0);
    setTeenPrice(0);
    setInfantPrice(0);
    setNotes("");
    setEditId(null);
  }

  function handleSubmit() {
    createMutation.mutate({
      contractId,
      occasion: occasion as "NYE" | "CHRISTMAS" | "EASTER" | "CUSTOM",
      customName: occasion === "CUSTOM" ? customName : undefined,
      dateFrom,
      dateTo,
      mandatory,
      adultPrice,
      childPrice: childPrice || undefined,
      teenPrice: teenPrice || undefined,
      infantPrice: infantPrice || undefined,
      notes: notes || undefined,
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Special Meals / Gala Dinners</h3>
        <Button size="sm" onClick={() => setShowCreate(true)}>
          <Plus className="mr-2 size-3" /> Add Special Meal
        </Button>
      </div>

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={(v) => { setShowCreate(v); if (!v) resetForm(); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Special Meal</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium">Occasion</label>
                <Select value={occasion} onValueChange={setOccasion}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NYE">New Year&apos;s Eve</SelectItem>
                    <SelectItem value="CHRISTMAS">Christmas</SelectItem>
                    <SelectItem value="EASTER">Easter</SelectItem>
                    <SelectItem value="CUSTOM">Custom</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {occasion === "CUSTOM" && (
                <div>
                  <label className="text-xs font-medium">Custom Name</label>
                  <Input value={customName} onChange={(e) => setCustomName(e.target.value)} />
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium">Date From</label>
                <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
              </div>
              <div>
                <label className="text-xs font-medium">Date To</label>
                <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium">Adult Price</label>
                <Input type="number" step="0.01" value={adultPrice} onChange={(e) => setAdultPrice(parseFloat(e.target.value) || 0)} />
              </div>
              <div>
                <label className="text-xs font-medium">Child Price</label>
                <Input type="number" step="0.01" value={childPrice} onChange={(e) => setChildPrice(parseFloat(e.target.value) || 0)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium">Teen Price</label>
                <Input type="number" step="0.01" value={teenPrice} onChange={(e) => setTeenPrice(parseFloat(e.target.value) || 0)} />
              </div>
              <div>
                <label className="text-xs font-medium">Infant Price</label>
                <Input type="number" step="0.01" value={infantPrice} onChange={(e) => setInfantPrice(parseFloat(e.target.value) || 0)} />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox id="mandatory" checked={mandatory} onCheckedChange={(v) => setMandatory(!!v)} />
              <label htmlFor="mandatory" className="text-sm">Mandatory (charged to all guests)</label>
            </div>
            <div>
              <label className="text-xs font-medium">Notes</label>
              <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional notes" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowCreate(false); resetForm(); }}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={createMutation.isPending || !dateFrom || !dateTo}>
              {createMutation.isPending ? "Creating..." : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Table */}
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : meals && meals.length > 0 ? (
        <Card>
          <CardContent className="pt-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Occasion</TableHead>
                  <TableHead>Dates</TableHead>
                  <TableHead>Mandatory</TableHead>
                  <TableHead className="text-right">Adult</TableHead>
                  <TableHead className="text-right">Child</TableHead>
                  <TableHead className="text-right">Teen</TableHead>
                  <TableHead className="text-right">Infant</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {meals.map((meal) => (
                  <TableRow key={meal.id}>
                    <TableCell className="font-medium">
                      {meal.occasion === "CUSTOM"
                        ? meal.customName || "Custom"
                        : OCCASION_LABELS[meal.occasion] || meal.occasion}
                    </TableCell>
                    <TableCell className="text-xs">
                      {new Date(meal.dateFrom).toLocaleDateString()} -{" "}
                      {new Date(meal.dateTo).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Badge variant={meal.mandatory ? "default" : ("secondary" as "default" | "secondary")}>
                        {meal.mandatory ? "Yes" : "No"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {parseFloat(meal.adultPrice.toString()).toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {meal.childPrice ? parseFloat(meal.childPrice.toString()).toFixed(2) : "—"}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {meal.teenPrice ? parseFloat(meal.teenPrice.toString()).toFixed(2) : "—"}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {meal.infantPrice ? parseFloat(meal.infantPrice.toString()).toFixed(2) : "—"}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-7 text-destructive"
                        onClick={() => deleteMutation.mutate({ id: meal.id })}
                      >
                        <X className="size-3" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No special meals configured. Click &quot;Add Special Meal&quot; to create one.
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Simulator Tab (Rate Verification)
// ---------------------------------------------------------------------------

function SimulatorTab({ contractId }: { contractId: string }) {
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [adults, setAdults] = useState(2);
  const [bookingDate, setBookingDate] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [showOffers, setShowOffers] = useState(true);
  const [runSim, setRunSim] = useState(false);

  const { data: simResult, isLoading: simLoading } =
    trpc.contracting.rateVerification.simulate.useQuery(
      {
        contractId,
        checkIn,
        checkOut,
        adults,
        childAges: [],
        bookingDate,
        showOffers,
      },
      { enabled: runSim && !!checkIn && !!checkOut },
    );

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Booking Simulator</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
            <div>
              <label className="text-xs font-medium text-muted-foreground">
                Check-in
              </label>
              <Input
                type="date"
                value={checkIn}
                onChange={(e) => {
                  setCheckIn(e.target.value);
                  setRunSim(false);
                }}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">
                Check-out
              </label>
              <Input
                type="date"
                value={checkOut}
                onChange={(e) => {
                  setCheckOut(e.target.value);
                  setRunSim(false);
                }}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">
                Adults
              </label>
              <Input
                type="number"
                min={1}
                max={6}
                value={adults}
                onChange={(e) => {
                  setAdults(parseInt(e.target.value) || 2);
                  setRunSim(false);
                }}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">
                Booking Date
              </label>
              <Input
                type="date"
                value={bookingDate}
                onChange={(e) => {
                  setBookingDate(e.target.value);
                  setRunSim(false);
                }}
              />
            </div>
            <div className="flex items-end">
              <Button
                onClick={() => setRunSim(true)}
                disabled={!checkIn || !checkOut || simLoading}
                className="w-full"
              >
                {simLoading ? "Simulating..." : "Simulate"}
              </Button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="showOffers"
              checked={showOffers}
              onCheckedChange={(v) => {
                setShowOffers(!!v);
                setRunSim(false);
              }}
            />
            <label htmlFor="showOffers" className="text-sm">
              Show offer eligibility
            </label>
          </div>
        </CardContent>
      </Card>

      {simResult && (
        <>
          {/* Warnings */}
          {simResult.warnings.length > 0 && (
            <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950/20">
              <CardContent className="pt-4">
                <p className="text-sm font-medium text-amber-700 dark:text-amber-400 mb-2">
                  Warnings ({simResult.warnings.length})
                </p>
                <ul className="space-y-1">
                  {simResult.warnings.map((w, i) => (
                    <li
                      key={i}
                      className="text-xs text-amber-600 dark:text-amber-500"
                    >
                      &bull; {w}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Summary */}
          <div className="grid gap-4 sm:grid-cols-4">
            <Card>
              <CardContent className="pt-4">
                <p className="text-xs text-muted-foreground">Nights</p>
                <p className="text-2xl font-bold">{simResult.nights}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <p className="text-xs text-muted-foreground">Guests</p>
                <p className="text-2xl font-bold">{simResult.adults} adults</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <p className="text-xs text-muted-foreground">Seasons Spanned</p>
                <p className="text-2xl font-bold">
                  {new Set(simResult.nightBreakdown.map((n) => n.seasonLabel)).size}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <p className="text-xs text-muted-foreground">Rate Basis</p>
                <p className="text-2xl font-bold">
                  {simResult.rateBasis === "PER_PERSON" ? "Per Person" : "Per Room"}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Rate Matrix */}
          <Card>
            <CardHeader>
              <CardTitle>Rate Matrix</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Room Type</TableHead>
                    <TableHead>Meal Plan</TableHead>
                    <TableHead className="text-right">Avg/Night</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {simResult.rateMatrix.map((row, idx) => (
                    <TableRow key={idx}>
                      <TableCell>
                        {row.roomTypeName}{" "}
                        <span className="text-xs text-muted-foreground">
                          ({row.roomTypeCode})
                        </span>
                      </TableCell>
                      <TableCell>
                        {row.mealBasisName}{" "}
                        <span className="text-xs text-muted-foreground">
                          ({row.mealCode})
                        </span>
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {row.avgPerNight.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right font-mono font-bold">
                        {row.totalRate.toFixed(2)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Offer Eligibility */}
          {simResult.offerEligibility.length > 0 && (() => {
            const eligible = simResult.offerEligibility.filter((o) => o.eligible);
            const ineligible = simResult.offerEligibility.filter((o) => !o.eligible);
            const combinable = eligible.filter((o) => o.combinable);
            const nonCombinable = eligible.filter((o) => !o.combinable);
            const bestNonCombinable = nonCombinable.length > 0
              ? nonCombinable.reduce((a, b) => a.discountValue > b.discountValue ? a : b)
              : null;

            return (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Offer Eligibility</CardTitle>
                    <div className="flex items-center gap-3 text-sm">
                      <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                        {eligible.length} eligible
                      </span>
                      <span className="text-muted-foreground">
                        {ineligible.length} ineligible
                      </span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Stacking Summary */}
                  {eligible.length > 0 && (
                    <div className="rounded-lg border bg-muted/30 p-3 text-sm space-y-1">
                      <p className="font-medium">Applied Offers:</p>
                      {combinable.length > 0 && (
                        <p className="text-emerald-600 dark:text-emerald-400">
                          Stacked (combinable): {combinable.map((o) => o.offerName).join(" + ")}
                        </p>
                      )}
                      {bestNonCombinable && (
                        <p className="text-blue-600 dark:text-blue-400">
                          Best non-combinable: {bestNonCombinable.offerName}{" "}
                          ({bestNonCombinable.discountType === "PERCENTAGE"
                            ? `${bestNonCombinable.discountValue}%`
                            : bestNonCombinable.discountValue.toFixed(2)})
                        </p>
                      )}
                      {nonCombinable.length > 1 && (
                        <p className="text-xs text-muted-foreground">
                          {nonCombinable.length - 1} other non-combinable offer{nonCombinable.length > 2 ? "s" : ""} excluded
                        </p>
                      )}
                    </div>
                  )}

                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-8" />
                        <TableHead>Offer</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Discount</TableHead>
                        <TableHead>Combinable</TableHead>
                        <TableHead>Details</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {simResult.offerEligibility.map((offer) => (
                        <TableRow
                          key={offer.offerId}
                          className={offer.eligible ? "" : "opacity-50"}
                        >
                          <TableCell>
                            {offer.eligible ? (
                              <span className="text-emerald-600 dark:text-emerald-400 text-lg">&#10003;</span>
                            ) : (
                              <span className="text-destructive text-lg">&#10007;</span>
                            )}
                          </TableCell>
                          <TableCell className="font-medium">
                            {offer.offerName}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {OFFER_TYPE_LABELS[offer.offerType] ?? offer.offerType.replace(/_/g, " ")}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-mono">
                            {offer.discountType === "PERCENTAGE"
                              ? `${offer.discountValue}%`
                              : offer.discountValue.toFixed(2)}
                          </TableCell>
                          <TableCell>
                            {offer.combinable ? (
                              <Badge variant="secondary" className="text-xs">Stackable</Badge>
                            ) : (
                              <Badge variant="outline" className="text-xs">Exclusive</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground max-w-[300px]">
                            {offer.reasons.join("; ")}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            );
          })()}
        </>
      )}
    </div>
  );
}

function ActivityTab({ contractId }: { contractId: string }) {
  const { data, isLoading } =
    trpc.contracting.auditLog.listByContract.useQuery({
      contractId,
      limit: 100,
    });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Activity Log</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-start gap-3">
              <div className="h-6 w-6 rounded-full bg-muted animate-pulse" />
              <div className="flex-1 space-y-1">
                <div className="h-4 w-3/4 rounded bg-muted animate-pulse" />
                <div className="h-3 w-1/3 rounded bg-muted animate-pulse" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  const items = data?.items ?? [];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Activity Log</CardTitle>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-6">
            No activity recorded yet.
          </p>
        ) : (
          <div className="space-y-0">
            {items.map((item, idx) => (
              <div
                key={item.id}
                className="flex items-start gap-3 py-3 border-b last:border-b-0"
              >
                <div
                  className={`mt-0.5 h-2 w-2 shrink-0 rounded-full ${ACTION_COLORS[item.action] ?? "bg-gray-400"}`}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm">{item.summary}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-muted-foreground">
                      {item.userName}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatRelativeTime(item.createdAt)}
                    </span>
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                      {item.entity}
                    </Badge>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
