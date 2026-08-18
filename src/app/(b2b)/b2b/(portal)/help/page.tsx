import { Download } from "lucide-react";

import { SectionCard } from "@/components/help/section-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { b2bManual } from "@/lib/help/b2b-manual";

export const dynamic = "force-dynamic";

/**
 * The partner manual, rendered through the same components as the staff one so
 * the two cannot drift apart in look or in how screenshots are handled.
 *
 * Every section is on this page rather than behind its own route: a partner
 * looking for "why did my change cost more" would rather scroll than guess
 * which page it lives on, and Ctrl-F works on one page.
 */
export default function PartnerHelpPage() {
  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Help &amp; support</h1>
          <p className="text-muted-foreground max-w-2xl">{b2bManual.overview}</p>
        </div>
        <Button variant="outline" asChild className="shrink-0">
          <a href="/api/b2b/documents/manual">
            <Download className="mr-2 size-4" /> Download as PDF
          </a>
        </Button>
      </div>

      <Card>
        <CardContent className="py-4">
          <p className="text-muted-foreground mb-3 text-xs font-semibold tracking-wider uppercase">
            What is in this guide
          </p>
          <ol className="grid gap-1.5 sm:grid-cols-2">
            {b2bManual.sections.map((s) => (
              <li key={s.id}>
                <a href={`#${s.id}`} className="text-primary text-sm hover:underline">
                  {s.title}
                </a>
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>

      <div className="space-y-6">
        {b2bManual.sections.map((section) => (
          <SectionCard key={section.id} section={section} moduleSlug="b2b" />
        ))}
      </div>

      <p className="text-muted-foreground text-center text-xs">
        Something here out of date, or a step that did not work? Tell your account manager —
        this guide is maintained alongside the portal.
      </p>
    </div>
  );
}
