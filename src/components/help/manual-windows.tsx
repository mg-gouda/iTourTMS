import { ExternalLink } from "lucide-react";

import type { Manifest, ManualDocs, ManualItem } from "@/lib/help/manual/types";

const KIND: Record<ManualItem["kind"], string> = {
  field: "Field",
  button: "Button",
  tab: "Tab",
  column: "Column",
  switch: "Switch",
  checkbox: "Checkbox",
  option: "Option",
  link: "Link",
  tile: "Summary tile",
  group: "Choice group",
};

/**
 * The manual proper: every window of a module, its numbered screenshot and
 * what each number does. Numbers come from the capture script; the text is
 * matched by the element's label, so it survives re-captures.
 */
export function ManualWindows({ slug, manifest, docs }: { slug: string; manifest: Manifest; docs: ManualDocs }) {
  const ids = Object.keys(docs).filter((id) => manifest[id]);
  if (!ids.length) return null;
  return (
    <section aria-labelledby="manual-heading" className="space-y-10">
      <div>
        <h2 id="manual-heading" className="text-xl font-semibold">
          Window by window
        </h2>
        <p className="text-muted-foreground text-sm">
          Each screen with every field and button numbered in reading order. Find the number on the picture, then read
          what it does below it.
        </p>
      </div>
      {ids.map((id, i) => {
        const doc = docs[id];
        const items = manifest[id].items;
        const src = `/help/${slug}/${id}.png`;
        return (
          <article key={id} id={`w-${id}`} className="scroll-mt-20 space-y-4 border-t pt-8">
            <header>
              <p className="text-muted-foreground font-mono text-xs">
                {i + 1}. {manifest[id].route}
              </p>
              <h3 className="text-lg font-semibold">{doc.title}</h3>
              <p className="text-muted-foreground max-w-[75ch] text-sm leading-relaxed">{doc.purpose}</p>
            </header>

            <figure className="space-y-1">
              <div className="max-h-[36rem] overflow-auto rounded-lg border">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt={`${doc.title}, with numbered fields and buttons`} loading="lazy" className="w-full" />
              </div>
              <figcaption className="text-muted-foreground flex items-center gap-1 text-xs">
                <a href={src} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 hover:underline">
                  Open full size <ExternalLink className="size-3" aria-hidden />
                </a>
              </figcaption>
            </figure>

            {doc.steps?.length ? (
              <div>
                <h4 className="mb-2 text-sm font-semibold">How to use it</h4>
                <ol className="list-decimal space-y-1 ps-5 text-sm leading-relaxed">
                  {doc.steps.map((s) => (
                    <li key={s}>{s}</li>
                  ))}
                </ol>
              </div>
            ) : null}

            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-muted-foreground text-xs">
                  <tr>
                    <th className="w-12 px-3 py-2 text-start font-medium">#</th>
                    <th className="w-56 px-3 py-2 text-start font-medium">Element</th>
                    <th className="px-3 py-2 text-start font-medium">What it does</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((it) => (
                    <tr key={it.n} className="border-t align-top">
                      <td className="px-3 py-2">
                        <span className="inline-flex size-6 items-center justify-center rounded-full bg-fuchsia-600 text-xs font-bold text-white">
                          {it.n}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        <span className="font-medium">{it.key}</span>
                        <span className="text-muted-foreground block text-xs">{KIND[it.kind]}</span>
                      </td>
                      <td className="px-3 py-2 leading-relaxed">{doc.items[it.key] ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </article>
        );
      })}
    </section>
  );
}
