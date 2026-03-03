export const metadata = { title: "Transfers" };

export default function TransfersPage() {
  return (
    <div className="pub-section">
      <div className="pub-container text-center">
        <h1
          className="mb-2 text-3xl font-bold md:text-4xl"
          style={{ fontFamily: "var(--pub-heading-font)" }}
        >
          Airport Transfers
        </h1>
        <p className="text-[var(--pub-muted-foreground)]">
          Coming soon &mdash; book airport and city transfers.
        </p>
      </div>
    </div>
  );
}
