"use client";

import { useRouter } from "next/navigation";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";

export interface ReportColumn {
  key: string;
  label: string;
  align?: "left" | "right" | "center";
  format?: "currency" | "text";
}

export interface ReportRow {
  id?: string;
  type: "data" | "section" | "subtotal" | "total";
  label: string;
  values: Record<string, number | string>;
  drilldownHref?: string;
}

interface ReportTableProps {
  columns: ReportColumn[];
  rows: ReportRow[];
}

export function ReportTable({ columns, rows }: ReportTableProps) {
  const router = useRouter();

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-64">Account</TableHead>
          {columns.map((col) => (
            <TableHead
              key={col.key}
              className={cn(
                col.align === "right" && "text-right",
                col.align === "center" && "text-center",
              )}
            >
              {col.label}
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row, idx) => {
          const isSection = row.type === "section";
          const isSubtotal = row.type === "subtotal";
          const isTotal = row.type === "total";
          const isClickable = !!row.drilldownHref;

          return (
            <TableRow
              key={row.id ?? `row-${idx}`}
              className={cn(
                isSection && "bg-muted/50",
                isTotal && "border-t-2 bg-muted/30",
                isClickable && "cursor-pointer hover:bg-accent",
              )}
              onClick={
                isClickable
                  ? () => router.push(row.drilldownHref!)
                  : undefined
              }
            >
              <TableCell
                className={cn(
                  (isSection || isSubtotal || isTotal) && "font-semibold",
                  isTotal && "font-bold",
                  row.type === "data" && "pl-8",
                )}
              >
                {row.label}
              </TableCell>
              {columns.map((col) => {
                const val = row.values[col.key];
                const formatted =
                  isSection && !val
                    ? ""
                    : col.format === "currency" && typeof val === "number"
                      ? formatCurrency(val)
                      : val ?? "";

                return (
                  <TableCell
                    key={col.key}
                    className={cn(
                      "font-mono",
                      col.align === "right" && "text-right",
                      col.align === "center" && "text-center",
                      (isSubtotal || isTotal) && "font-semibold",
                      isTotal && "font-bold",
                    )}
                  >
                    {formatted}
                  </TableCell>
                );
              })}
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
