"use client";


import { useTranslations } from "next-intl";

import { MailingEditor, NEW_MAILING } from "@/components/crm/mailing-editor";
import { PermissionGuard } from "@/components/shared/permission-guard";

export default function NewMailingPage() {
  const t = useTranslations("crm.mailings");
  return (
    <PermissionGuard permission="crm:lead:update">
      <div className="animate-fade-in space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("new")}</h1>
        </div>
        <MailingEditor initial={NEW_MAILING} />
      </div>
    </PermissionGuard>
  );
}
