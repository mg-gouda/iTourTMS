"use client";

import { FileUp, Upload, X } from "lucide-react";
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
import { cn } from "@/lib/utils";

type ImportType = "hotels";

interface PreviewRow {
  rowNum: number;
  errors: string[];
  [key: string]: unknown;
}

interface ImportResult {
  successCount: number;
  errorCount: number;
  errors: { rowNum: number; sheet: string; errors: string[] }[];
}

type Step = "select" | "upload" | "preview" | "importing" | "done";

export default function ImportPage() {
  const [importType, setImportType] = useState<ImportType>("hotels");
  const [step, setStep] = useState<Step>("select");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<{
    hotels: PreviewRow[];
    roomTypes: PreviewRow[];
    mealBases: PreviewRow[];
    hasErrors: boolean;
  } | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const reset = useCallback(() => {
    setStep("select");
    setFile(null);
    setPreview(null);
    setResult(null);
    setError(null);
  }, []);

  const handleFileSelect = useCallback(
    async (selectedFile: File) => {
      setFile(selectedFile);
      setError(null);
      setLoading(true);

      try {
        const formData = new FormData();
        formData.append("file", selectedFile);

        const res = await fetch(`/api/import/${importType}?preview=true`, {
          method: "POST",
          body: formData,
        });

        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error ?? "Failed to parse file");
        }

        const data = await res.json();
        setPreview(data);
        setStep("preview");
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Failed to parse file");
      } finally {
        setLoading(false);
      }
    },
    [importType],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile) handleFileSelect(droppedFile);
    },
    [handleFileSelect],
  );

  const handleImport = useCallback(async () => {
    if (!file) return;
    setStep("importing");
    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch(`/api/import/${importType}`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error ?? "Import failed");
      }

      const data: ImportResult = await res.json();
      setResult(data);
      setStep("done");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Import failed");
      setStep("preview");
    } finally {
      setLoading(false);
    }
  }, [file, importType]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header">
        <div className="flex items-center gap-2">
          <Upload className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold tracking-tight">Bulk Import</h1>
        </div>
        <p className="text-muted-foreground">
          Import hotels, room types, and meal bases from Excel files
        </p>
      </div>

      {/* Step 1: Select import type */}
      {step === "select" && (
        <Card>
          <CardHeader>
            <CardTitle>Step 1: Select Import Type</CardTitle>
            <CardDescription>
              Choose what type of data you want to import
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Select
              value={importType}
              onValueChange={(v) => setImportType(v as ImportType)}
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="hotels">Hotels</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex gap-2">
              <Button onClick={() => setStep("upload")}>Next</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Upload file */}
      {step === "upload" && (
        <Card>
          <CardHeader>
            <CardTitle>Step 2: Upload Excel File</CardTitle>
            <CardDescription>
              {importType === "hotels"
                ? 'Upload an Excel file with a "Hotels" sheet. Optional: "Room Types" and "Meal Bases" sheets.'
                : "Upload an Excel file with contract data."}
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
                Drag and drop your Excel file here, or
              </p>
              <Button
                variant="outline"
                onClick={() => inputRef.current?.click()}
                disabled={loading}
              >
                {loading ? "Parsing..." : "Browse Files"}
              </Button>
              <input
                ref={inputRef}
                type="file"
                accept=".xlsx,.xls"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFileSelect(f);
                }}
              />
              {file && (
                <p className="text-xs text-muted-foreground">
                  Selected: {file.name}
                </p>
              )}
            </div>

            {importType === "hotels" && (
              <div className="rounded-md bg-muted/50 p-4 text-sm space-y-2">
                <p className="font-medium">Expected Excel format:</p>
                <p>
                  <strong>Hotels sheet:</strong> Name, Code, Country, City, Star
                  Rating, Destination, Address, Email, Phone
                </p>
                <p>
                  <strong>Room Types sheet (optional):</strong> Hotel Code, Name,
                  Code, Max Adults, Max Children
                </p>
                <p>
                  <strong>Meal Bases sheet (optional):</strong> Hotel Code, Name,
                  Meal Code
                </p>
              </div>
            )}

            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}

            <Button variant="outline" onClick={reset}>
              Back
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Preview */}
      {step === "preview" && preview && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Step 3: Preview & Confirm</CardTitle>
              <CardDescription>
                Review the parsed data below. Rows with errors will be skipped
                during import.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center gap-4 text-sm">
                <span>
                  Hotels:{" "}
                  <strong>{preview.hotels.length}</strong>
                </span>
                <span>
                  Room Types:{" "}
                  <strong>{preview.roomTypes.length}</strong>
                </span>
                <span>
                  Meal Bases:{" "}
                  <strong>{preview.mealBases.length}</strong>
                </span>
                {preview.hasErrors && (
                  <Badge variant="destructive">Has errors</Badge>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Hotels preview */}
          {preview.hotels.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  Hotels ({preview.hotels.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="max-h-80 overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">#</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Code</TableHead>
                        <TableHead>Country</TableHead>
                        <TableHead>City</TableHead>
                        <TableHead>Stars</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {preview.hotels.map((h) => (
                        <TableRow
                          key={h.rowNum}
                          className={h.errors.length > 0 ? "bg-red-50 dark:bg-red-950/20" : ""}
                        >
                          <TableCell className="font-mono text-xs">
                            {h.rowNum}
                          </TableCell>
                          <TableCell>{h.name as string}</TableCell>
                          <TableCell className="font-mono">
                            {h.code as string}
                          </TableCell>
                          <TableCell>{h.country as string}</TableCell>
                          <TableCell>{h.city as string}</TableCell>
                          <TableCell>{h.starRating as string}</TableCell>
                          <TableCell>
                            {h.errors.length > 0 ? (
                              <span className="text-xs text-destructive">
                                {h.errors.join("; ")}
                              </span>
                            ) : (
                              <Badge variant="outline" className="text-xs">
                                OK
                              </Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Room Types preview */}
          {preview.roomTypes.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  Room Types ({preview.roomTypes.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="max-h-60 overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">#</TableHead>
                        <TableHead>Hotel Code</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Code</TableHead>
                        <TableHead>Max Adults</TableHead>
                        <TableHead>Max Children</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {preview.roomTypes.map((r) => (
                        <TableRow
                          key={`${r.hotelCode}-${r.rowNum}`}
                          className={r.errors.length > 0 ? "bg-red-50 dark:bg-red-950/20" : ""}
                        >
                          <TableCell className="font-mono text-xs">
                            {r.rowNum}
                          </TableCell>
                          <TableCell className="font-mono">
                            {r.hotelCode as string}
                          </TableCell>
                          <TableCell>{r.name as string}</TableCell>
                          <TableCell className="font-mono">
                            {r.code as string}
                          </TableCell>
                          <TableCell>{r.maxAdults as number}</TableCell>
                          <TableCell>{r.maxChildren as number}</TableCell>
                          <TableCell>
                            {r.errors.length > 0 ? (
                              <span className="text-xs text-destructive">
                                {r.errors.join("; ")}
                              </span>
                            ) : (
                              <Badge variant="outline" className="text-xs">
                                OK
                              </Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex gap-2">
            <Button onClick={handleImport} disabled={loading}>
              {loading ? "Importing..." : "Import Data"}
            </Button>
            <Button variant="outline" onClick={reset}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Step 4: Importing */}
      {step === "importing" && (
        <Card>
          <CardContent className="py-10 text-center">
            <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4" />
            <p className="text-muted-foreground">Importing data...</p>
          </CardContent>
        </Card>
      )}

      {/* Step 5: Done */}
      {step === "done" && result && (
        <Card>
          <CardHeader>
            <CardTitle>Import Complete</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-6">
              <div className="text-center">
                <p className="text-3xl font-bold text-emerald-600">
                  {result.successCount}
                </p>
                <p className="text-sm text-muted-foreground">Imported</p>
              </div>
              {result.errorCount > 0 && (
                <div className="text-center">
                  <p className="text-3xl font-bold text-destructive">
                    {result.errorCount}
                  </p>
                  <p className="text-sm text-muted-foreground">Skipped</p>
                </div>
              )}
            </div>

            {result.errors.length > 0 && (
              <div className="rounded-md border p-3 max-h-40 overflow-auto">
                <p className="text-sm font-medium mb-2">Errors:</p>
                {result.errors.map((e, i) => (
                  <p key={i} className="text-xs text-destructive">
                    Row {e.rowNum} ({e.sheet}): {e.errors.join("; ")}
                  </p>
                ))}
              </div>
            )}

            <Button onClick={reset}>Import More</Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
