"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// ── Date Range Filter ──

interface DateRangeFilterProps {
  defaultFrom?: string;
  defaultTo?: string;
  onGenerate: (dateFrom: Date, dateTo: Date) => void;
  isPending?: boolean;
}

export function DateRangeFilter({
  defaultFrom,
  defaultTo,
  onGenerate,
  isPending,
}: DateRangeFilterProps) {
  const today = new Date();
  const firstOfYear = new Date(today.getFullYear(), 0, 1);

  const [dateFrom, setDateFrom] = useState(
    defaultFrom ?? firstOfYear.toISOString().split("T")[0],
  );
  const [dateTo, setDateTo] = useState(
    defaultTo ?? today.toISOString().split("T")[0],
  );

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="space-y-1">
        <Label htmlFor="dateFrom">From</Label>
        <Input
          id="dateFrom"
          type="date"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          className="w-40"
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="dateTo">To</Label>
        <Input
          id="dateTo"
          type="date"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          className="w-40"
        />
      </div>
      <Button
        onClick={() => onGenerate(new Date(dateFrom), new Date(dateTo))}
        disabled={isPending}
      >
        {isPending ? "Loading..." : "Generate"}
      </Button>
    </div>
  );
}

// ── As-Of Date Filter ──

interface AsOfDateFilterProps {
  onGenerate: (asOfDate: Date) => void;
  isPending?: boolean;
}

export function AsOfDateFilter({ onGenerate, isPending }: AsOfDateFilterProps) {
  const [asOfDate, setAsOfDate] = useState(
    new Date().toISOString().split("T")[0],
  );

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="space-y-1">
        <Label htmlFor="asOfDate">As of Date</Label>
        <Input
          id="asOfDate"
          type="date"
          value={asOfDate}
          onChange={(e) => setAsOfDate(e.target.value)}
          className="w-40"
        />
      </div>
      <Button
        onClick={() => onGenerate(new Date(asOfDate))}
        disabled={isPending}
      >
        {isPending ? "Loading..." : "Generate"}
      </Button>
    </div>
  );
}

// ── Account Filter ──

interface AccountOption {
  id: string;
  code: string;
  name: string;
}

interface AccountFilterProps {
  accounts: AccountOption[];
  value: string;
  onChange: (accountId: string) => void;
}

export function AccountFilter({ accounts, value, onChange }: AccountFilterProps) {
  return (
    <div className="space-y-1">
      <Label>Account</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="w-72">
          <SelectValue placeholder="Select account" />
        </SelectTrigger>
        <SelectContent>
          {accounts.map((a) => (
            <SelectItem key={a.id} value={a.id}>
              {a.code} — {a.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
