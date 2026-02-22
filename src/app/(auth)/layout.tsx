export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-black">
      {/* Abstract background */}
      <div className="absolute inset-0">
        <div className="absolute -left-40 -top-40 h-96 w-96 rounded-full bg-gradient-to-br from-blue-600/20 to-purple-600/20 blur-3xl" />
        <div className="absolute -bottom-40 -right-40 h-96 w-96 rounded-full bg-gradient-to-tl from-cyan-600/20 to-indigo-600/20 blur-3xl" />
        <div className="absolute left-1/2 top-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-r from-violet-600/10 to-fuchsia-600/10 blur-3xl" />
      </div>

      {/* Backdrop blur overlay */}
      <div className="absolute inset-0 backdrop-blur-[10px]" />

      {/* Content */}
      <div className="relative z-10 w-full max-w-sm px-4">{children}</div>
    </div>
  );
}
