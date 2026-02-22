"use client";

import { AccountForm } from "@/components/finance/account-form";

export default function NewAccountPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">New Account</h1>
        <p className="text-muted-foreground">
          Create a new account in the chart of accounts.
        </p>
      </div>
      <AccountForm />
    </div>
  );
}
