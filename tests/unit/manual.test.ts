import { describe, expect, it } from "vitest";

import { MANUALS } from "@/lib/help/manual";

// The manual promises every field and button explained: any numbered element
// without text, or any captured window without a write-up, fails here.
describe("user manual completeness", () => {
  it("registry loads", () => expect(MANUALS).toBeTypeOf("object"));
  for (const [slug, { manifest, docs }] of Object.entries(MANUALS)) {
    it(`${slug}: every captured window is written up`, () => {
      expect(Object.keys(manifest).filter((id) => !docs[id])).toEqual([]);
    });
    it(`${slug}: every numbered element is explained`, () => {
      const missing = Object.entries(manifest).flatMap(([id, w]) =>
        w.items.filter((it) => !docs[id]?.items[it.key]).map((it) => `${id} #${it.n} ${it.kind} "${it.key}"`),
      );
      expect(missing).toEqual([]);
    });
  }
});
