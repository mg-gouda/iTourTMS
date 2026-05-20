"use client";

import { Report1099 } from "@/components/finance/reports/report-1099";
import { PermissionGuard } from "@/components/shared/permission-guard";

export default function Report1099Page() {
  return (
    <PermissionGuard permission="finance:report:read">
      <Report1099 />
    </PermissionGuard>
  );
}
