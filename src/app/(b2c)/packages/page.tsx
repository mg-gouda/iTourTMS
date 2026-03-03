export const metadata = { title: "Packages" };

export default function PackagesPage() {
  return (
    <div className="pub-section">
      <div className="pub-container text-center">
        <h1
          className="mb-2 text-3xl font-bold md:text-4xl"
          style={{ fontFamily: "var(--pub-heading-font)" }}
        >
          Tour Packages
        </h1>
        <p className="text-[var(--pub-muted-foreground)]">
          Coming soon &mdash; curated travel packages and tours.
        </p>
      </div>
    </div>
  );
}
