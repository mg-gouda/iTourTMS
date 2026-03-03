"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2, Pencil, Star } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { trpc } from "@/lib/trpc";

type TestimonialForm = { guestName: string; quote: string; rating: number; avatar: string; featured: boolean; active: boolean };
const emptyForm: TestimonialForm = { guestName: "", quote: "", rating: 5, avatar: "", featured: false, active: true };

export default function TestimonialsPage() {
  const { data: testimonials, isLoading } = trpc.b2cSite.testimonial.list.useQuery();
  const utils = trpc.useUtils();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<TestimonialForm>(emptyForm);

  const createMutation = trpc.b2cSite.testimonial.create.useMutation({
    onSuccess: () => { toast.success("Testimonial created"); utils.b2cSite.testimonial.list.invalidate(); setDialogOpen(false); },
    onError: (err) => toast.error(err.message),
  });
  const updateMutation = trpc.b2cSite.testimonial.update.useMutation({
    onSuccess: () => { toast.success("Testimonial updated"); utils.b2cSite.testimonial.list.invalidate(); setDialogOpen(false); },
    onError: (err) => toast.error(err.message),
  });
  const deleteMutation = trpc.b2cSite.testimonial.delete.useMutation({
    onSuccess: () => { toast.success("Deleted"); utils.b2cSite.testimonial.list.invalidate(); },
    onError: (err) => toast.error(err.message),
  });
  const toggleFeaturedMutation = trpc.b2cSite.testimonial.toggleFeatured.useMutation({
    onSuccess: () => utils.b2cSite.testimonial.list.invalidate(),
    onError: (err) => toast.error(err.message),
  });

  const openCreate = () => { setEditId(null); setForm(emptyForm); setDialogOpen(true); };
  const openEdit = (t: NonNullable<typeof testimonials>[number]) => {
    setEditId(t.id);
    setForm({ guestName: t.guestName, quote: t.quote, rating: t.rating, avatar: t.avatar ?? "", featured: t.featured, active: t.active });
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!form.guestName || !form.quote) { toast.error("Name and quote are required"); return; }
    const payload = { ...form, avatar: form.avatar || null };
    if (editId) {
      updateMutation.mutate({ id: editId, ...payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Testimonials</h1>
          <p className="text-muted-foreground">Guest reviews displayed on the public site</p>
        </div>
        <Button onClick={openCreate}><Plus className="mr-1.5 h-4 w-4" />Add Testimonial</Button>
      </div>

      {isLoading ? (
        <Card><CardContent className="py-10 text-center text-muted-foreground">Loading...</CardContent></Card>
      ) : !testimonials?.length ? (
        <Card><CardContent className="py-10 text-center text-muted-foreground">No testimonials yet.</CardContent></Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {testimonials.map((t) => (
            <Card key={t.id} className="p-4">
              <div className="mb-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {t.avatar ? (
                    <img src={t.avatar} alt={t.guestName} className="h-8 w-8 rounded-full object-cover" />
                  ) : (
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-bold text-white">
                      {t.guestName.charAt(0)}
                    </div>
                  )}
                  <span className="font-medium">{t.guestName}</span>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(t)}><Pencil className="h-3.5 w-3.5" /></Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { if (confirm("Delete?")) deleteMutation.mutate({ id: t.id }); }}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                </div>
              </div>
              <div className="mb-2 flex text-yellow-500">
                {Array.from({ length: t.rating }).map((_, i) => <Star key={i} className="h-3.5 w-3.5 fill-current" />)}
              </div>
              <p className="mb-3 text-sm text-muted-foreground line-clamp-3">&ldquo;{t.quote}&rdquo;</p>
              <div className="flex items-center gap-2">
                {t.featured && <Badge>Featured</Badge>}
                <Button variant="outline" size="sm" className="text-xs" onClick={() => toggleFeaturedMutation.mutate({ id: t.id })}>
                  {t.featured ? "Unfeature" : "Feature"}
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editId ? "Edit Testimonial" : "Add Testimonial"}</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            <div className="space-y-1.5"><Label>Guest Name *</Label><Input value={form.guestName} onChange={(e) => setForm({ ...form, guestName: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>Quote *</Label><Textarea value={form.quote} onChange={(e) => setForm({ ...form, quote: e.target.value })} rows={3} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>Rating (1-5)</Label><Input type="number" min={1} max={5} value={form.rating} onChange={(e) => setForm({ ...form, rating: parseInt(e.target.value) || 5 })} /></div>
              <div className="space-y-1.5"><Label>Avatar URL</Label><Input value={form.avatar} onChange={(e) => setForm({ ...form, avatar: e.target.value })} /></div>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2"><Switch checked={form.featured} onCheckedChange={(v) => setForm({ ...form, featured: v })} /><Label>Featured</Label></div>
              <div className="flex items-center gap-2"><Switch checked={form.active} onCheckedChange={(v) => setForm({ ...form, active: v })} /><Label>Active</Label></div>
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
