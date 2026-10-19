import crmManifest from "./crm.manifest.json";
import { crmDocs } from "./crm";
import reservationsManifest from "./reservations.manifest.json";
import { reservationsDocs } from "./reservations";
import type { Manifest, ManualDocs } from "./types";

/**
 * The window-by-window manual per help module slug: run scripts/manual/capture.ts
 * for a module, write its docs keyed by the captured labels, then register
 * `{ manifest, docs }` here.
 */
export const MANUALS: Record<string, { manifest: Manifest; docs: ManualDocs }> = {
  crm: { manifest: crmManifest as Manifest, docs: crmDocs },
  reservations: { manifest: reservationsManifest as Manifest, docs: reservationsDocs },
};
