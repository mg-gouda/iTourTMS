import { Suspense } from "react";

import { GeneralLedgerReport } from "@/components/finance/reports/general-ledger-report";

export default function GeneralLedgerPage() {
  return (
    <Suspense>
      <GeneralLedgerReport />
    </Suspense>
  );
}
