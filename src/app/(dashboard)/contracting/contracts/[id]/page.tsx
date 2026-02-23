"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import type { z } from "zod";

import { ArrowLeftRight, FileSpreadsheet, Printer } from "lucide-react";

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
              window.open(`/contracting/contracts/${id}/print`, "_blank")
            }
          >
            <Printer className="mr-1 h-4 w-4" />
            Print / PDF
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
          <TabsTrigger value="rateSheet">Rate Sheet</TabsTrigger>
          <TabsTrigger value="specialOffers">Special Offers</TabsTrigger>
          <TabsTrigger value="allotments">Allotments</TabsTrigger>
          <TabsTrigger value="childPolicies">Child Policies</TabsTrigger>
          <TabsTrigger value="cancellation">Cancellation</TabsTrigger>
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
        <TabsContent value="rateSheet">
          <RateSheetTab contractId={id} contract={contract} />
        </TabsContent>
        <TabsContent value="specialOffers">
          <SpecialOffersTab contractId={id} />
        </TabsContent>
        <TabsContent value="allotments">
          <AllotmentsTab contractId={id} contract={contract} />
        </TabsContent>
        <TabsContent value="childPolicies">
          <ChildPoliciesTab contractId={id} hotelId={contract.hotelId} />
        </TabsContent>
        <TabsContent value="cancellation">
          <CancellationPolicyTab contractId={id} />
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
              <TableHead>Valid From</TableHead>
              <TableHead>Valid To</TableHead>
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
                <TableCell>{format(new Date(v.validFrom), "dd MMM yyyy")}</TableCell>
                <TableCell>{format(new Date(v.validTo), "dd MMM yyyy")}</TableCell>
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
    childPolicies.push({
      category: cat,
      bedding: "SHARING_WITH_PARENTS",
      label: `${catLabel} — Sharing`,
    });
    childPolicies.push({
      category: cat,
      bedding: "EXTRA_BED",
      label: `${catLabel} — Extra Bed`,
    });
    childPolicies.push({
      category: cat,
      bedding: "OWN_BED",
      label: `${catLabel} — Own Bed`,
    });
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
  combinable: boolean;
  active: boolean;
  sortOrder: number;
};

