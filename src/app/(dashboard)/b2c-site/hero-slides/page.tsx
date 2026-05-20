"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Plus, Trash2, GripVertical, Pencil } from "lucide-react";
import { ImageUploader } from "@/components/shared/image-uploader";

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
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { trpc } from "@/lib/trpc";
import { PermissionGuard } from "@/components/shared/permission-guard";

type SlideForm = {
  imageUrl: string;
  title: string;
  subtitle: string;
  ctaText: string;
  ctaLink: string;
  active: boolean;
};

const emptyForm: SlideForm = {
  imageUrl: "",
  title: "",
  subtitle: "",
  ctaText: "",
  ctaLink: "",
  active: true,
};

export default function HeroSlidesPage() {
  const { data: slides, isLoading } = trpc.b2cSite.heroSlide.list.useQuery();
  const utils = trpc.useUtils();
  const t = useTranslations("b2cSite");
  const tc = useTranslations("common");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<SlideForm>(emptyForm);

  const createMutation = trpc.b2cSite.heroSlide.create.useMutation({
    onSuccess: () => { toast.success(tc("created")); utils.b2cSite.heroSlide.list.invalidate(); setDialogOpen(false); },
    onError: (err) => toast.error(err.message),
  });
  const updateMutation = trpc.b2cSite.heroSlide.update.useMutation({
    onSuccess: () => { toast.success(tc("updated")); utils.b2cSite.heroSlide.list.invalidate(); setDialogOpen(false); },
    onError: (err) => toast.error(err.message),
  });
  const deleteMutation = trpc.b2cSite.heroSlide.delete.useMutation({
    onSuccess: () => { toast.success(tc("deleted")); utils.b2cSite.heroSlide.list.invalidate(); },
    onError: (err) => toast.error(err.message),
  });

  const openCreate = () => { setEditId(null); setForm(emptyForm); setDialogOpen(true); };
  const openEdit = (slide: NonNullable<typeof slides>[number]) => {
    setEditId(slide.id);
    setForm({
      imageUrl: slide.imageUrl,
      title: slide.title ?? "",
      subtitle: slide.subtitle ?? "",
      ctaText: slide.ctaText ?? "",
      ctaLink: slide.ctaLink ?? "",
      active: slide.active,
    });
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!form.imageUrl) { toast.error(tc("required")); return; }
    if (editId) {
      updateMutation.mutate({ id: editId, ...form, title: form.title || null, subtitle: form.subtitle || null, ctaText: form.ctaText || null, ctaLink: form.ctaLink || null });
    } else {
      createMutation.mutate({ ...form, title: form.title || null, subtitle: form.subtitle || null, ctaText: form.ctaText || null, ctaLink: form.ctaLink || null, sortOrder: (slides?.length ?? 0) });
    }
  };

  return (

    <PermissionGuard permission="b2c-site:heroSlide:read">
      <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("heroSlides")}</h1>
          <p className="text-muted-foreground">{t("heroSlidesDesc")}</p>
        </div>
        <Button onClick={openCreate}><Plus className="mr-1.5 h-4 w-4" />{t("newHeroSlide")}</Button>
      </div>

      {isLoading ? (
        <Card><CardContent className="py-10 text-center text-muted-foreground">{tc("loading")}</CardContent></Card>
      ) : !slides?.length ? (
        <Card><CardContent className="py-10 text-center text-muted-foreground">{t("noHeroSlides")}</CardContent></Card>
      ) : (
        <div className="grid gap-3">
          {slides.map((slide) => (
            <Card key={slide.id} className="flex items-center gap-4 p-4">
              <GripVertical className="h-5 w-5 shrink-0 text-muted-foreground" />
              <div className="h-16 w-24 shrink-0 overflow-hidden rounded-md bg-muted">
                <img src={slide.imageUrl} alt={slide.title ?? "Slide"} className="h-full w-full object-cover" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-medium">{slide.title || "Untitled Slide"}</p>
                <p className="truncate text-sm text-muted-foreground">{slide.subtitle || "No subtitle"}</p>
              </div>
              <span className={`rounded-full px-2 py-0.5 text-xs ${slide.active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                {slide.active ? t("active") : t("inactive")}
              </span>
              <Button variant="ghost" size="icon" onClick={() => openEdit(slide)}><Pencil className="h-4 w-4" /></Button>
              <Button variant="ghost" size="icon" onClick={() => { if (confirm("Delete this slide?")) deleteMutation.mutate({ id: slide.id }); }}><Trash2 className="h-4 w-4 text-destructive" /></Button>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editId ? t("heroSlide") : t("newHeroSlide")}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <ImageUploader
              value={form.imageUrl || null}
              onChange={(url) => setForm({ ...form, imageUrl: url ?? "" })}
              folder="b2c"
              label={`${t("heroSlide")} *`}
              hint="Recommended: 1920x800px. PNG, JPG, or WEBP."
            />
            <div className="space-y-1.5"><Label>{t("headline")}</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>{t("subtitle")}</Label><Input value={form.subtitle} onChange={(e) => setForm({ ...form, subtitle: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>{t("ctaButton")}</Label><Input value={form.ctaText} onChange={(e) => setForm({ ...form, ctaText: e.target.value })} placeholder="Book Now" /></div>
              <div className="space-y-1.5"><Label>{t("ctaUrl")}</Label><Input value={form.ctaLink} onChange={(e) => setForm({ ...form, ctaLink: e.target.value })} placeholder="/search" /></div>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={form.active} onCheckedChange={(v) => setForm({ ...form, active: v })} />
              <Label>{t("active")}</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>{tc("cancel")}</Button>
            <Button onClick={handleSave} disabled={createMutation.isPending || updateMutation.isPending}>{tc("save")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  

    </PermissionGuard>

  );
}
