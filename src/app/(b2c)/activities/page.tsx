export const metadata = { title: "Activities" };

export default function ActivitiesPage() {
  return (
    <div className="pub-section">
      <div className="pub-container text-center">
        <h1
          className="mb-2 text-3xl font-bold md:text-4xl"
          style={{ fontFamily: "var(--pub-heading-font)" }}
        >
          Activities & Excursions
        </h1>
        <p className="text-[var(--pub-muted-foreground)]">
          Coming soon &mdash; discover amazing activities and excursions.
        </p>
      </div>
    </div>
  );
}
