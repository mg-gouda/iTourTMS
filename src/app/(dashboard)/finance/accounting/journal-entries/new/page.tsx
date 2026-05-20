"use client";

import { MoveForm } from "@/components/finance/move-form";
import { PermissionGuard } from "@/components/shared/permission-guard";
import { useTranslations } from "next-intl";

export default function NewJournalEntryPage() {
  const t = useTranslations("finance");

  return (
    <PermissionGuard permission="finance:move:read">
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t("newJournalEntry")}</h1>
        <p className="text-muted-foreground">
          {t("createManualJournal")}
        </p>
      </div>
      <MoveForm
        moveType="ENTRY"
        returnPath="/finance/accounting/journal-entries"
      />
    </div>
    </PermissionGuard>
  );
}
