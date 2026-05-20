export type { HelpModule, HelpSection, HelpStep } from "./types";
export { financeHelp } from "./finance";
export { contractingHelp } from "./contracting";
export { crmHelp } from "./crm";
export { reservationsHelp } from "./reservations";
export { trafficHelp } from "./traffic";
export { b2cSiteHelp } from "./b2c-site";
export { b2bPortalHelp } from "./b2b-portal";
export { tourOpsHelp } from "./tour-ops";

import { financeHelp } from "./finance";
import { contractingHelp } from "./contracting";
import { crmHelp } from "./crm";
import { reservationsHelp } from "./reservations";
import { trafficHelp } from "./traffic";
import { b2cSiteHelp } from "./b2c-site";
import { b2bPortalHelp } from "./b2b-portal";
import { tourOpsHelp } from "./tour-ops";
import type { HelpModule } from "./types";

export const ALL_HELP_MODULES: HelpModule[] = [
  financeHelp,
  contractingHelp,
  crmHelp,
  reservationsHelp,
  trafficHelp,
  b2cSiteHelp,
  b2bPortalHelp,
  tourOpsHelp,
];

export const HELP_MODULE_MAP: Record<string, HelpModule> = Object.fromEntries(
  ALL_HELP_MODULES.map((m) => [m.slug, m])
);
