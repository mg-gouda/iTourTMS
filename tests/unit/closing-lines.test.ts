import Decimal from "decimal.js";
import { describe, expect, it } from "vitest";

import { buildClosingLines } from "@/server/services/finance/closing-engine";

const bal = (accountId: string, debit: number, credit: number) => ({
  accountId,
  accountType: "",
  totalDebit: new Decimal(debit),
  totalCredit: new Decimal(credit),
});
const sum = (lines: { debit: Decimal; credit: Decimal }[], k: "debit" | "credit") =>
  lines.reduce((s, l) => s.plus(l[k]), new Decimal(0)).toNumber();

describe("buildClosingLines", () => {
  it("closes a profit into retained earnings as a credit, balanced", () => {
    const { lines, netProfitLoss } = buildClosingLines([bal("income", 0, 500), bal("expense", 200, 0)], "re");
    expect(sum(lines, "debit")).toBe(sum(lines, "credit"));
    const re = lines.find((l) => l.accountId === "re")!;
    expect(re.credit.toNumber()).toBe(300);
    expect(re.debit.toNumber()).toBe(0);
    expect(netProfitLoss.toNumber()).toBe(300);
  });

  it("closes a loss into retained earnings as a debit, balanced", () => {
    const { lines, netProfitLoss } = buildClosingLines([bal("expense", 200, 0)], "re");
    expect(sum(lines, "debit")).toBe(sum(lines, "credit"));
    expect(lines.find((l) => l.accountId === "re")!.debit.toNumber()).toBe(200);
    expect(netProfitLoss.toNumber()).toBe(-200);
  });

  it("writes nothing when the P&L is already zero", () => {
    expect(buildClosingLines([bal("income", 100, 100)], "re").lines).toHaveLength(0);
  });
});
