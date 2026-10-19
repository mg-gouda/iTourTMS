"use client";

import { Download, FileText, Paperclip, Trash2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { trpc } from "@/lib/trpc";

interface Props {
  bookingId: string;
  spoFlag: boolean;
  spoCode: string | null;
  spoDate: Date | string | null;
  document: { fileName: string; size: number; createdAt: Date | string; uploadedBy: { name: string | null } | null } | null;
}

const kb = (n: number) => (n < 1024 * 1024 ? `${Math.max(1, Math.round(n / 1024))} KB` : `${(n / 1024 / 1024).toFixed(1)} MB`);

/** The hotel's special offer on a booking: flag, code, date and the offer document. */
export function SpoCard({ bookingId, spoFlag, spoCode, spoDate, document }: Props) {
  const t = useTranslations("reservations.spo");
  const locale = useLocale();
  const utils = trpc.useUtils();
  const [flag, setFlag] = useState(spoFlag);
  const [code, setCode] = useState(spoCode ?? "");
  const [date, setDate] = useState(spoDate ? new Date(spoDate).toISOString().slice(0, 10) : "");
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const url = `/api/reservations/bookings/${bookingId}/spo-document`;
  const refresh = () => utils.reservations.booking.getById.invalidate({ id: bookingId });

  const save = trpc.reservations.booking.setSpo.useMutation({
    onSuccess: () => {
      toast.success(t("saved"));
      refresh();
    },
    onError: (e) => toast.error(e.message),
  });

  async function upload(file: File) {
    setBusy(true);
    const body = new FormData();
    body.append("file", file);
    const res = await fetch(url, { method: "POST", body });
    setBusy(false);
    if (fileRef.current) fileRef.current.value = "";
    if (!res.ok) return toast.error((await res.json().catch(() => null))?.error ?? res.statusText);
    toast.success(t("uploaded"));
    refresh();
  }

  async function remove() {
    if (!confirm(t("confirmRemove"))) return;
    setBusy(true);
    const res = await fetch(url, { method: "DELETE" });
    setBusy(false);
    if (!res.ok) return toast.error(res.statusText);
    toast.success(t("removed"));
    refresh();
  }

  const dirty = flag !== spoFlag || code !== (spoCode ?? "") || date !== (spoDate ? new Date(spoDate).toISOString().slice(0, 10) : "");

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
        <CardDescription>{t("desc")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-3">
          <Switch id="spo-flag" checked={flag} onCheckedChange={setFlag} />
          <Label htmlFor="spo-flag">{t("flag")}</Label>
        </div>

        {flag && (
          <div className="grid gap-3 sm:grid-cols-[1fr_12rem_auto] sm:items-end">
            <div className="space-y-1.5">
              <Label htmlFor="spo-code">{t("code")}</Label>
              <Input id="spo-code" value={code} onChange={(e) => setCode(e.target.value)} maxLength={100} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="spo-date">{t("date")}</Label>
              <Input id="spo-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
          </div>
        )}
        {dirty && (
          <Button
            size="sm"
            disabled={save.isPending}
            onClick={() => save.mutate({ id: bookingId, spoFlag: flag, spoCode: code || null, spoDate: date || null })}
          >
            {t("save")}
          </Button>
        )}

        <div className="space-y-2 border-t pt-4">
          <p className="text-sm font-medium">{t("document")}</p>
          {document ? (
            <div className="flex flex-wrap items-center gap-3 rounded-md border px-3 py-2">
              <FileText className="text-muted-foreground size-5 shrink-0" aria-hidden />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{document.fileName}</p>
                <p className="text-muted-foreground text-xs">
                  {kb(document.size)} ·{" "}
                  {t("by", {
                    name: document.uploadedBy?.name ?? "—",
                    date: new Date(document.createdAt).toLocaleDateString(locale),
                  })}
                </p>
              </div>
              <Button asChild size="sm" variant="outline">
                <a href={url}>
                  <Download className="me-1 size-4" aria-hidden /> {t("download")}
                </a>
              </Button>
              <Button size="sm" variant="ghost" disabled={busy} onClick={() => fileRef.current?.click()}>
                {t("replace")}
              </Button>
              <Button size="sm" variant="ghost" className="text-destructive" disabled={busy} onClick={remove}>
                <Trash2 className="size-4" aria-hidden />
                <span className="sr-only">{t("remove")}</span>
              </Button>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-3">
              <p className="text-muted-foreground text-sm">{t("noDocument")}</p>
              <Button size="sm" variant="outline" disabled={busy} onClick={() => fileRef.current?.click()}>
                <Paperclip className="me-1 size-4" aria-hidden /> {busy ? t("uploading") : t("upload")}
              </Button>
            </div>
          )}
          <p className="text-muted-foreground text-xs">{t("types")}</p>
          <input
            ref={fileRef}
            type="file"
            className="hidden"
            accept=".pdf,.docx,.png,.jpg,.jpeg,.webp"
            onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])}
          />
        </div>
      </CardContent>
    </Card>
  );
}
