"use client";

import { Trash2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { ImageUpload } from "@/components/shared/image-upload";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Combobox, type ComboboxOption } from "@/components/ui/combobox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";

// ---------------------------------------------------------------------------
// Timezone options — common IANA timezones grouped by region
// ---------------------------------------------------------------------------

const timezoneOptions: ComboboxOption[] = [
  // UTC
  { value: "UTC", label: "UTC (Coordinated Universal Time)", group: "UTC" },
  // Africa
  { value: "Africa/Cairo", label: "Africa/Cairo (EET, +02:00)", group: "Africa" },
  { value: "Africa/Casablanca", label: "Africa/Casablanca (+01:00)", group: "Africa" },
  { value: "Africa/Johannesburg", label: "Africa/Johannesburg (SAST, +02:00)", group: "Africa" },
  { value: "Africa/Lagos", label: "Africa/Lagos (WAT, +01:00)", group: "Africa" },
  { value: "Africa/Nairobi", label: "Africa/Nairobi (EAT, +03:00)", group: "Africa" },
  // Americas
  { value: "America/Chicago", label: "America/Chicago (CST, -06:00)", group: "Americas" },
  { value: "America/Denver", label: "America/Denver (MST, -07:00)", group: "Americas" },
  { value: "America/Los_Angeles", label: "America/Los Angeles (PST, -08:00)", group: "Americas" },
  { value: "America/Mexico_City", label: "America/Mexico City (CST, -06:00)", group: "Americas" },
  { value: "America/New_York", label: "America/New York (EST, -05:00)", group: "Americas" },
  { value: "America/Sao_Paulo", label: "America/Sao Paulo (BRT, -03:00)", group: "Americas" },
  { value: "America/Toronto", label: "America/Toronto (EST, -05:00)", group: "Americas" },
  // Asia
  { value: "Asia/Baghdad", label: "Asia/Baghdad (AST, +03:00)", group: "Asia" },
  { value: "Asia/Bangkok", label: "Asia/Bangkok (ICT, +07:00)", group: "Asia" },
  { value: "Asia/Colombo", label: "Asia/Colombo (IST, +05:30)", group: "Asia" },
  { value: "Asia/Dubai", label: "Asia/Dubai (GST, +04:00)", group: "Asia" },
  { value: "Asia/Hong_Kong", label: "Asia/Hong Kong (HKT, +08:00)", group: "Asia" },
  { value: "Asia/Istanbul", label: "Asia/Istanbul (TRT, +03:00)", group: "Asia" },
  { value: "Asia/Jakarta", label: "Asia/Jakarta (WIB, +07:00)", group: "Asia" },
  { value: "Asia/Karachi", label: "Asia/Karachi (PKT, +05:00)", group: "Asia" },
  { value: "Asia/Kolkata", label: "Asia/Kolkata (IST, +05:30)", group: "Asia" },
  { value: "Asia/Kuala_Lumpur", label: "Asia/Kuala Lumpur (MYT, +08:00)", group: "Asia" },
  { value: "Asia/Riyadh", label: "Asia/Riyadh (AST, +03:00)", group: "Asia" },
  { value: "Asia/Shanghai", label: "Asia/Shanghai (CST, +08:00)", group: "Asia" },
  { value: "Asia/Singapore", label: "Asia/Singapore (SGT, +08:00)", group: "Asia" },
  { value: "Asia/Tokyo", label: "Asia/Tokyo (JST, +09:00)", group: "Asia" },
  // Australia
  { value: "Australia/Melbourne", label: "Australia/Melbourne (AEST, +10:00)", group: "Australia" },
  { value: "Australia/Perth", label: "Australia/Perth (AWST, +08:00)", group: "Australia" },
  { value: "Australia/Sydney", label: "Australia/Sydney (AEST, +10:00)", group: "Australia" },
  // Europe
  { value: "Europe/Amsterdam", label: "Europe/Amsterdam (CET, +01:00)", group: "Europe" },
  { value: "Europe/Berlin", label: "Europe/Berlin (CET, +01:00)", group: "Europe" },
  { value: "Europe/London", label: "Europe/London (GMT, +00:00)", group: "Europe" },
  { value: "Europe/Madrid", label: "Europe/Madrid (CET, +01:00)", group: "Europe" },
  { value: "Europe/Moscow", label: "Europe/Moscow (MSK, +03:00)", group: "Europe" },
  { value: "Europe/Paris", label: "Europe/Paris (CET, +01:00)", group: "Europe" },
  { value: "Europe/Rome", label: "Europe/Rome (CET, +01:00)", group: "Europe" },
  { value: "Europe/Zurich", label: "Europe/Zurich (CET, +01:00)", group: "Europe" },
  // Pacific
  { value: "Pacific/Auckland", label: "Pacific/Auckland (NZST, +12:00)", group: "Pacific" },
  { value: "Pacific/Honolulu", label: "Pacific/Honolulu (HST, -10:00)", group: "Pacific" },
];

