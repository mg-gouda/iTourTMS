"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { format } from "date-fns";

interface CreditTransaction {
  id: string;
  type: string;
  amount: number;
  runningBalance: number;
  reference: string | null;
  notes: string | null;
  createdAt: string;
  booking: { code: string } | null;
}

interface AccountData {
  partner: {
    name: string;
    code: string;
    email: string | null;
    phone: string | null;
    contactPerson: string | null;
    creditLimit: number;
    creditUsed: number;
    available: number;
  } | null;
  recentTransactions: CreditTransaction[];
}

const TX_TYPE_LABELS: Record<string, string> = {
  BOOKING_CHARGE: "Booking Charge",
  PAYMENT_RECEIVED: "Payment Received",
  CREDIT_NOTE: "Credit Note",
  ADJUSTMENT: "Adjustment",
};

const TX_TYPE_COLORS: Record<string, string> = {
  BOOKING_CHARGE: "text-red-600",
  PAYMENT_RECEIVED: "text-green-600",
  CREDIT_NOTE: "text-green-600",
  ADJUSTMENT: "text-blue-600",
};

export default function B2bAccountPage() {
  const { data: session } = useSession();
  const [data, setData] = useState<AccountData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAccount() {
      try {
        const res = await fetch("/api/b2c/b2b-portal?action=account");
        if (res.ok) {
          setData(await res.json());
        }
      } catch {
        // Silent fail
      } finally {
        setLoading(false);
      }
    }
    fetchAccount();
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-[300px] items-center justify-center text-[var(--pub-muted-foreground)]">
        Loading account...
      </div>
    );
  }

  const partner = data?.partner;

  return (
    <div className="space-y-6">
      <h1
        className="text-2xl font-bold"
        style={{ fontFamily: "var(--pub-heading-font)" }}
      >
        Account
      </h1>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Profile */}
        <div className="pub-card p-4 space-y-3">
          <h2 className="font-semibold">Profile</h2>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="text-[var(--pub-muted-foreground)]">User</div>
            <div className="font-medium">{session?.user?.name ?? "—"}</div>

            <div className="text-[var(--pub-muted-foreground)]">Email</div>
            <div>{session?.user?.email ?? "—"}</div>

            {partner && (
              <>
                <div className="text-[var(--pub-muted-foreground)]">Partner</div>
                <div className="font-medium">{partner.name} ({partner.code})</div>

                <div className="text-[var(--pub-muted-foreground)]">Contact Person</div>
                <div>{partner.contactPerson ?? "—"}</div>

                <div className="text-[var(--pub-muted-foreground)]">Phone</div>
                <div>{partner.phone ?? "—"}</div>
              </>
            )}
          </div>
        </div>

        {/* Credit */}
        {partner && (
          <div className="pub-card p-4 space-y-3">
            <h2 className="font-semibold">Credit Summary</h2>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-xs text-[var(--pub-muted-foreground)]">Credit Limit</p>
                <p className="text-xl font-bold">{partner.creditLimit.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-xs text-[var(--pub-muted-foreground)]">Used</p>
                <p className="text-xl font-bold text-orange-600">
                  {partner.creditUsed.toFixed(2)}
                </p>
              </div>
              <div>
                <p className="text-xs text-[var(--pub-muted-foreground)]">Available</p>
                <p
                  className={`text-xl font-bold ${
                    partner.available > 0 ? "text-green-600" : "text-red-600"
                  }`}
                >
                  {partner.available.toFixed(2)}
                </p>
              </div>
            </div>

            {/* Progress bar */}
            <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
              <div
                className="h-full rounded-full bg-[var(--pub-primary)] transition-all"
                style={{
                  width: `${Math.min(100, partner.creditLimit > 0 ? (partner.creditUsed / partner.creditLimit) * 100 : 0)}%`,
                }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Recent Transactions */}
      {data?.recentTransactions && data.recentTransactions.length > 0 && (
        <div className="pub-card p-4">
          <h2 className="mb-3 font-semibold">Recent Credit Transactions</h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs uppercase text-[var(--pub-muted-foreground)]">
                <th className="pb-2">Date</th>
                <th className="pb-2">Type</th>
                <th className="pb-2">Reference</th>
                <th className="pb-2 text-right">Amount</th>
                <th className="pb-2 text-right">Balance</th>
              </tr>
            </thead>
            <tbody>
              {data.recentTransactions.map((tx) => (
                <tr key={tx.id} className="border-b last:border-0">
                  <td className="py-2">
                    {format(new Date(tx.createdAt), "dd MMM yyyy")}
                  </td>
                  <td className="py-2">
                    {TX_TYPE_LABELS[tx.type] ?? tx.type}
                  </td>
                  <td className="py-2 text-[var(--pub-muted-foreground)]">
                    {tx.booking?.code ?? tx.reference ?? "—"}
                  </td>
                  <td
                    className={`py-2 text-right font-medium ${TX_TYPE_COLORS[tx.type] ?? ""}`}
                  >
                    {Number(tx.amount).toFixed(2)}
                  </td>
                  <td className="py-2 text-right">
                    {Number(tx.runningBalance).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
