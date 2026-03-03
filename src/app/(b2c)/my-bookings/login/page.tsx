export const metadata = { title: "Guest Login" };

export default function GuestLoginPage() {
  return (
    <div className="pub-section">
      <div className="pub-container max-w-md">
        <div className="pub-card p-8">
          <h1
            className="mb-2 text-center text-2xl font-bold"
            style={{ fontFamily: "var(--pub-heading-font)" }}
          >
            Guest Login
          </h1>
          <p className="mb-6 text-center text-sm text-[var(--pub-muted-foreground)]">
            Enter your booking details to sign in.
          </p>
          <form className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium">Email</label>
              <input
                type="email"
                required
                className="w-full rounded-[var(--pub-radius)] border border-[var(--pub-border)] bg-[var(--pub-background)] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--pub-primary)]"
                placeholder="your@email.com"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">Booking Code</label>
              <input
                type="text"
                required
                className="w-full rounded-[var(--pub-radius)] border border-[var(--pub-border)] bg-[var(--pub-background)] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--pub-primary)]"
                placeholder="e.g. BK-24-001"
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
