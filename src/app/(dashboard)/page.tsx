import { auth } from "@/lib/auth";
import { db } from "@/server/db";

export default async function DashboardPage() {
  const session = await auth();
  const companyId = session?.user?.companyId;

  const installedModules = companyId
    ? await db.installedModule.findMany({
        where: { companyId, isInstalled: true },
        select: { name: true, displayName: true },
      })
    : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome back, {session?.user?.name ?? "User"}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {installedModules.map((mod) => (
          <div
            key={mod.name}
            className="rounded-lg border bg-card p-4 shadow-sm"
          >
            <h3 className="font-semibold">{mod.displayName}</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Module active
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
