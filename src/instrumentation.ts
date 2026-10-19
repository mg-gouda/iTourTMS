/** Next.js boot hook (Node runtime only). */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { resumeMailings } = await import("@/server/services/crm/mailing");
  void resumeMailings().catch((e) => console.error("[boot] resuming CRM mailings failed", e));
}
