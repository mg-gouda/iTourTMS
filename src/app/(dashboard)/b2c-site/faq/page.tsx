"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2, Pencil, GripVertical } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { trpc } from "@/lib/trpc";

type FaqForm = { question: string; answer: string; category: string; active: boolean };
const emptyForm: FaqForm = { question: "", answer: "", category: "", active: true };

export default function FaqPage() {
  const { data: faqs, isLoading } = trpc.b2cSite.faq.list.useQuery();
  const utils = trpc.useUtils();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<FaqForm>(emptyForm);

  const createMutation = trpc.b2cSite.faq.create.useMutation({
    onSuccess: () => { toast.success("FAQ created"); utils.b2cSite.faq.list.invalidate(); setDialogOpen(false); },
    onError: (err) => toast.error(err.message),
  });
  const updateMutation = trpc.b2cSite.faq.update.useMutation({
    onSuccess: () => { toast.success("FAQ updated"); utils.b2cSite.faq.list.invalidate(); setDialogOpen(false); },
    onError: (err) => toast.error(err.message),
  });
  const deleteMutation = trpc.b2cSite.faq.delete.useMutation({
    onSuccess: () => { toast.success("FAQ deleted"); utils.b2cSite.faq.list.invalidate(); },
    onError: (err) => toast.error(err.message),
  });

  const openCreate = () => { setEditId(null); setForm(emptyForm); setDialogOpen(true); };
  const openEdit = (faq: NonNullable<typeof faqs>[number]) => {
    setEditId(faq.id);
    setForm({ question: faq.question, answer: faq.answer, category: faq.category ?? "", active: faq.active });
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!form.question || !form.answer) { toast.error("Question and answer are required"); return; }
    const payload = { ...form, category: form.category || null };
    if (editId) {
      updateMutation.mutate({ id: editId, ...payload });
    } else {
      createMutation.mutate({ ...payload, sortOrder: faqs?.length ?? 0 });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">FAQ</h1>
          <p className="text-muted-foreground">Frequently asked questions</p>
        </div>
        <Button onClick={openCreate}><Plus className="mr-1.5 h-4 w-4" />Add FAQ</Button>
      </div>

      {isLoading ? (
        <Card><CardContent className="py-10 text-center text-muted-foreground">Loading...</CardContent></Card>
      ) : !faqs?.length ? (
        <Card><CardContent className="py-10 text-center text-muted-foreground">No FAQs yet.</CardContent></Card>
      ) : (
        <div className="grid gap-3">
          {faqs.map((faq) => (
            <Card key={faq.id} className="flex items-center gap-4 p-4">
              <GripVertical className="h-5 w-5 shrink-0 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <p className="font-medium">{faq.question}</p>
                <p className="truncate text-sm text-muted-foreground">{faq.answer.substring(0, 100)}</p>
              </div>
              {faq.category && <span className="rounded-full bg-muted px-2 py-0.5 text-xs">{faq.category}</span>}
              <span className={`rounded-full px-2 py-0.5 text-xs ${faq.active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                {faq.active ? "Active" : "Inactive"}
              </span>
              <Button variant="ghost" size="icon" onClick={() => openEdit(faq)}><Pencil className="h-4 w-4" /></Button>
              <Button variant="ghost" size="icon" onClick={() => { if (confirm("Delete?")) deleteMutation.mutate({ id: faq.id }); }}><Trash2 className="h-4 w-4 text-destructive" /></Button>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editId ? "Edit FAQ" : "Add FAQ"}</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            <div className="space-y-1.5"><Label>Question *</Label><Input value={form.question} onChange={(e) => setForm({ ...form, question: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>Answer *</Label><Textarea value={form.answer} onChange={(e) => setForm({ ...form, answer: e.target.value })} rows={4} /></div>
            <div className="space-y-1.5"><Label>Category</Label><Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="General" /></div>
            <div className="flex items-center gap-2"><Switch checked={form.active} onCheckedChange={(v) => setForm({ ...form, active: v })} /><Label>Active</Label></div>
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
