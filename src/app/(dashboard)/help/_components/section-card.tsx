import { CheckCircle2 } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { HelpSection } from "../_data/types";
import { HelpScreenshot } from "./help-screenshot";

interface SectionCardProps {
  section: HelpSection;
  moduleSlug: string;
}

export async function SectionCard({ section, moduleSlug }: SectionCardProps) {
  const t = await getTranslations("help");

  return (
    <Card id={section.id} className="scroll-mt-20 border-border/60">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold">{section.title}</CardTitle>
        <p className="text-sm leading-relaxed text-muted-foreground">{section.description}</p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Features list */}
        <div>
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {t("keyFeatures")}
          </h4>
          <ul className="space-y-1.5">
            {section.features.map((feature, i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary/70" />
                <span>{feature}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Screenshot placeholder */}
        {section.screenshot !== undefined && (
          <HelpScreenshot
            src={section.screenshot ? `/help/${moduleSlug}/${section.screenshot}` : ""}
            alt={`${section.title} screen`}
            caption={t("screenshotCaption", { title: section.title })}
          />
        )}

        {/* Step-by-step guide */}
        {section.steps && section.steps.length > 0 && (
          <div>
            <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {t("howTo")}
            </h4>
            <ol className="space-y-3">
              {section.steps.map((step) => (
                <li key={step.step} className="flex gap-3">
                  <Badge
                    variant="outline"
                    className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full p-0 text-xs font-bold"
                  >
                    {step.step}
                  </Badge>
                  <div className="space-y-0.5">
                    <p className="text-sm font-medium">{step.title}</p>
                    <p className="text-sm text-muted-foreground">{step.description}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
