"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Palette, Type, Layout, ToggleLeft, Globe, Share2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";

const THEME_PRESETS = {
  MODERN_BOLD: {
    label: "Modern Bold",
    colors: { primary: "#2563eb", secondary: "#f97316", accent: "#06b6d4", bg: "#ffffff", fg: "#0f172a" },
    fonts: { heading: "Poppins", body: "Inter" },
  },
  CLEAN_TRUSTWORTHY: {
    label: "Clean & Trustworthy",
    colors: { primary: "#0d9488", secondary: "#f59e0b", accent: "#8b5cf6", bg: "#ffffff", fg: "#1e293b" },
    fonts: { heading: "DM Sans", body: "Inter" },
  },
  WARM_INVITING: {
    label: "Warm & Inviting",
    colors: { primary: "#ea580c", secondary: "#0891b2", accent: "#d946ef", bg: "#fffbeb", fg: "#292524" },
    fonts: { heading: "Playfair Display", body: "Lato" },
  },
  LUXURY_ELEGANT: {
    label: "Luxury Elegant",
    colors: { primary: "#1e293b", secondary: "#b45309", accent: "#a16207", bg: "#fafaf9", fg: "#0c0a09" },
    fonts: { heading: "Playfair Display", body: "Source Sans 3" },
  },
} as const;

const FONT_OPTIONS = [
  "Inter", "Poppins", "Roboto", "Open Sans", "Lato", "Montserrat", "Raleway",
  "Playfair Display", "DM Sans", "DM Serif Display", "Nunito", "Source Sans 3",
  "Manrope", "Plus Jakarta Sans",
];

type FormState = {
  themePreset: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  backgroundColor: string;
  foregroundColor: string;
  cardColor: string;
  mutedColor: string;
  headingFont: string;
  bodyFont: string;
  headerStyle: string;
  buttonStyle: string;
  heroStyle: string;
  footerColumns: number;
  siteTitle: string;
  siteDescription: string;
  metaKeywords: string;
  facebook: string;
  instagram: string;
  twitter: string;
  youtube: string;
  linkedin: string;
  tiktok: string;
  whatsapp: string;
  contactEmail: string;
  contactPhone: string;
  contactAddress: string;
  enableBlog: boolean;
  enableFaq: boolean;
  enableReviews: boolean;
  enableNewsletter: boolean;
  enableB2bPortal: boolean;
  enableOnlinePayment: boolean;
  enableInquiryMode: boolean;
  showPrices: boolean;
  yearsInBusiness: string;
  happyGuests: string;
  customCss: string;
};

