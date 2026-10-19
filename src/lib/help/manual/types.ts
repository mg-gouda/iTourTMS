/** What the capture script found on one window, in reading order. */
export interface ManualItem {
  n: number;
  kind: "field" | "button" | "tab" | "column" | "switch" | "checkbox" | "option" | "link" | "tile" | "group";
  /** The element's visible label — what explanations are keyed by. */
  key: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

export type Manifest = Record<string, { route: string; items: ManualItem[] }>;

/** The written guide for one window. */
export interface WindowDoc {
  title: string;
  /** What the window is for, in a sentence or two. */
  purpose: string;
  /** Typical task, step by step, referring to the numbers where useful. */
  steps?: string[];
  /** Explanation per element, keyed by ManualItem.key. */
  items: Record<string, string>;
}

export type ManualDocs = Record<string, WindowDoc>;
