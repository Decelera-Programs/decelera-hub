/* eslint-disable @next/next/no-img-element */
export function Header() {
  return (
    <header className="flex flex-wrap items-start gap-4">
      <img src="/decelera-mark.svg" alt="Decelera" className="mt-1 h-10 w-10 shrink-0" />
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--text-primary)] sm:text-3xl">
          Opencall México 2026
        </h1>
        <p className="max-w-2xl text-sm text-[var(--text-secondary)]">
          Seguimiento del deal flow de Attio (stages <em>Mexico 2026</em> y{" "}
          <em>Leads Mexico 2026</em>): cuántas startups entran por cada canal y hasta dónde
          avanzan en el funnel.
        </p>
      </div>
    </header>
  );
}
