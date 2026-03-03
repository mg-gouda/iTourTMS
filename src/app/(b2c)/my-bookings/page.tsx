import Link from "next/link";
import { User } from "lucide-react";

export const metadata = { title: "My Bookings" };

export default function MyBookingsPage() {
  return (
    <div className="pub-section">
      <div className="pub-container max-w-md text-center">
        <div className="pub-card p-8">
          <User className="mx-auto mb-4 h-12 w-12 text-[var(--pub-primary)]" />
          <h1
            className="mb-2 text-2xl font-bold"
            style={{ fontFamily: "var(--pub-heading-font)" }}
          >
            My Bookings
          </h1>
          <p className="mb-6 text-[var(--pub-muted-foreground)]">
            Sign in to view and manage your bookings.
          </p>
          <Link href="/my-bookings/login" className="pub-btn pub-btn-primary">
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}
