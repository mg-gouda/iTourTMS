"use client";

import {
  Bus,
  CalendarCheck,
  Check,
  ChevronLeft,
  ChevronRight,
  FileText,
  KeyRound,
  Landmark,
  Lock,
  Rocket,
  Users,
} from "lucide-react";

import { PasswordStrength } from "@/components/shared/password-strength";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MODULE_REGISTRY } from "@/lib/constants/modules";
import { trpc } from "@/lib/trpc";
import type { ModuleName } from "@/types";

const iconMap: Record<string, React.ElementType> = {
  Landmark,
  FileText,
  Users,
  CalendarCheck,
  Bus,
};

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const STEPS = [
  { number: 1, title: "License" },
  { number: 2, title: "Company" },
  { number: 3, title: "Modules" },
  { number: 4, title: "Configure" },
  { number: 5, title: "Admin" },
];

interface SetupWizardProps {
  countries: { id: string; code: string; name: string }[];
  currencies: { id: string; code: string; name: string; symbol: string }[];
  existingLicenseId?: string | null;
}

export function SetupWizard({ countries, currencies, existingLicenseId }: SetupWizardProps) {
  const router = useRouter();
  // If license already activated, skip to step 2
  const [step, setStep] = useState(existingLicenseId ? 2 : 1);
  const [loading, setLoading] = useState(false);

  // Step 1: License
  const [licenseKey, setLicenseKey] = useState("");
  const [licenseId, setLicenseId] = useState<string | null>(existingLicenseId ?? null);
  const [licenseError, setLicenseError] = useState("");
  const [activating, setActivating] = useState(false);

  // Step 2: Company
  const [companyName, setCompanyName] = useState("");
  const [legalName, setLegalName] = useState("");
  const [taxId, setTaxId] = useState("");
  const [countryId, setCountryId] = useState("");
  const [baseCurrencyId, setBaseCurrencyId] = useState("");
  const [fiscalYearStart, setFiscalYearStart] = useState("1");
  const [fiscalYearEnd, setFiscalYearEnd] = useState("12");
  const [timezone, setTimezone] = useState("UTC");

  // Step 3: Modules
  const [selectedModules, setSelectedModules] = useState<string[]>([
    "finance",
    "contracting",
  ]);

  // Step 5: Admin
  const [adminName, setAdminName] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [adminConfirm, setAdminConfirm] = useState("");

  const activateLicense = trpc.setup.activateLicense.useMutation({
    onSuccess: (data) => {
      setLicenseId(data.licenseId);
      setLicenseError("");
      setActivating(false);
      toast.success("License activated successfully!");
      setStep(2);
    },
    onError: (err) => {
      setLicenseError(err.message);
      setActivating(false);
    },
  });

  const completeSetup = trpc.setup.completeSetup.useMutation({
    onSuccess: () => {
      toast.success("iTourTMS is ready!");
      router.push("/login");
      router.refresh();
    },
    onError: (err) => {
      toast.error(err.message);
      setLoading(false);
    },
  });

  function handleActivateLicense() {
    if (!licenseKey.trim()) {
      setLicenseError("Please enter a license key");
      return;
    }
    setActivating(true);
    setLicenseError("");
    activateLicense.mutate({ key: licenseKey.trim() });
  }

  function toggleModule(name: string) {
    const mod = MODULE_REGISTRY.find((m) => m.name === name);
    if (!mod?.isAvailable) return;

    setSelectedModules((prev) => {
      if (prev.includes(name)) {
        // Uninstalling — also remove modules that depend on this one
        const dependents = MODULE_REGISTRY.filter((m) =>
          m.dependencies.includes(name as ModuleName),
        ).map((m) => m.name);
        return prev.filter((m) => m !== name && !dependents.includes(m as ModuleName));
      } else {
        // Installing — also install required dependencies
        const deps = mod.dependencies.filter((d) => !prev.includes(d));
        return [...prev, ...deps, name];
      }
    });
  }

  function canProceed(): boolean {
    switch (step) {
      case 1:
        return !!licenseId;
      case 2:
        return companyName.trim().length > 0;
      case 3:
        return selectedModules.length > 0;
      case 4:
        return true;
      case 5:
        return (
          adminName.trim().length > 0 &&
          adminEmail.includes("@") &&
          adminPassword.length >= 8 &&
          adminPassword === adminConfirm
        );
      default:
        return false;
    }
  }

  async function handleFinish() {
    if (!canProceed() || !licenseId) return;
    setLoading(true);

    completeSetup.mutate({
      licenseId,
      company: {
        name: companyName,
        legalName: legalName || undefined,
        taxId: taxId || undefined,
        countryId: countryId || undefined,
        baseCurrencyId: baseCurrencyId || undefined,
        fiscalYearStart: parseInt(fiscalYearStart),
        fiscalYearEnd: parseInt(fiscalYearEnd),
        timezone,
      },
      modules: selectedModules,
      moduleConfig: {},
      admin: {
        name: adminName,
        email: adminEmail,
        password: adminPassword,
      },
    });
  }

  return (
    <div className="space-y-6">
      {/* Progress stepper */}
      <div className="flex items-center justify-center gap-1">
        {STEPS.map((s, i) => (
          <div key={s.number} className="flex items-center">
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium transition-colors ${
                step > s.number
                  ? "bg-green-600 text-white"
                  : step === s.number
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
              }`}
            >
              {step > s.number ? <Check className="h-4 w-4" /> : s.number}
            </div>
            <span
              className={`ml-1.5 hidden text-sm sm:inline ${
                step === s.number
                  ? "font-medium text-foreground"
                  : "text-muted-foreground"
              }`}
            >
              {s.title}
            </span>
            {i < STEPS.length - 1 && (
              <div
                className={`mx-3 h-px w-8 ${
                  step > s.number ? "bg-green-600" : "bg-muted"
                }`}
              />
            )}
          </div>
        ))}
      </div>

      {/* Step content */}
      <Card>
        {/* Step 1: License Activation */}
        {step === 1 && (
          <>
            <CardHeader className="text-center">
              <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                <KeyRound className="h-7 w-7 text-primary" />
              </div>
              <CardTitle>Activate Your License</CardTitle>
              <p className="text-sm text-muted-foreground">
                Enter the license key provided by your system administrator
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="mx-auto max-w-md space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="licenseKey">
                    License Key <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="licenseKey"
                    value={licenseKey}
                    onChange={(e) => {
                      setLicenseKey(e.target.value);
                      setLicenseError("");
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleActivateLicense();
                    }}
                    placeholder="xxxx-xxxx-xxxx-xxxx"
                    className="font-mono text-center text-lg tracking-wider"
                    disabled={activating || !!licenseId}
                  />
                  {licenseError && (
                    <p className="text-sm text-destructive">{licenseError}</p>
                  )}
                </div>

                {licenseId ? (
                  <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-center dark:border-green-800 dark:bg-green-950">
                    <div className="flex items-center justify-center gap-2 text-sm font-medium text-green-700 dark:text-green-300">
                      <Check className="h-4 w-4" />
                      License activated successfully
                    </div>
                  </div>
                ) : (
                  <Button
                    onClick={handleActivateLicense}
                    disabled={activating || !licenseKey.trim()}
                    className="w-full"
                  >
                    {activating ? "Validating..." : "Activate License"}
                  </Button>
                )}
              </div>
            </CardContent>
          </>
        )}

        {/* Step 2: Company Setup */}
        {step === 2 && (
          <>
            <CardHeader>
              <CardTitle>Welcome to iTourTMS</CardTitle>
              <p className="text-sm text-muted-foreground">
                Let&apos;s set up your company
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="companyName">
                    Company Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="companyName"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="Your company name"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="legalName">Legal Name</Label>
                  <Input
                    id="legalName"
                    value={legalName}
                    onChange={(e) => setLegalName(e.target.value)}
                    placeholder="Legal entity name"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="taxId">Tax ID / VAT</Label>
                  <Input
                    id="taxId"
                    value={taxId}
                    onChange={(e) => setTaxId(e.target.value)}
                    placeholder="Tax identification number"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label>Country</Label>
                  <Select value={countryId} onValueChange={setCountryId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select country" />
                    </SelectTrigger>
                    <SelectContent>
                      {countries.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label>Base Currency</Label>
                  <Select
                    value={baseCurrencyId}
                    onValueChange={setBaseCurrencyId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select currency" />
                    </SelectTrigger>
                    <SelectContent>
                      {currencies.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.code} — {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label>Fiscal Year Start</Label>
                  <Select
                    value={fiscalYearStart}
                    onValueChange={setFiscalYearStart}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {MONTHS.map((m, i) => (
                        <SelectItem key={i} value={String(i + 1)}>
                          {m}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label>Fiscal Year End</Label>
                  <Select
                    value={fiscalYearEnd}
                    onValueChange={setFiscalYearEnd}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {MONTHS.map((m, i) => (
                        <SelectItem key={i} value={String(i + 1)}>
                          {m}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <Label>Timezone</Label>
                  <Select value={timezone} onValueChange={setTimezone}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="UTC">UTC</SelectItem>
                      <SelectItem value="Africa/Cairo">
                        Africa/Cairo (EET)
                      </SelectItem>
                      <SelectItem value="Europe/London">
                        Europe/London (GMT)
                      </SelectItem>
                      <SelectItem value="Europe/Istanbul">
                        Europe/Istanbul (TRT)
                      </SelectItem>
                      <SelectItem value="Asia/Dubai">
                        Asia/Dubai (GST)
                      </SelectItem>
                      <SelectItem value="Europe/Moscow">
                        Europe/Moscow (MSK)
                      </SelectItem>
                      <SelectItem value="Europe/Paris">
                        Europe/Paris (CET)
                      </SelectItem>
                      <SelectItem value="America/New_York">
                        America/New_York (EST)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </>
        )}

        {/* Step 3: Install Modules */}
        {step === 3 && (
          <>
            <CardHeader>
              <CardTitle>Choose Modules to Install</CardTitle>
              <p className="text-sm text-muted-foreground">
                Select the modules your business needs. You can install more
                later.
              </p>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {MODULE_REGISTRY.map((mod) => {
                  const Icon = iconMap[mod.icon] || FileText;
                  const isSelected = selectedModules.includes(mod.name);

                  return (
                    <button
                      key={mod.name}
                      onClick={() => toggleModule(mod.name)}
                      disabled={!mod.isAvailable}
                      className={`relative rounded-lg border p-4 text-left transition-all ${
                        !mod.isAvailable
                          ? "cursor-not-allowed opacity-50"
                          : isSelected
                            ? "border-primary bg-primary/5 ring-1 ring-primary"
                            : "hover:border-primary/50"
                      }`}
                    >
                      {!mod.isAvailable && (
                        <Lock className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
                      )}
                      {isSelected && (
                        <div className="absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full bg-primary">
                          <Check className="h-3 w-3 text-primary-foreground" />
                        </div>
                      )}

                      <Icon className="mb-2 h-8 w-8 text-muted-foreground" />
                      <h3 className="font-semibold">{mod.displayName}</h3>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {mod.description}
                      </p>

                      {mod.dependencies.length > 0 && (
                        <div className="mt-2">
                          <Badge variant="outline" className="text-[10px]">
                            Requires:{" "}
                            {mod.dependencies
                              .map(
                                (d) =>
                                  MODULE_REGISTRY.find((m) => m.name === d)
                                    ?.displayName,
                              )
                              .join(", ")}
                          </Badge>
                        </div>
                      )}

                      {!mod.isAvailable && (
                        <Badge
                          variant="secondary"
                          className="mt-2 text-[10px]"
                        >
                          Coming Soon
                        </Badge>
                      )}
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </>
        )}

        {/* Step 4: Module Configuration */}
        {step === 4 && (
          <>
            <CardHeader>
              <CardTitle>Configure Your Modules</CardTitle>
              <p className="text-sm text-muted-foreground">
                Set up default configurations for your selected modules
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              {selectedModules.includes("finance") && (
                <div className="space-y-3 rounded-lg border p-4">
                  <h3 className="flex items-center gap-2 font-semibold">
                    <Landmark className="h-4 w-4" />
                    Finance
                  </h3>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label>Chart of Accounts</Label>
                      <Select defaultValue="standard">
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="standard">Standard</SelectItem>
                          <SelectItem value="ifrs">IFRS</SelectItem>
                          <SelectItem value="custom">Custom</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Default Tax Rate</Label>
                      <Select defaultValue="14">
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="0">No Tax (0%)</SelectItem>
                          <SelectItem value="5">VAT 5%</SelectItem>
                          <SelectItem value="10">VAT 10%</SelectItem>
                          <SelectItem value="14">VAT 14%</SelectItem>
                          <SelectItem value="15">VAT 15%</SelectItem>
                          <SelectItem value="20">VAT 20%</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              )}

              {selectedModules.includes("contracting") && (
                <div className="space-y-3 rounded-lg border p-4">
                  <h3 className="flex items-center gap-2 font-semibold">
                    <FileText className="h-4 w-4" />
                    Contracting
                  </h3>
                  <div className="space-y-1.5">
                    <Label>Default Rate Basis</Label>
                    <Select defaultValue="per_person">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="per_person">Per Person</SelectItem>
                        <SelectItem value="per_room">Per Room</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              {selectedModules.includes("crm") && (
                <div className="space-y-3 rounded-lg border p-4">
                  <h3 className="flex items-center gap-2 font-semibold">
                    <Users className="h-4 w-4" />
                    CRM
                  </h3>
                  <div className="space-y-1.5">
                    <Label>Pipeline Stages</Label>
                    <Select defaultValue="default">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="default">
                          Default (New → Qualified → Proposition → Won)
                        </SelectItem>
                        <SelectItem value="simple">
                          Simple (New → Won)
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              {selectedModules.includes("reservations") && (
                <div className="space-y-3 rounded-lg border p-4">
                  <h3 className="flex items-center gap-2 font-semibold">
                    <CalendarCheck className="h-4 w-4" />
                    Reservations
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Default booking policies and notification templates will be
                    created automatically.
                  </p>
                </div>
              )}

              {selectedModules.length === 0 && (
                <p className="py-8 text-center text-muted-foreground">
                  No modules selected. Go back to select modules.
                </p>
              )}
            </CardContent>
          </>
        )}

        {/* Step 5: Admin Account */}
        {step === 5 && (
          <>
            <CardHeader>
              <CardTitle>Create Administrator Account</CardTitle>
              <p className="text-sm text-muted-foreground">
                This will be the super admin with full access to all modules
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="adminName">
                  Full Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="adminName"
                  value={adminName}
                  onChange={(e) => setAdminName(e.target.value)}
                  placeholder="John Doe"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="adminEmail">
                  Email <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="adminEmail"
                  type="email"
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  placeholder="admin@company.com"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="adminPassword">
                  Password <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="adminPassword"
                  type="password"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  placeholder="Minimum 8 characters"
                />
                <PasswordStrength password={adminPassword} />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="adminConfirm">
                  Confirm Password <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="adminConfirm"
                  type="password"
                  value={adminConfirm}
                  onChange={(e) => setAdminConfirm(e.target.value)}
                  placeholder="Re-enter your password"
                />
                {adminConfirm && adminPassword !== adminConfirm && (
                  <p className="text-xs text-destructive">
                    Passwords do not match
                  </p>
                )}
              </div>
            </CardContent>
          </>
        )}

        {/* Navigation buttons */}
        <div className="flex items-center justify-between border-t px-6 py-4">
          <Button
            variant="outline"
            onClick={() => setStep((s) => s - 1)}
            disabled={step === 1 || (step === 2 && !!existingLicenseId) || loading}
          >
            <ChevronLeft className="mr-1 h-4 w-4" />
            Back
          </Button>

          {step < 5 ? (
            <Button
              onClick={() => setStep((s) => s + 1)}
              disabled={!canProceed()}
            >
              Next
              <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          ) : (
            <Button
              onClick={handleFinish}
              disabled={!canProceed() || loading}
            >
              {loading ? (
                "Setting up..."
              ) : (
                <>
                  <Rocket className="mr-1 h-4 w-4" />
                  Launch iTourTMS
                </>
              )}
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
}
