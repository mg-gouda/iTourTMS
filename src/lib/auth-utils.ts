import { auth } from "@/lib/auth";
import { db } from "@/server/db";

export async function getSession() {
  return auth();
}

export async function requireAuth() {
  const session = await auth();
  if (!session?.user) {
    throw new Error("Unauthorized");
  }
  return session;
}

export async function requirePermission(permissionCode: string) {
  const session = await requireAuth();
  const { permissions, roles } = session.user;

  // Super admin bypasses all permission checks
  if (roles?.includes("super_admin")) return session;

  if (!permissions?.includes(permissionCode)) {
    throw new Error(`Missing permission: ${permissionCode}`);
  }
  return session;
}

export async function requireModule(moduleName: string) {
  const session = await requireAuth();
  const companyId = session.user.companyId;

  if (!companyId) {
    throw new Error("No company associated with user");
  }

  const installed = await db.installedModule.findUnique({
    where: {
      name_companyId: { name: moduleName, companyId },
    },
  });

  if (!installed?.isInstalled) {
    throw new Error(`Module not installed: ${moduleName}`);
  }

  return session;
}
