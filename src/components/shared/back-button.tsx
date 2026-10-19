"use client";

import { ChevronLeft } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";

/**
 * Back, the way Apple navigation stacks show it: only where there is a level
 * to return to (a record, a form, a sub-page — three path segments or more),
 * never on a module's home or a list reached from the sidebar.
 */
export function BackButton() {
  const router = useRouter();
  const pathname = usePathname();
  const t = useTranslations("common");
  if (pathname.split("/").filter(Boolean).length < 3) return null;
  return (
    <Button
      variant="ghost"
      size="sm"
      className="text-primary hover:text-primary -ms-2 gap-0.5 px-2 dark:text-sidebar-primary"
      onClick={() => router.back()}
    >
      <ChevronLeft className="size-4 rtl:rotate-180" aria-hidden />
      {t("back")}
    </Button>
  );
}
