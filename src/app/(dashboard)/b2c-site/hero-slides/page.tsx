"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2, GripVertical, Pencil } from "lucide-react";

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
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<SlideForm>(emptyForm);

  const createMutation = trpc.b2cSite.heroSlide.create.useMutation({
    onSuccess: () => { toast.success("Slide created"); utils.b2cSite.heroSlide.list.invalidate(); setDialogOpen(false); },
    onError: (err) => toast.error(err.message),
  });
  const updateMutation = trpc.b2cSite.heroSlide.update.useMutation({
    onSuccess: () => { toast.success("Slide updated"); utils.b2cSite.heroSlide.list.invalidate(); setDialogOpen(false); },
    onError: (err) => toast.error(err.message),
  });
  const deleteMutation = trpc.b2cSite.heroSlide.delete.useMutation({
    onSuccess: () => { toast.success("Slide deleted"); utils.b2cSite.heroSlide.list.invalidate(); },
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
    if (!form.imageUrl) { toast.error("Image URL is required"); return; }
    if (editId) {
      updateMutation.mutate({ id: editId, ...form, title: form.title || null, subtitle: form.subtitle || null, ctaText: form.ctaText || null, ctaLink: form.ctaLink || null });
    } else {
      createMutation.mutate({ ...form, title: form.title || null, subtitle: form.subtitle || null, ctaText: form.ctaText || null, ctaLink: form.ctaLink || null, sortOrder: (slides?.length ?? 0) });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Hero Slides</h1>
          <p className="text-muted-foreground">Manage homepage hero slider images</p>
        </div>
        <Button onClick={openCreate}><Plus className="mr-1.5 h-4 w-4" />Add Slide</Button>
      </div>

      {isLoading ? (
        <Card><CardContent className="py-10 text-center text-muted-foreground">Loading...</CardContent></Card>
      ) : !slides?.length ? (
        <Card><CardContent className="py-10 text-center text-muted-foreground">No hero slides yet. Add your first one!</CardContent></Card>
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
                {slide.active ? "Active" : "Inactive"}
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
            <DialogTitle>{editId ? "Edit Slide" : "Add Slide"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="space-y-1.5"><Label>Image URL *</Label><Input value={form.imageUrl} onChange={(e) => setForm({ ...form, imageUrl: e.target.value })} placeholder="https://..." /></div>
            <div className="space-y-1.5"><Label>Title</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>Subtitle</Label><Input value={form.subtitle} onChange={(e) => setForm({ ...form, subtitle: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>CTA Text</Label><Input value={form.ctaText} onChange={(e) => setForm({ ...form, ctaText: e.target.value })} placeholder="Book Now" /></div>
              <div className="space-y-1.5"><Label>CTA Link</Label><Input value={form.ctaLink} onChange={(e) => setForm({ ...form, ctaLink: e.target.value })} placeholder="/search" /></div>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={form.active} onCheckedChange={(v) => setForm({ ...form, active: v })} />
              <Label>Active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={createMutation.isPending || updateMutation.isPending}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
