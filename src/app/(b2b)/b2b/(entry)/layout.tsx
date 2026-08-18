import { db } from "@/server/db";

export const dynamic = "force-dynamic";

/**
 * The way into the portal: sign-in, invitation and two-factor set-up. Same
 * treatment as the staff sign-in — compact glass card on the dark, blurred
 * abstract ground — with the company logo and the B2B PORTAL wordmark beneath
 * it, so a partner knows immediately which door they are at.
 */
export default async function B2bEntryLayout({ children }: { children: React.ReactNode }) {
  const company = await db.company.findFirst({
    select: { loginBgUrl: true, loginLogoUrl: true, logoUrl: true, name: true },
  });

  const logo = company?.loginLogoUrl ?? company?.logoUrl ?? null;
  const hasCustomBg = !!company?.loginBgUrl;

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-black">
      {hasCustomBg ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={company.loginBgUrl!}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-black/50" />
        </>
      ) : (
        <>
          <div className="absolute inset-0">
            <div className="absolute -top-40 -left-40 h-96 w-96 rounded-full bg-gradient-to-br from-[#5B7397]/20 to-[#343C4E]/20 blur-3xl" />
            <div className="absolute -right-40 -bottom-40 h-96 w-96 rounded-full bg-gradient-to-tl from-[#88BCEC]/20 to-[#6587B5]/20 blur-3xl" />
            <div className="absolute top-1/2 left-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-r from-[#6587B5]/10 to-[#343C4E]/10 blur-3xl" />
          </div>
          <div className="absolute inset-0 backdrop-blur-[10px]" />
        </>
      )}

      <div className="relative z-10 w-full max-w-sm px-4">
        <div className="mb-6 flex flex-col items-center gap-2">
          {logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logo} alt={company?.name ?? "Logo"} className="h-16 w-auto object-contain" />
          ) : (
            <span className="text-xl font-bold text-white">{company?.name ?? "iTourTMS"}</span>
          )}
          <p className="text-sm font-bold tracking-[0.22em] text-white uppercase">B2B Portal</p>
        </div>
        {children}
      </div>
    </div>
  );
}