export default function SettingsPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Manage your company settings and configuration
        </p>
      </div>

      <Tabs defaultValue="general">
        <TabsList>
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="branding">Branding</TabsTrigger>
          <TabsTrigger value="contracting">Contracting</TabsTrigger>
          <TabsTrigger value="integrations">Integrations</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="mt-4">
          <GeneralSettings />
        </TabsContent>

        <TabsContent value="branding" className="mt-4">
          <BrandingSettings />
        </TabsContent>

        <TabsContent value="contracting" className="mt-4">
          <ContractingSettings />
        </TabsContent>

        <TabsContent value="integrations" className="mt-4">
          <IntegrationsSettings />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ---------------------------------------------------------------------------
// General Settings Tab
// ---------------------------------------------------------------------------

function GeneralSettings() {
  const { data, isLoading } = trpc.settings.getCompanySettings.useQuery();
  const utils = trpc.useUtils();
  const updateMutation = trpc.settings.updateCompanySettings.useMutation({
    onSuccess: () => {
      toast.success("Settings saved");
      utils.settings.getCompanySettings.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const [form, setForm] = useState<{
    name: string;
    legalName: string;
    taxId: string;
    phone: string;
    email: string;
    website: string;
    timezone: string;
  } | null>(null);

  // Initialize form when data loads
  if (data && !form) {
    setForm({
      name: data.name,
      legalName: data.legalName ?? "",
      taxId: data.taxId ?? "",
      phone: data.phone ?? "",
      email: data.email ?? "",
      website: data.website ?? "",
      timezone: data.timezone,
    });
  }

  if (isLoading || !form) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-muted-foreground">
          Loading...
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Company Information</CardTitle>
        <CardDescription>
          Basic company details and configuration
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form
          className="grid gap-4 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            updateMutation.mutate({
              name: form.name,
              legalName: form.legalName || null,
              taxId: form.taxId || null,
              phone: form.phone || null,
              email: form.email || null,
              website: form.website || null,
              timezone: form.timezone,
            });
          }}
        >
          <div className="space-y-1.5">
            <Label>Company Name</Label>
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Legal Name</Label>
            <Input
              value={form.legalName}
              onChange={(e) => setForm({ ...form, legalName: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Tax ID</Label>
            <Input
              value={form.taxId}
              onChange={(e) => setForm({ ...form, taxId: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Phone</Label>
            <Input
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Email</Label>
            <Input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Website</Label>
            <Input
              value={form.website}
              onChange={(e) => setForm({ ...form, website: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Timezone</Label>
            <Combobox
              options={timezoneOptions}
              value={form.timezone}
              onValueChange={(v) => setForm({ ...form, timezone: v || "UTC" })}
              placeholder="Select timezone…"
              searchPlaceholder="Search timezones…"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Country</Label>
            <Input
              value={data?.country?.name ?? "—"}
              disabled
              className="bg-muted"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Base Currency</Label>
            <Input
              value={data?.baseCurrency ? `${data.baseCurrency.code} — ${data.baseCurrency.name}` : "—"}
              disabled
              className="bg-muted"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Fiscal Year</Label>
            <Input
              value={`Month ${data?.fiscalYearStart} — Month ${data?.fiscalYearEnd}`}
              disabled
              className="bg-muted"
            />
          </div>
          <div className="col-span-full flex justify-end">
            <Button type="submit" disabled={updateMutation.isPending}>
              {updateMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Branding Settings Tab
// ---------------------------------------------------------------------------

function BrandingSettings() {
  const { data, isLoading } = trpc.settings.getCompanySettings.useQuery();
  const utils = trpc.useUtils();

  const handleUploaded = () => {
    utils.settings.getCompanySettings.invalidate();
  };

  if (isLoading || !data) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-muted-foreground">
          Loading...
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Company Logo</CardTitle>
          <CardDescription>Displayed in the sidebar and reports</CardDescription>
        </CardHeader>
        <CardContent>
          <ImageUpload
            field="logo"
            currentUrl={data.logoUrl}
            label="Logo"
            hint="Recommended: 200x200px or larger. PNG, SVG, or JPG."
            onUploaded={handleUploaded}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Favicon</CardTitle>
          <CardDescription>Browser tab icon</CardDescription>
        </CardHeader>
        <CardContent>
          <ImageUpload
            field="favicon"
            currentUrl={data.faviconUrl}
            label="Favicon"
            hint="Recommended: 32x32px or 64x64px. PNG, SVG, or ICO."
            onUploaded={handleUploaded}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Login Logo</CardTitle>
          <CardDescription>Logo displayed on the login page</CardDescription>
        </CardHeader>
        <CardContent>
          <ImageUpload
            field="loginLogo"
            currentUrl={data.loginLogoUrl}
            label="Login Logo"
            hint="Displayed above the login form. PNG, SVG, or JPG."
            onUploaded={handleUploaded}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Sidebar Logo</CardTitle>
          <CardDescription>Logo at the top of the sidebar menu</CardDescription>
        </CardHeader>
        <CardContent>
          <ImageUpload
            field="sidebarLogo"
            currentUrl={data.sidebarLogoUrl}
            label="Sidebar Logo"
            hint="Replaces the default iTourTMS text in the sidebar header."
            onUploaded={handleUploaded}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Login Background</CardTitle>
          <CardDescription>Background image for the login page</CardDescription>
        </CardHeader>
        <CardContent>
          <ImageUpload
            field="loginBg"
            currentUrl={data.loginBgUrl}
            label="Login Background"
            hint="Recommended: 1920x1080px. Falls back to default gradient if empty."
            onUploaded={handleUploaded}
            aspectClass="aspect-video"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Inner Pages Background</CardTitle>
          <CardDescription>Subtle background for dashboard pages</CardDescription>
        </CardHeader>
        <CardContent>
          <ImageUpload
            field="innerBg"
            currentUrl={data.innerBgUrl}
            label="Inner Background"
            hint="Optional subtle pattern or watermark. PNG or SVG."
            onUploaded={handleUploaded}
            aspectClass="aspect-video"
          />
        </CardContent>
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Contracting Settings Tab
// ---------------------------------------------------------------------------

function ContractingSettings() {
  return (
    <div className="space-y-6">
      <HotelCodePrefixSection />
      <MarketManagementSection />
    </div>
  );
}

// ── Hotel Code Prefix ──

function HotelCodePrefixSection() {
  const { data } = trpc.settings.getCompanySettings.useQuery();
  const utils = trpc.useUtils();
  const updateMutation = trpc.settings.updateCompanySettings.useMutation({
    onSuccess: () => {
      toast.success("Hotel code prefix saved");
      utils.settings.getCompanySettings.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const [prefix, setPrefix] = useState("");
  const [prefixInit, setPrefixInit] = useState(false);

  if (data && !prefixInit) {
    setPrefix(data.hotelCodePrefix ?? "");
    setPrefixInit(true);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Hotel Code Prefix</CardTitle>
        <CardDescription>
          Single letter prefix for auto-generated hotel codes (e.g. &quot;H&quot; produces HCZA01).
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-end gap-4">
          <div className="max-w-[80px] space-y-1.5">
            <Label>Prefix</Label>
            <Input
              value={prefix}
              onChange={(e) => setPrefix(e.target.value.toUpperCase().slice(0, 1))}
              maxLength={1}
              placeholder="H"
              className="text-center font-mono text-lg uppercase"
            />
          </div>
          <Button
            disabled={updateMutation.isPending}
            onClick={() =>
              updateMutation.mutate({ hotelCodePrefix: prefix || null })
            }
          >
            {updateMutation.isPending ? "Saving..." : "Save"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Market Management ──

type MarketRow = {
  id?: string;
  name: string;
  code: string;
  active: boolean;
  isNew: boolean;
};

function MarketManagementSection() {
  const utils = trpc.useUtils();
  const { data: marketsRaw } = trpc.contracting.market.list.useQuery();
  const markets = marketsRaw ?? [];

  const invalidate = useCallback(() => {
    utils.contracting.market.list.invalidate();
  }, [utils]);

  const [rows, setRows] = useState<MarketRow[]>([]);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (!marketsRaw) return;
    setRows([
      ...marketsRaw.map((m) => ({
        id: m.id,
        name: m.name,
        code: m.code,
        active: m.active,
        isNew: false,
      })),
      { name: "", code: "", active: true, isNew: true },
    ]);
    setInitialized(true);
  }, [marketsRaw]);

  const codeRefs = useRef<(HTMLInputElement | null)[]>([]);
  const nameRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [error, setError] = useState<string | null>(null);

  const createMutation = trpc.contracting.market.create.useMutation({
    onSuccess: () => invalidate(),
    onError: (err) => setError(err.message),
  });

  const updateMutation = trpc.contracting.market.update.useMutation({
    onSuccess: () => invalidate(),
    onError: (err) => setError(err.message),
  });

  const deleteMutation = trpc.contracting.market.delete.useMutation({
    onSuccess: () => invalidate(),
    onError: (err) => setError(err.message),
  });

  function updateRow(index: number, field: keyof MarketRow, value: string | boolean) {
    setRows((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  }

  function saveRow(index: number) {
    const row = rows[index];
    if (!row) return;
    const code = row.code.trim().toUpperCase();
    const name = row.name.trim();
    if (!code || !name) return;
    setError(null);

    if (row.isNew) {
      createMutation.mutate({ name, code, countryIds: [], active: row.active });
    } else if (row.id) {
      updateMutation.mutate({ id: row.id, data: { name, code, active: row.active } });
    }
  }

  function handleKeyDown(
    e: React.KeyboardEvent<HTMLInputElement>,
    rowIndex: number,
    field: "code" | "name",
  ) {
    if (e.key === "Enter") {
      e.preventDefault();
      saveRow(rowIndex);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      const nextIndex = rowIndex + 1;
      if (nextIndex >= rows.length) {
        setRows((prev) => {
          const last = prev[prev.length - 1];
          if (last && last.isNew && !last.code && !last.name) return prev;
          return [...prev, { name: "", code: "", active: true, isNew: true }];
        });
        requestAnimationFrame(() => {
          codeRefs.current[nextIndex]?.focus();
        });
      } else {
        (field === "code" ? codeRefs : nameRefs).current[nextIndex]?.focus();
      }
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      const prevIndex = rowIndex - 1;
      if (prevIndex >= 0) {
        (field === "code" ? codeRefs : nameRefs).current[prevIndex]?.focus();
      }
    }
  }

  function handleBlur(rowIndex: number) {
    const row = rows[rowIndex];
    if (!row || row.isNew) return;
    const code = row.code.trim().toUpperCase();
    const name = row.name.trim();
    if (!code || !name) return;
    const orig = markets.find((m) => m.id === row.id);
    if (orig && (orig.code !== code || orig.name !== name || orig.active !== row.active)) {
      saveRow(rowIndex);
    }
  }

  if (!initialized) return null;

  const savedCount = rows.filter((r) => !r.isNew).length;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Market Predefinitions ({savedCount})</CardTitle>
        <CardDescription>
          Define markets centrally. Contracts can then select from these predefined markets.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[120px]">Code</TableHead>
              <TableHead>Name</TableHead>
              <TableHead className="w-[80px]">Active</TableHead>
              <TableHead className="w-[50px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row, i) => (
              <TableRow
                key={row.id ?? `new-${i}`}
                className={row.isNew ? "bg-muted/30" : undefined}
              >
                <TableCell className="p-1">
                  <Input
                    ref={(el) => { codeRefs.current[i] = el; }}
                    value={row.code}
                    onChange={(e) =>
                      updateRow(i, "code", e.target.value.toUpperCase().slice(0, 10))
                    }
                    onKeyDown={(e) => handleKeyDown(e, i, "code")}
                    onBlur={() => handleBlur(i)}
                    placeholder="UK"
                    className="h-8 font-mono uppercase"
                    maxLength={10}
                  />
                </TableCell>
                <TableCell className="p-1">
                  <Input
                    ref={(el) => { nameRefs.current[i] = el; }}
                    value={row.name}
                    onChange={(e) => updateRow(i, "name", e.target.value)}
                    onKeyDown={(e) => handleKeyDown(e, i, "name")}
                    onBlur={() => handleBlur(i)}
                    placeholder={row.isNew ? "Type market name and press Enter..." : ""}
                    className="h-8"
                  />
                </TableCell>
                <TableCell className="p-1 text-center">
                  <Checkbox
                    checked={row.active}
                    onCheckedChange={(checked) => {
                      updateRow(i, "active", !!checked);
                      if (!row.isNew && row.id) {
                        updateMutation.mutate({
                          id: row.id,
                          data: {
                            code: row.code.trim().toUpperCase(),
                            name: row.name.trim(),
                            active: !!checked,
                          },
                        });
                      }
                    }}
                  />
                </TableCell>
                <TableCell className="p-1">
                  {!row.isNew && row.id && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      disabled={deleteMutation.isPending}
                      onClick={() => deleteMutation.mutate({ id: row.id! })}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        <p className="mt-2 text-xs text-muted-foreground">
          Press Enter to save a row. Arrow Down on the last row adds a new line.
        </p>

        {error && (
          <p className="mt-2 text-sm text-destructive">{error}</p>
        )}
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Integrations Settings Tab
// ---------------------------------------------------------------------------

function IntegrationsSettings() {
  const { data } = trpc.settings.getCompanySettings.useQuery();
  const utils = trpc.useUtils();
  const updateMutation = trpc.settings.updateCompanySettings.useMutation({
    onSuccess: () => {
      toast.success("Settings saved");
      utils.settings.getCompanySettings.invalidate();
      utils.settings.getGooglePlacesKey.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const [gpKey, setGpKey] = useState("");
  const [gpKeyInit, setGpKeyInit] = useState(false);

  if (data && !gpKeyInit) {
    setGpKey(data.googlePlacesApiKey ?? "");
    setGpKeyInit(true);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Integrations</CardTitle>
        <CardDescription>
          Configure connections to external systems
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="googlePlaces">
          <TabsList>
            <TabsTrigger value="googlePlaces">Google Places</TabsTrigger>
            <TabsTrigger value="giata">GIATA</TabsTrigger>
          </TabsList>

          <TabsContent value="googlePlaces" className="mt-4 space-y-4">
            <p className="text-sm text-muted-foreground">
              Google Places API enables address autocomplete and geo-coding
              when creating or editing hotels. Enter your API key below.
            </p>
            <div className="max-w-md space-y-1.5">
              <Label>API Key</Label>
              <Input
                type="password"
                placeholder="Enter your Google Places API key"
                value={gpKey}
                onChange={(e) => setGpKey(e.target.value)}
              />
            </div>
            <Button
              disabled={updateMutation.isPending}
              onClick={() =>
                updateMutation.mutate({
                  googlePlacesApiKey: gpKey || null,
                })
              }
            >
              {updateMutation.isPending ? "Saving..." : "Save"}
            </Button>
          </TabsContent>

          <TabsContent value="giata" className="mt-4 space-y-4">
            <p className="text-sm text-muted-foreground">
              GIATA provides hotel content data (descriptions, images, amenities).
              Configure your API credentials below to enable hotel content import.
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>API Base URL</Label>
                <Input placeholder="https://api.giata.com/v1" disabled />
              </div>
              <div className="space-y-1.5">
                <Label>API Key</Label>
                <Input type="password" placeholder="Enter your GIATA API key" disabled />
              </div>
              <div className="space-y-1.5">
                <Label>Username</Label>
                <Input placeholder="GIATA username" disabled />
              </div>
              <div className="space-y-1.5">
                <Label>Password</Label>
                <Input type="password" placeholder="GIATA password" disabled />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Integration fields will be enabled once the GIATA API module is configured.
            </p>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