function SpecialOffersTab({ contractId }: { contractId: string }) {
  const utils = trpc.useUtils();
  const [showDialog, setShowDialog] = useState(false);
  const [editing, setEditing] = useState<SpecialOfferData | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [offerType, setOfferType] = useState("EARLY_BIRD");
  const [description, setDescription] = useState("");
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

  function resetForm() {
    setName("");
    setOfferType("EARLY_BIRD");
    setDescription("");
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
    setDescription(o.description ?? "");
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
    setCombinable(o.combinable);
    setShowDialog(true);
  }

  function handleSubmit() {
    const base = {
      name,
      offerType: offerType as "EARLY_BIRD" | "LONG_STAY" | "FREE_NIGHTS" | "HONEYMOON" | "GROUP_DISCOUNT",
      description: description || null,
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
          Add Offer
        </Button>
      </CardHeader>
      <CardContent>
        {typedOffers.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            No special offers configured. Click &quot;Add Offer&quot; to create one.
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

        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editing ? "Edit Offer" : "Add Special Offer"}</DialogTitle>
              <DialogDescription>
                {editing ? "Update offer details." : "Configure a new special offer for this contract."}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
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
              </div>

              <div>
                <label className="text-sm font-medium">Description</label>
                <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
              </div>

              {/* Discount */}
              {offerType !== "FREE_NIGHTS" && (
                <div className="grid grid-cols-2 gap-4">
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
                </div>
              )}

              {/* Free Nights */}
              {offerType === "FREE_NIGHTS" && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Stay Nights</label>
                    <Input type="number" value={stayNights} onChange={(e) => setStayNights(e.target.value)} min={2} placeholder="e.g. 7" />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Pay Nights</label>
                    <Input type="number" value={payNights} onChange={(e) => setPayNights(e.target.value)} min={1} placeholder="e.g. 5" />
                  </div>
                </div>
              )}

              {/* Conditional fields */}
              {offerType === "EARLY_BIRD" && (
                <div>
                  <label className="text-sm font-medium">Advance Booking Days</label>
                  <Input type="number" value={advanceBookDays} onChange={(e) => setAdvanceBookDays(e.target.value)} min={1} placeholder="e.g. 60" />
                </div>
              )}

              {offerType === "LONG_STAY" && (
                <div>
                  <label className="text-sm font-medium">Minimum Nights</label>
                  <Input type="number" value={minimumNights} onChange={(e) => setMinimumNights(e.target.value)} min={1} placeholder="e.g. 7" />
                </div>
              )}

              {offerType === "GROUP_DISCOUNT" && (
                <div>
                  <label className="text-sm font-medium">Minimum Rooms</label>
                  <Input type="number" value={minimumRooms} onChange={(e) => setMinimumRooms(e.target.value)} min={1} placeholder="e.g. 5" />
                </div>
              )}

              {/* Date range */}
              <div className="grid grid-cols-3 gap-4">
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
              </div>

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
    const items: { seasonId: string; roomTypeId: string; totalRooms: number; freeSale: boolean }[] = [];
    for (const rt of roomTypes) {
      for (const season of seasons) {
        const cell = grid[cellKey(rt.roomTypeId, season.id)];
        if (cell && (cell.freeSale || (cell.totalRooms && Number(cell.totalRooms) > 0))) {
          items.push({
            seasonId: season.id,
            roomTypeId: rt.roomTypeId,
            totalRooms: cell.freeSale ? 0 : (Number(cell.totalRooms) || 0),
            freeSale: cell.freeSale,
          });
        }
      }
    }
    saveMutation.mutate({ contractId, items });
  }

  function updateCell(key: string, field: "totalRooms" | "freeSale", value: string | boolean) {
    setGrid((prev) => ({
      ...prev,
      [key]: {
        ...prev[key] ?? { totalRooms: "", freeSale: false },
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
                  {s.name}
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
                  const cell = grid[key] ?? { totalRooms: "", freeSale: false };
                  return (
                    <TableCell key={s.id}>
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

  // Calculator state
  const [seasonId, setSeasonId] = useState(contract.seasons[0]?.id ?? "");
  const [roomTypeId, setRoomTypeId] = useState(contract.roomTypes[0]?.roomTypeId ?? "");
  const [mealBasisId, setMealBasisId] = useState(contract.mealBases[0]?.mealBasisId ?? "");
  const [adults, setAdults] = useState(2);
  const [nights, setNights] = useState(1);
  const [extraBed, setExtraBed] = useState(false);
  const [viewLabel, setViewLabel] = useState<string | null>(null);
  const [children, setChildren] = useState<{ category: string; bedding: string }[]>([]);
  const [bookingDate, setBookingDate] = useState("");
  const [checkInDate, setCheckInDate] = useState("");

  const { data: breakdown, isLoading: isCalculating } =
    trpc.contracting.rateCalculator.calculate.useQuery(
      {
        contractId,
        seasonId,
        roomTypeId,
        mealBasisId,
        adults,
        children: children.map((c) => ({
          category: c.category as "INFANT" | "CHILD" | "TEEN",
          bedding: c.bedding as "SHARING_WITH_PARENTS" | "EXTRA_BED" | "OWN_BED",
        })),
        extraBed,
        viewLabel,
        nights,
        bookingDate: bookingDate || null,
        checkInDate: checkInDate || null,
      },
      { enabled: !!seasonId && !!roomTypeId && !!mealBasisId },
    );

  if (contract.seasons.length === 0 || contract.baseRates.length === 0) {
    return (
      <div className="py-10 text-center text-muted-foreground">
        Configure seasons and base rates first to view the rate sheet.
      </div>
    );
  }

  // Build rate lookup for the grid
  const rateLookup = new Map<string, number>();
  if (rateSheet) {
    for (const cell of rateSheet.cells) {
      rateLookup.set(`${cell.roomTypeId}:${cell.mealBasisId}:${cell.seasonId}`, cell.rate);
    }
  }

  return (
    <div className="space-y-6">
      {/* Rate Matrix */}
      <Card>
        <CardHeader>
          <CardTitle>Rate Matrix (2 Adults / Per Night)</CardTitle>
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
                    <TableHead key={s.id} className="text-right">
                      {s.name}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {rateSheet.roomTypes.map((rt) => (
                  <>
                    <TableRow key={`rt-${rt.id}`} className="bg-muted/50">
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
                          const rate = rateLookup.get(`${rt.id}:${mb.id}:${s.id}`);
                          return (
                            <TableCell key={s.id} className="text-right font-mono">
                              {rate != null ? formatCurrency(rate) : "—"}
                            </TableCell>
                          );
                        })}
                      </TableRow>
                    ))}
                  </>
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
          {/* Input Controls */}
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <div>
              <label className="text-sm font-medium">Season</label>
              <Select value={seasonId} onValueChange={setSeasonId}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {contract.seasons.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Room Type</label>
              <Select value={roomTypeId} onValueChange={setRoomTypeId}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {contract.roomTypes.map((rt) => (
                    <SelectItem key={rt.roomTypeId} value={rt.roomTypeId}>
                      {rt.roomType.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
            <div>
              <label className="text-sm font-medium">Adults</label>
              <Input
                type="number"
                min={1}
                max={4}
                value={adults}
                onChange={(e) => setAdults(Math.max(1, Math.min(4, Number(e.target.value) || 1)))}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <div>
              <label className="text-sm font-medium">Nights</label>
              <Input
                type="number"
                min={1}
                value={nights}
                onChange={(e) => setNights(Math.max(1, Number(e.target.value) || 1))}
              />
            </div>
            <div>
              <label className="text-sm font-medium">View</label>
              <Select
                value={viewLabel ?? "__none__"}
                onValueChange={(v) => setViewLabel(v === "__none__" ? null : v)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">None</SelectItem>
                  {(rateSheet?.viewLabels ?? []).map((vl) => (
                    <SelectItem key={vl} value={vl}>
                      {vl}
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
          </div>

          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <div>
              <label className="text-sm font-medium">Booking Date</label>
              <Input
                type="date"
                value={bookingDate}
                onChange={(e) => setBookingDate(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Check-in Date</label>
              <Input
                type="date"
                value={checkInDate}
                onChange={(e) => setCheckInDate(e.target.value)}
              />
            </div>
          </div>

          {/* Children */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className="text-sm font-medium">Children</label>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setChildren((prev) => [
                    ...prev,
                    { category: "CHILD", bedding: "SHARING_WITH_PARENTS" },
                  ])
                }
              >
                Add Child
              </Button>
            </div>
            {children.length > 0 && (
              <div className="space-y-2">
                {children.map((child, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <Select
                      value={child.category}
                      onValueChange={(v) =>
                        setChildren((prev) =>
                          prev.map((c, i) => (i === idx ? { ...c, category: v } : c)),
                        )
                      }
                    >
                      <SelectTrigger className="w-36">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(CHILD_AGE_CATEGORY_LABELS).map(([k, v]) => (
                          <SelectItem key={k} value={k}>
                            {v}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select
                      value={child.bedding}
                      onValueChange={(v) =>
                        setChildren((prev) =>
                          prev.map((c, i) => (i === idx ? { ...c, bedding: v } : c)),
                        )
                      }
                    >
                      <SelectTrigger className="w-48">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(CHILD_BEDDING_LABELS).map(([k, v]) => (
                          <SelectItem key={k} value={k}>
                            {v}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive"
                      onClick={() =>
                        setChildren((prev) => prev.filter((_, i) => i !== idx))
                      }
                    >
                      Remove
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <Separator />

          {/* Breakdown */}
          {isCalculating ? (
            <div className="py-4 text-center text-muted-foreground">
              Calculating...
            </div>
          ) : breakdown ? (
            <RateBreakdownDisplay
              breakdown={breakdown}
              currencyCode={contract.baseCurrency.code}
            />
          ) : null}
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
  viewSupplement: { label: string; amount: number } | null;
  extraBedSupplement: { label: string; amount: number } | null;
  childCharges: { category: string; bedding: string; amount: number; isFree: boolean }[];
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
  if (breakdown.viewSupplement) {
    lines.push({
      label: `View (${breakdown.viewSupplement.label})`,
      amount: breakdown.viewSupplement.amount,
      prefix: "+",
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
                  {CHILD_AGE_CATEGORY_LABELS[cc.category] ?? cc.category} —{" "}
                  {CHILD_BEDDING_LABELS[cc.bedding] ?? cc.bedding}
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

  const upsertMutation = trpc.contracting.contractChildPolicy.upsert.useMutation({
    onSuccess: () => utils.contracting.contractChildPolicy.listByContract.invalidate({ contractId }),
  });
  const deleteMutation = trpc.contracting.contractChildPolicy.delete.useMutation({
    onSuccess: () => utils.contracting.contractChildPolicy.listByContract.invalidate({ contractId }),
  });

  const [showDialog, setShowDialog] = useState(false);
  const [editCategory, setEditCategory] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    ageFrom: 0,
    ageTo: 0,
    label: "",
    freeInSharing: false,
    maxFreePerRoom: 0,
    extraBedAllowed: true,
    mealsIncluded: false,
    notes: "",
  });

  const contractPolicyMap = new Map(
    contractPolicies.map((cp) => [cp.category, cp]),
  );

  const categories = ["INFANT", "CHILD", "TEEN"] as const;

  function openOverrideDialog(category: string) {
    const hotelPolicy = hotelPolicies.find((hp) => hp.category === category);
    const contractPolicy = contractPolicyMap.get(category);
    const source = contractPolicy ?? hotelPolicy;
    setEditCategory(category);
    setFormData({
      ageFrom: source?.ageFrom ?? 0,
      ageTo: source?.ageTo ?? 0,
      label: source?.label ?? CHILD_AGE_CATEGORY_LABELS[category] ?? category,
      freeInSharing: source?.freeInSharing ?? false,
      maxFreePerRoom: source?.maxFreePerRoom ?? 0,
      extraBedAllowed: source?.extraBedAllowed ?? true,
      mealsIncluded: source?.mealsIncluded ?? false,
      notes: source?.notes ?? "",
    });
    setShowDialog(true);
  }

  function handleSave() {
    if (!editCategory) return;
    upsertMutation.mutate(
      {
        contractId,
        category: editCategory as "INFANT" | "CHILD" | "TEEN",
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

  function handleRemoveOverride(cp: ContractChildPolicyData) {
    deleteMutation.mutate({ id: cp.id, contractId });
  }

  return (
    <div className="space-y-6">
      {/* Hotel Defaults */}
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

      {/* Contract Overrides */}
      <div>
        <h3 className="mb-3 text-lg font-semibold">Contract Overrides</h3>
        <p className="mb-4 text-sm text-muted-foreground">
          Override hotel defaults for specific age categories. When no override exists,
          the hotel default is used.
        </p>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Category</TableHead>
              <TableHead>Label</TableHead>
              <TableHead>Age Range</TableHead>
              <TableHead>Free in Sharing</TableHead>
              <TableHead>Extra Bed</TableHead>
              <TableHead>Meals</TableHead>
              <TableHead>Source</TableHead>
              <TableHead className="w-[140px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {categories.map((cat) => {
              const override = contractPolicyMap.get(cat);
              const hotelDefault = hotelPolicies.find((hp) => hp.category === cat);
              const effective = override ?? hotelDefault;

              if (!effective) return null;

              return (
                <TableRow key={cat}>
                  <TableCell className="font-medium">
                    {CHILD_AGE_CATEGORY_LABELS[cat]}
                  </TableCell>
                  <TableCell>{effective.label}</TableCell>
                  <TableCell>{effective.ageFrom}–{effective.ageTo}</TableCell>
                  <TableCell>
                    {effective.freeInSharing ? (
                      <span>Yes (max {effective.maxFreePerRoom})</span>
                    ) : (
                      "No"
                    )}
                  </TableCell>
                  <TableCell>{effective.extraBedAllowed ? "Yes" : "No"}</TableCell>
                  <TableCell>{effective.mealsIncluded ? "Yes" : "No"}</TableCell>
                  <TableCell>
                    <Badge variant={override ? "default" : "outline"}>
                      {override ? "Override" : "Hotel Default"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openOverrideDialog(cat)}
                      >
                        {override ? "Edit" : "Override"}
                      </Button>
                      {override && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleRemoveOverride(override)}
                          disabled={deleteMutation.isPending}
                        >
                          Revert
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Override Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editCategory
                ? `Override ${CHILD_AGE_CATEGORY_LABELS[editCategory]} Policy`
                : "Override Child Policy"}
            </DialogTitle>
            <DialogDescription>
              Set contract-specific child policy for this category.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Label</label>
              <Input
                value={formData.label}
                onChange={(e) => setFormData({ ...formData, label: e.target.value })}
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
            {upsertMutation.error && (
              <p className="text-sm text-destructive">{upsertMutation.error.message}</p>
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
                upsertMutation.isPending
              }
            >
              {upsertMutation.isPending ? "Saving..." : "Save Override"}
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
