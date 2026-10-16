"use client";


import { MailingEditor, NEW_MAILING } from "@/components/crm/mailing-editor";
import { PermissionGuard } from "@/components/shared/permission-guard";

export default function NewMailingPage() {
  return (
    <PermissionGuard permission="crm:lead:update">
      <div className="animate-fade-in space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">New mailing</h1>
        </div>
        <MailingEditor initial={NEW_MAILING} />
      </div>
    </PermissionGuard>
  );
}
