import { crm } from "./crm";
import { reservations } from "./reservations";
import { traffic } from "./traffic";
import type { ManualWindow } from "./types";

export type { ManualWindow } from "./types";

/** Every window the manual documents, per help module slug. */
export const WINDOWS: Record<string, ManualWindow[]> = { crm, reservations, traffic };
