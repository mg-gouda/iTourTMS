import { db } from "@/server/db";

export const dynamic = "force-dynamic";

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const company = await db.company.findFirst({
    select: { loginBgUrl: true, loginLogoUrl: true },
  });

  const hasCustomBg = !!company?.loginBgUrl;

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-black">
      {hasCustomBg ? (
        <>
          {/* Custom background image */}
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
          {/* Default abstract background */}
          <div className="absolute inset-0">
            <div className="absolute -left-40 -top-40 h-96 w-96 rounded-full bg-gradient-to-br from-[#5B7397]/20 to-[#343C4E]/20 blur-3xl" />
            <div className="absolute -bottom-40 -right-40 h-96 w-96 rounded-full bg-gradient-to-tl from-[#88BCEC]/20 to-[#6587B5]/20 blur-3xl" />
            <div className="absolute left-1/2 top-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-r from-[#6587B5]/10 to-[#343C4E]/10 blur-3xl" />
          </div>
          <div className="absolute inset-0 backdrop-blur-[10px]" />
        </>
      )}

      {/* Content */}
      <div className="relative z-10 w-full max-w-sm px-4">
        {company?.loginLogoUrl && (
          <div className="mb-6 flex justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={company.loginLogoUrl}
              alt="Logo"
              className="h-16 w-auto object-contain"
            />
          </div>
        )}
        {children}
      </div>
    </div>
  );
}