export default function B2cSiteBrandingPage() {
  const { data, isLoading } = trpc.b2cSite.branding.get.useQuery();
  const utils = trpc.useUtils();
  const updateMutation = trpc.b2cSite.branding.update.useMutation({
    onSuccess: () => {
      toast.success("Branding saved");
      utils.b2cSite.branding.get.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const [form, setForm] = useState<FormState | null>(null);

  const defaultPreset = THEME_PRESETS.MODERN_BOLD;
  const defaultForm: FormState = {
    themePreset: "MODERN_BOLD",
    primaryColor: defaultPreset.colors.primary,
    secondaryColor: defaultPreset.colors.secondary,
    accentColor: defaultPreset.colors.accent,
    backgroundColor: defaultPreset.colors.bg,
    foregroundColor: defaultPreset.colors.fg,
    cardColor: "#ffffff",
    mutedColor: "#f1f5f9",
    headingFont: defaultPreset.fonts.heading,
    bodyFont: defaultPreset.fonts.body,
    headerStyle: "MEGA_MENU",
    buttonStyle: "ROUNDED",
    heroStyle: "SLIDER",
    footerColumns: 4,
    siteTitle: "",
    siteDescription: "",
    metaKeywords: "",
    facebook: "",
    instagram: "",
    twitter: "",
    youtube: "",
    linkedin: "",
    tiktok: "",
    whatsapp: "",
    contactEmail: "",
    contactPhone: "",
    contactAddress: "",
    enableBlog: true,
    enableFaq: true,
    enableReviews: true,
    enableNewsletter: true,
    enableB2bPortal: false,
    enableOnlinePayment: false,
    enableInquiryMode: false,
    showPrices: true,
    yearsInBusiness: "",
    happyGuests: "",
    customCss: "",
  };

  useEffect(() => {
    if (isLoading) return;
    if (data) {
      setForm({
        themePreset: data.themePreset,
        primaryColor: data.primaryColor,
        secondaryColor: data.secondaryColor,
        accentColor: data.accentColor,
        backgroundColor: data.backgroundColor,
        foregroundColor: data.foregroundColor,
        cardColor: data.cardColor,
        mutedColor: data.mutedColor,
        headingFont: data.headingFont,
        bodyFont: data.bodyFont,
        headerStyle: data.headerStyle,
        buttonStyle: data.buttonStyle,
        heroStyle: data.heroStyle,
        footerColumns: data.footerColumns,
        siteTitle: data.siteTitle ?? "",
        siteDescription: data.siteDescription ?? "",
        metaKeywords: data.metaKeywords ?? "",
        facebook: data.facebook ?? "",
        instagram: data.instagram ?? "",
        twitter: data.twitter ?? "",
        youtube: data.youtube ?? "",
        linkedin: data.linkedin ?? "",
        tiktok: data.tiktok ?? "",
        whatsapp: data.whatsapp ?? "",
        contactEmail: data.contactEmail ?? "",
        contactPhone: data.contactPhone ?? "",
        contactAddress: data.contactAddress ?? "",
        enableBlog: data.enableBlog,
        enableFaq: data.enableFaq,
        enableReviews: data.enableReviews,
        enableNewsletter: data.enableNewsletter,
        enableB2bPortal: data.enableB2bPortal,
        enableOnlinePayment: data.enableOnlinePayment,
        enableInquiryMode: data.enableInquiryMode,
        showPrices: data.showPrices,
        yearsInBusiness: data.yearsInBusiness?.toString() ?? "",
        happyGuests: data.happyGuests?.toString() ?? "",
        customCss: data.customCss ?? "",
      });
    } else {
      setForm(defaultForm);
    }
  }, [data, isLoading]); // eslint-disable-line react-hooks/exhaustive-deps

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm((prev) => (prev ? { ...prev, [k]: v } : prev));

  const applyPreset = (preset: keyof typeof THEME_PRESETS) => {
    const p = THEME_PRESETS[preset];
    setForm((prev) =>
      prev
        ? {
            ...prev,
            themePreset: preset,
            primaryColor: p.colors.primary,
            secondaryColor: p.colors.secondary,
            accentColor: p.colors.accent,
            backgroundColor: p.colors.bg,
            foregroundColor: p.colors.fg,
            headingFont: p.fonts.heading,
            bodyFont: p.fonts.body,
          }
        : prev,
    );
  };

  const handleSave = () => {
    if (!form) return;
    updateMutation.mutate({
      themePreset: form.themePreset as "MODERN_BOLD",
      primaryColor: form.primaryColor,
      secondaryColor: form.secondaryColor,
      accentColor: form.accentColor,
      backgroundColor: form.backgroundColor,
      foregroundColor: form.foregroundColor,
      cardColor: form.cardColor,
      mutedColor: form.mutedColor,
      headingFont: form.headingFont,
      bodyFont: form.bodyFont,
      headerStyle: form.headerStyle as "MEGA_MENU",
      buttonStyle: form.buttonStyle as "ROUNDED",
      heroStyle: form.heroStyle as "SLIDER",
      footerColumns: form.footerColumns,
      siteTitle: form.siteTitle || null,
      siteDescription: form.siteDescription || null,
      metaKeywords: form.metaKeywords || null,
      facebook: form.facebook || null,
      instagram: form.instagram || null,
      twitter: form.twitter || null,
      youtube: form.youtube || null,
      linkedin: form.linkedin || null,
      tiktok: form.tiktok || null,
      whatsapp: form.whatsapp || null,
      contactEmail: form.contactEmail || null,
      contactPhone: form.contactPhone || null,
      contactAddress: form.contactAddress || null,
      enableBlog: form.enableBlog,
      enableFaq: form.enableFaq,
      enableReviews: form.enableReviews,
      enableNewsletter: form.enableNewsletter,
      enableB2bPortal: form.enableB2bPortal,
      enableOnlinePayment: form.enableOnlinePayment,
      enableInquiryMode: form.enableInquiryMode,
      showPrices: form.showPrices,
      yearsInBusiness: form.yearsInBusiness ? parseInt(form.yearsInBusiness) : null,
      happyGuests: form.happyGuests ? parseInt(form.happyGuests) : null,
      customCss: form.customCss || null,
    });
  };

  if (isLoading || !form) {
    return (
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">B2C Website Branding</h1>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">B2C Website Branding</h1>
          <p className="text-muted-foreground">
            Customize the look and feel of your public-facing website
          </p>
        </div>
        <Button onClick={handleSave} disabled={updateMutation.isPending}>
          {updateMutation.isPending ? "Saving..." : "Save Changes"}
        </Button>
      </div>

      <Tabs defaultValue="presets">
        <TabsList>
          <TabsTrigger value="presets"><Palette className="mr-1.5 h-3.5 w-3.5" />Theme</TabsTrigger>
          <TabsTrigger value="colors"><Palette className="mr-1.5 h-3.5 w-3.5" />Colors</TabsTrigger>
          <TabsTrigger value="typography"><Type className="mr-1.5 h-3.5 w-3.5" />Typography</TabsTrigger>
          <TabsTrigger value="layout"><Layout className="mr-1.5 h-3.5 w-3.5" />Layout</TabsTrigger>
          <TabsTrigger value="seo"><Globe className="mr-1.5 h-3.5 w-3.5" />SEO</TabsTrigger>
          <TabsTrigger value="social"><Share2 className="mr-1.5 h-3.5 w-3.5" />Social & Contact</TabsTrigger>
          <TabsTrigger value="features"><ToggleLeft className="mr-1.5 h-3.5 w-3.5" />Features</TabsTrigger>
        </TabsList>

        {/* Theme Presets */}
        <TabsContent value="presets" className="mt-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {(Object.entries(THEME_PRESETS) as [keyof typeof THEME_PRESETS, (typeof THEME_PRESETS)[keyof typeof THEME_PRESETS]][]).map(
              ([key, preset]) => (
                <Card
                  key={key}
                  className={`cursor-pointer transition-all ${form.themePreset === key ? "ring-2 ring-primary" : ""}`}
                  onClick={() => applyPreset(key)}
                >
                  <CardContent className="p-4">
                    <div className="mb-3 flex gap-1.5">
                      {Object.values(preset.colors).map((c, i) => (
                        <div
                          key={i}
                          className="h-6 w-6 rounded-full border"
                          style={{ backgroundColor: c }}
                        />
                      ))}
                    </div>
                    <h3 className="font-medium">{preset.label}</h3>
                    <p className="text-xs text-muted-foreground">
                      {preset.fonts.heading} / {preset.fonts.body}
                    </p>
                  </CardContent>
                </Card>
              ),
            )}
          </div>
        </TabsContent>

        {/* Colors */}
        <TabsContent value="colors" className="mt-4">
          <Card>
            <CardContent className="grid gap-4 p-6 sm:grid-cols-2 lg:grid-cols-4">
              <ColorPicker label="Primary" value={form.primaryColor} onChange={(v) => set("primaryColor", v)} />
              <ColorPicker label="Secondary" value={form.secondaryColor} onChange={(v) => set("secondaryColor", v)} />
              <ColorPicker label="Accent" value={form.accentColor} onChange={(v) => set("accentColor", v)} />
              <ColorPicker label="Background" value={form.backgroundColor} onChange={(v) => set("backgroundColor", v)} />
              <ColorPicker label="Foreground" value={form.foregroundColor} onChange={(v) => set("foregroundColor", v)} />
              <ColorPicker label="Card" value={form.cardColor} onChange={(v) => set("cardColor", v)} />
              <ColorPicker label="Muted" value={form.mutedColor} onChange={(v) => set("mutedColor", v)} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Typography */}
        <TabsContent value="typography" className="mt-4">
          <Card>
            <CardContent className="grid gap-4 p-6 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Heading Font</Label>
                <Select value={form.headingFont} onValueChange={(v) => set("headingFont", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {FONT_OPTIONS.map((f) => (
                      <SelectItem key={f} value={f}>{f}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Body Font</Label>
                <Select value={form.bodyFont} onValueChange={(v) => set("bodyFont", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {FONT_OPTIONS.map((f) => (
                      <SelectItem key={f} value={f}>{f}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Layout */}
        <TabsContent value="layout" className="mt-4">
          <Card>
            <CardContent className="grid gap-4 p-6 sm:grid-cols-2 lg:grid-cols-3">
              <div className="space-y-1.5">
                <Label>Header Style</Label>
                <Select value={form.headerStyle} onValueChange={(v) => set("headerStyle", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TRANSPARENT">Transparent</SelectItem>
                    <SelectItem value="SOLID">Solid</SelectItem>
                    <SelectItem value="MEGA_MENU">Mega Menu</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Button Style</Label>
                <Select value={form.buttonStyle} onValueChange={(v) => set("buttonStyle", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PILL">Pill</SelectItem>
                    <SelectItem value="ROUNDED">Rounded</SelectItem>
                    <SelectItem value="SQUARE">Square</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Hero Style</Label>
                <Select value={form.heroStyle} onValueChange={(v) => set("heroStyle", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SLIDER">Slider</SelectItem>
                    <SelectItem value="VIDEO">Video</SelectItem>
                    <SelectItem value="STATIC">Static</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Footer Columns</Label>
                <Select value={String(form.footerColumns)} onValueChange={(v) => set("footerColumns", parseInt(v))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="3">3 Columns</SelectItem>
                    <SelectItem value="4">4 Columns</SelectItem>
                    <SelectItem value="5">5 Columns</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* SEO */}
        <TabsContent value="seo" className="mt-4">
          <Card>
            <CardContent className="grid gap-4 p-6">
              <div className="space-y-1.5">
                <Label>Site Title</Label>
                <Input value={form.siteTitle} onChange={(e) => set("siteTitle", e.target.value)} placeholder="My Travel Company" />
              </div>
              <div className="space-y-1.5">
                <Label>Site Description</Label>
                <Textarea value={form.siteDescription} onChange={(e) => set("siteDescription", e.target.value)} placeholder="Your trusted travel partner..." rows={3} />
              </div>
              <div className="space-y-1.5">
                <Label>Meta Keywords</Label>
                <Input value={form.metaKeywords} onChange={(e) => set("metaKeywords", e.target.value)} placeholder="travel, hotels, egypt, tours" />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Social & Contact */}
        <TabsContent value="social" className="mt-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Social Links</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3">
                <div className="space-y-1.5"><Label>Facebook</Label><Input value={form.facebook} onChange={(e) => set("facebook", e.target.value)} placeholder="https://facebook.com/..." /></div>
                <div className="space-y-1.5"><Label>Instagram</Label><Input value={form.instagram} onChange={(e) => set("instagram", e.target.value)} placeholder="https://instagram.com/..." /></div>
                <div className="space-y-1.5"><Label>Twitter / X</Label><Input value={form.twitter} onChange={(e) => set("twitter", e.target.value)} placeholder="https://x.com/..." /></div>
                <div className="space-y-1.5"><Label>YouTube</Label><Input value={form.youtube} onChange={(e) => set("youtube", e.target.value)} placeholder="https://youtube.com/..." /></div>
                <div className="space-y-1.5"><Label>LinkedIn</Label><Input value={form.linkedin} onChange={(e) => set("linkedin", e.target.value)} placeholder="https://linkedin.com/..." /></div>
                <div className="space-y-1.5"><Label>TikTok</Label><Input value={form.tiktok} onChange={(e) => set("tiktok", e.target.value)} placeholder="https://tiktok.com/..." /></div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Contact Information</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3">
                <div className="space-y-1.5"><Label>Email</Label><Input type="email" value={form.contactEmail} onChange={(e) => set("contactEmail", e.target.value)} /></div>
                <div className="space-y-1.5"><Label>Phone</Label><Input value={form.contactPhone} onChange={(e) => set("contactPhone", e.target.value)} /></div>
                <div className="space-y-1.5"><Label>WhatsApp</Label><Input value={form.whatsapp} onChange={(e) => set("whatsapp", e.target.value)} placeholder="+20..." /></div>
                <div className="space-y-1.5"><Label>Address</Label><Textarea value={form.contactAddress} onChange={(e) => set("contactAddress", e.target.value)} rows={2} /></div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Features */}
        <TabsContent value="features" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Feature Flags</CardTitle>
              <CardDescription>Enable or disable sections on your public website</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <ToggleField label="Blog" checked={form.enableBlog} onChange={(v) => set("enableBlog", v)} />
              <ToggleField label="FAQ" checked={form.enableFaq} onChange={(v) => set("enableFaq", v)} />
              <ToggleField label="Guest Reviews" checked={form.enableReviews} onChange={(v) => set("enableReviews", v)} />
              <ToggleField label="Newsletter" checked={form.enableNewsletter} onChange={(v) => set("enableNewsletter", v)} />
              <ToggleField label="B2B Portal" checked={form.enableB2bPortal} onChange={(v) => set("enableB2bPortal", v)} />
              <ToggleField label="Online Payment" checked={form.enableOnlinePayment} onChange={(v) => set("enableOnlinePayment", v)} />
              <ToggleField label="Inquiry Mode" checked={form.enableInquiryMode} onChange={(v) => set("enableInquiryMode", v)} />
              <ToggleField label="Show Prices" checked={form.showPrices} onChange={(v) => set("showPrices", v)} />
              <div className="space-y-1.5">
                <Label>Years in Business</Label>
                <Input type="number" value={form.yearsInBusiness} onChange={(e) => set("yearsInBusiness", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Happy Guests Count</Label>
                <Input type="number" value={form.happyGuests} onChange={(e) => set("happyGuests", e.target.value)} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ColorPicker({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-9 w-9 cursor-pointer rounded border p-0.5"
        />
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="font-mono text-xs"
          maxLength={7}
        />
      </div>
    </div>
  );
}

function ToggleField({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between rounded-lg border p-3">
      <Label className="cursor-pointer">{label}</Label>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}
