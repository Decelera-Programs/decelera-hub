export function Header() {
  return (
    <header className="flex flex-wrap items-center gap-4">
      <div
        aria-hidden
        className="flex h-12 w-12 items-center justify-center rounded-2xl text-lg font-bold text-white"
        style={{ background: "var(--series-1)" }}
      >
        D
      </div>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--text-primary)] sm:text-3xl">
          Opencall México 2026
        </h1>
        <p className="text-sm text-[var(--text-secondary)]">
          Funnel en vivo desde Attio · Mexico 2026 + Leads Mexico 2026
        </p>
      </div>
    </header>
  );
}
