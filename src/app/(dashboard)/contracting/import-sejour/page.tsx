"use client";

import {
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  FileUp,
  Loader2,
  Trash2,
  Upload,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useRef, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ParsedContract {
  fileName: string;
  header?: {
    hotelName: string;
    city: string;
    market: string;
    stars: string;
    seasonCode: string;
    currency: string;
  };
  periods?: { letter: string; dateFrom: string; dateTo: string }[];
  rates?: { roomCode: string; typeCode: string; board: string; period: string; price: number }[];
  allotments?: { roomCode: string; typeName: string; allocations: Record<string, number> }[];
  codeDefinitions?: {
    rooms: { code: string; name: string }[];
    roomTypes: { code: string; name: string }[];
    boardPlans: { code: string; name: string }[];
  };
  specialOffers?: { name: string; percentage: number }[];
  warnings?: string[];
  error?: string;
}

interface ImportedContract {
  fileName: string;
  hotelName?: string;
  contractId?: string;
  contractCode?: string;
  hotelId?: string;
  roomTypesCreated?: number;
  mealBasesCreated?: number;
  seasonsCreated?: number;
  ratesCreated?: number;
  error?: string;
}

type Step = "upload" | "preview" | "importing" | "done";

// ---------------------------------------------------------------------------
// Expandable row
// ---------------------------------------------------------------------------

function ContractPreviewRow({ contract }: { contract: ParsedContract }) {
  const [expanded, setExpanded] = useState(false);
  const hasError = !!contract.error;
  const hasWarnings = (contract.warnings?.length ?? 0) > 0;
  const periodLetters = [...new Set(contract.periods?.map((p) => p.letter) || [])];

  return (
    <>
      <TableRow
        className={cn(
          "cursor-pointer",
          hasError && "bg-red-50 dark:bg-red-950/20",
          hasWarnings && !hasError && "bg-yellow-50 dark:bg-yellow-950/20",
        )}
        onClick={() => setExpanded(!expanded)}
      >
        <TableCell className="w-8">
          {expanded ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </TableCell>
        <TableCell className="font-medium">
          {contract.header?.hotelName || contract.fileName}
        </TableCell>
        <TableCell>{contract.header?.city}</TableCell>
        <TableCell>{contract.header?.stars ? `${contract.header.stars}*` : "-"}</TableCell>
        <TableCell>{contract.header?.seasonCode}</TableCell>
        <TableCell>{periodLetters.join(", ")}</TableCell>
        <TableCell>
          {contract.codeDefinitions?.roomTypes.length ?? 0}
        </TableCell>
        <TableCell>
          {contract.codeDefinitions?.boardPlans.map((b) => b.code).join(", ") || "-"}
        </TableCell>
        <TableCell>{contract.rates?.length ?? 0}</TableCell>
        <TableCell>
          {hasError ? (
            <Badge variant="destructive">Error</Badge>
          ) : hasWarnings ? (
            <Badge variant="outline" className="border-yellow-500 text-yellow-700 dark:text-yellow-400">
              Warnings
            </Badge>
          ) : (
            <Badge variant="outline" className="text-emerald-600">OK</Badge>
          )}
        </TableCell>
      </TableRow>

      {expanded && (
        <TableRow>
          <TableCell colSpan={10} className="bg-muted/30 p-4">
            <div className="space-y-4">
              {contract.error && (
                <p className="text-sm text-destructive">{contract.error}</p>
              )}
              {contract.warnings?.map((w, i) => (
                <p key={i} className="text-sm text-yellow-700 dark:text-yellow-400">
                  Warning: {w}
                </p>
              ))}

              {/* Periods */}
              {contract.periods && contract.periods.length > 0 && (
                <div>
                  <p className="text-xs font-semibold mb-1 text-muted-foreground">
                    Periods
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {contract.periods.map((p, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center gap-1 rounded bg-background px-2 py-0.5 text-xs border"
                      >
                        <strong>{p.letter}</strong> {p.dateFrom} - {p.dateTo}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Room Types */}
              {contract.codeDefinitions?.roomTypes && (
                <div>
                  <p className="text-xs font-semibold mb-1 text-muted-foreground">
                    Room Types
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {contract.codeDefinitions.roomTypes.map((rt) => (
                      <span
                        key={rt.code}
                        className="inline-flex items-center gap-1 rounded bg-background px-2 py-0.5 text-xs border"
                      >
                        <strong>{rt.code}</strong> {rt.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Rate matrix */}
              {contract.rates && contract.rates.length > 0 && (
                <div>
                  <p className="text-xs font-semibold mb-1 text-muted-foreground">
                    Rate Matrix (DBL per person)
                  </p>
                  <div className="overflow-auto max-h-48">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-xs">Type</TableHead>
                          <TableHead className="text-xs">Board</TableHead>
                          {periodLetters.map((l) => (
                            <TableHead key={l} className="text-xs text-right">
                              {l}
                            </TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(() => {
                          const dblRates = contract.rates!.filter(
                            (r) => r.roomCode === "DBL",
                          );
                          const grouped = new Map<string, Map<string, number>>();
                          for (const r of dblRates) {
                            const key = `${r.typeCode}|${r.board}`;
                            if (!grouped.has(key)) grouped.set(key, new Map());
                            grouped.get(key)!.set(r.period, r.price);
                          }
                          return Array.from(grouped.entries()).map(
                            ([key, periods]) => {
                              const [typeCode, board] = key.split("|");
                              return (
                                <TableRow key={key}>
                                  <TableCell className="text-xs font-mono">
                                    {typeCode}
                                  </TableCell>
                                  <TableCell className="text-xs">
                                    {board}
                                  </TableCell>
                                  {periodLetters.map((l) => (
                                    <TableCell
                                      key={l}
                                      className="text-xs text-right"
                                    >
                                      {periods.get(l)?.toFixed(2) ?? "-"}
                                    </TableCell>
                                  ))}
                                </TableRow>
                              );
                            },
                          );
                        })()}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}

              {/* Allotments */}
              {contract.allotments && contract.allotments.length > 0 && (
                <div>
                  <p className="text-xs font-semibold mb-1 text-muted-foreground">
                    Allotments
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {contract.allotments.map((a, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center gap-1 rounded bg-background px-2 py-0.5 text-xs border"
                      >
                        {a.typeName}:{" "}
                        {Object.entries(a.allocations)
                          .map(([l, n]) => `${l}=${n}`)
                          .join(", ")}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Special Offers */}
              {contract.specialOffers && contract.specialOffers.length > 0 && (
                <div>
                  <p className="text-xs font-semibold mb-1 text-muted-foreground">
                    Special Offers
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {contract.specialOffers.map((so, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center gap-1 rounded bg-background px-2 py-0.5 text-xs border"
                      >
                        {so.name} ({so.percentage}%)
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </TableCell>
        </TableRow>
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function ImportSejourPage() {
  const [step, setStep] = useState<Step>("upload");
  const [files, setFiles] = useState<File[]>([]);
  const [preview, setPreview] = useState<ParsedContract[]>([]);
  const [results, setResults] = useState<ImportedContract[]>([]);
  const [successCount, setSuccessCount] = useState(0);
  const [errorCount, setErrorCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const reset = useCallback(() => {
    setStep("upload");
    setFiles([]);
    setPreview([]);
    setResults([]);
    setSuccessCount(0);
    setErrorCount(0);
    setError(null);
  }, []);

  const addFiles = useCallback((newFiles: FileList | File[]) => {
    const pdfFiles = Array.from(newFiles).filter(
      (f) => f.type === "application/pdf" || f.name.endsWith(".pdf"),
    );
    setFiles((prev) => [...prev, ...pdfFiles]);
  }, []);

  const removeFile = useCallback((index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      addFiles(e.dataTransfer.files);
    },
    [addFiles],
  );

  const handlePreview = useCallback(async () => {
    if (files.length === 0) return;
    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      for (const f of files) {
        formData.append("files[]", f);
      }

      const res = await fetch("/api/import/sejour?preview=true", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error ?? "Failed to parse PDFs");
      }

      const data = await res.json();
      setPreview(data.contracts || []);
      setStep("preview");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to parse PDFs");
    } finally {
      setLoading(false);
    }
  }, [files]);

  const handleImport = useCallback(async () => {
    if (files.length === 0) return;
    setStep("importing");
    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      for (const f of files) {
        formData.append("files[]", f);
      }

      const res = await fetch("/api/import/sejour", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error ?? "Import failed");
      }

      const data = await res.json();
      setResults(data.contracts || []);
      setSuccessCount(data.successCount || 0);
      setErrorCount(data.errorCount || 0);
      setStep("done");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Import failed");
      setStep("preview");
    } finally {
      setLoading(false);
    }
  }, [files]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header">
        <div className="flex items-center gap-2">
          <Upload className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold tracking-tight">
            Import Sejour Contracts
          </h1>
        </div>
        <p className="text-muted-foreground">
          Import hotel contracts from Sejour PDF exports
        </p>
      </div>

      {/* Step 1: Upload */}
      {step === "upload" && (
        <Card>
          <CardHeader>
            <CardTitle>Step 1: Upload PDF Files</CardTitle>
            <CardDescription>
              Upload one or more Sejour contract PDF files. Files should be from
              the Sejour &quot;Hotel Contract Information&quot; export.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div
              className={cn(
                "flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed p-10 transition-colors",
                "hover:border-primary/50 hover:bg-muted/30",
                loading && "opacity-50 pointer-events-none",
              )}
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
            >
              <FileUp className="h-10 w-10 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Drag and drop PDF files here, or
              </p>
              <Button
                variant="outline"
                onClick={() => inputRef.current?.click()}
                disabled={loading}
              >
                Browse Files
              </Button>
              <input
                ref={inputRef}
                type="file"
                accept=".pdf"
                multiple
                className="hidden"
                onChange={(e) => {
                  if (e.target.files) addFiles(e.target.files);
                  e.target.value = "";
                }}
              />
            </div>

            {/* File list */}
            {files.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium">
                  {files.length} file{files.length !== 1 ? "s" : ""} selected
                </p>
                <div className="max-h-48 overflow-auto rounded border divide-y">
                  {files.map((f, i) => (
                    <div
                      key={`${f.name}-${i}`}
                      className="flex items-center justify-between px-3 py-2 text-sm"
                    >
                      <span className="truncate">{f.name}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                        onClick={() => removeFile(i)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {error && <p className="text-sm text-destructive">{error}</p>}

            <div className="flex gap-2">
              <Button
                onClick={handlePreview}
                disabled={files.length === 0 || loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Parsing...
                  </>
                ) : (
                  "Parse & Preview"
                )}
              </Button>
            </div>

            <div className="rounded-md bg-muted/50 p-4 text-sm space-y-1">
              <p className="font-medium">Expected PDF format:</p>
              <p>
                Sejour &quot;Hotel Contract Information&quot; export PDFs, organized as{" "}
                <code className="text-xs bg-muted px-1 rounded">
                  Market/City/Season/Hotel.pdf
                </code>
              </p>
              <p className="text-muted-foreground">
                Each PDF should contain: hotel info, periods, rates, allotments,
                code definitions, child prices, cancellation rules, and special
                offers.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Preview */}
      {step === "preview" && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Step 2: Preview Parsed Contracts</CardTitle>
              <CardDescription>
                Review the parsed data below. Click a row to expand details.
                Rows with errors will be skipped during import.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4 text-sm mb-4">
                <span>
                  Total: <strong>{preview.length}</strong>
                </span>
                <span className="text-emerald-600">
                  OK:{" "}
                  <strong>
                    {preview.filter((p) => !p.error).length}
                  </strong>
                </span>
                {preview.some((p) => p.error) && (
                  <span className="text-destructive">
                    Errors:{" "}
                    <strong>
                      {preview.filter((p) => p.error).length}
                    </strong>
                  </span>
                )}
              </div>

              <div className="overflow-auto max-h-[60vh] rounded border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-8" />
                      <TableHead>Hotel</TableHead>
                      <TableHead>City</TableHead>
                      <TableHead>Stars</TableHead>
                      <TableHead>Season</TableHead>
                      <TableHead>Periods</TableHead>
                      <TableHead>Room Types</TableHead>
                      <TableHead>Board</TableHead>
                      <TableHead>Rates</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {preview.map((contract, i) => (
                      <ContractPreviewRow
                        key={`${contract.fileName}-${i}`}
                        contract={contract}
                      />
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex gap-2">
            <Button onClick={handleImport} disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Importing...
                </>
              ) : (
                "Import All"
              )}
            </Button>
            <Button variant="outline" onClick={reset}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Step 3: Importing */}
      {step === "importing" && (
        <Card>
          <CardContent className="py-10 text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-muted-foreground">
              Importing {files.length} contract{files.length !== 1 ? "s" : ""}...
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              Creating hotels, room types, meal bases, and contracts with all
              sub-records.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Step 4: Done */}
      {step === "done" && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                Import Complete
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center gap-8">
                <div className="text-center">
                  <p className="text-3xl font-bold text-emerald-600">
                    {successCount}
                  </p>
                  <p className="text-sm text-muted-foreground">Imported</p>
                </div>
                {errorCount > 0 && (
                  <div className="text-center">
                    <p className="text-3xl font-bold text-destructive">
                      {errorCount}
                    </p>
                    <p className="text-sm text-muted-foreground">Failed</p>
                  </div>
                )}
              </div>

              {/* Result list */}
              <div className="rounded border divide-y">
                {results.map((r, i) => (
                  <div
                    key={i}
                    className={cn(
                      "flex items-center justify-between px-4 py-3",
                      r.error && "bg-red-50 dark:bg-red-950/20",
                    )}
                  >
                    <div className="space-y-0.5">
                      <p className="text-sm font-medium">
                        {r.hotelName || r.fileName}
                      </p>
                      {r.error ? (
                        <p className="text-xs text-destructive">{r.error}</p>
                      ) : (
                        <p className="text-xs text-muted-foreground">
                          Code: {r.contractCode} | {r.roomTypesCreated} room
                          types | {r.seasonsCreated} seasons |{" "}
                          {r.ratesCreated} rates
                        </p>
                      )}
                    </div>
                    {r.contractId && (
                      <Button variant="ghost" size="sm" asChild>
                        <Link
                          href={`/contracting/contracts/${r.contractId}`}
                        >
                          <ExternalLink className="h-3.5 w-3.5 mr-1" />
                          View
                        </Link>
                      </Button>
                    )}
                  </div>
                ))}
              </div>

              <div className="flex gap-2">
                <Button onClick={reset}>Import More</Button>
                <Button variant="outline" asChild>
                  <Link href="/contracting/contracts">View All Contracts</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
