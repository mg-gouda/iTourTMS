export const metadata = { title: "B2B Login" };

export default function B2BLoginPage() {
  return (
    <div className="pub-section">
      <div className="pub-container max-w-md">
        <div className="pub-card p-8">
          <h1
            className="mb-2 text-center text-2xl font-bold"
            style={{ fontFamily: "var(--pub-heading-font)" }}
          >
            Tour Operator Portal
          </h1>
          <p className="mb-6 text-center text-sm text-[var(--pub-muted-foreground)]">
            Sign in to access your contracts, rates, and bookings.
          </p>
          <form className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium">Email</label>
              <input
                type="email"
                required
                className="w-full rounded-[var(--pub-radius)] border border-[var(--pub-border)] bg-[var(--pub-background)] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--pub-primary)]"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">Password</label>
              <input
                type="password"
                required
                className="w-full rounded-[var(--pub-radius)] border border-[var(--pub-border)] bg-[var(--pub-background)] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--pub-primary)]"
              />
            </div>
            <button type="submit" className="pub-btn pub-btn-primary w-full justify-center">
              Sign In
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
