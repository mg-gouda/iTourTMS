import { BookOpen } from "lucide-react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { HelpNav } from "./_components/help-nav";

export default async function HelpLayout({ children }: { children: React.ReactNode }) {
  const t = await getTranslations("help");

  return (
    <div className="flex min-h-[calc(100vh-3.5rem)] flex-col">
      {/* Breadcrumb strip */}
      <div className="border-b bg-muted/40 px-6 py-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <BookOpen className="h-4 w-4" />
          <Link href="/help" className="hover:text-foreground hover:underline">
            {t("helpCenter")}
          </Link>
        </div>
      </div>

      <div className="flex flex-1">
        {/* Left sidebar — sticky, scrollable */}
        <aside className="hidden w-60 shrink-0 border-r bg-background/50 lg:block">
          <div className="sticky top-14 max-h-[calc(100vh-7rem)] overflow-y-auto p-4">
            <HelpNav />
          </div>
        </aside>

        {/* Main content */}
        <main className="min-w-0 flex-1 p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
