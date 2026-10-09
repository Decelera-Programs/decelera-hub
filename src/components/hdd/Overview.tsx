import { ChartCard } from "@/components/ChartCard";
import { StatTile } from "@/components/SummaryKpis";
import type { StartupHdd } from "@/lib/hdd/types";
import { Empty } from "./Empty";
import { fmt, mean, pct, SOFT_KEYS, SOFT_LABEL, SOFT_SHORT } from "./labels";

export function Coverage({ startups }: { startups: StartupHdd[] }) {
  const sum = (f: (s: StartupHdd) => number) => startups.reduce((a, s) => a + (f(s) || 0), 0);
  const total = sum((s) => s.coverage.founders);
  const withSoft = sum((s) => s.coverage.withSoft);
  const lm = sum((s) => s.coverage.withLegalMaze);
  const pre = sum((s) => s.coverage.withWellbeingPre);
  const post = sum((s) => s.coverage.withWellbeingPost);
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <StatTile label="Founders con datos" value={`${withSoft} / ${total}`} caption="Con al menos una evaluación de soft skills" accent="var(--series-1)" />
      <StatTile label="Legal Maze" value={pct(lm, total)} caption={`${lm} de ${total} founders`} accent="var(--series-2)" />
      <StatTile label="OLBI / BRS pre" value={pct(pre, total)} caption={`${pre} de ${total} founders`} accent="var(--series-3)" />
      <StatTile label="OLBI / BRS post" value={pct(post, total)} caption={`${post} de ${total} founders`} accent="var(--status-warning)" />
    </div>
  );
}

export function Comparison({ startups, onSelect }: { startups: StartupHdd[]; onSelect: (id: string) => void }) {
  const any = startups.some((s) => SOFT_KEYS.some((k) => s.softAvg[k] != null));
  return (
    <ChartCard title="Comparativa de startups" subtitle="Media de soft skills de sus founders (1 a 10). Pulsa una startup para ver el detalle.">
      {startups.length === 0 ? (
        <Empty>No hay startups con founders en HDD</Empty>
      ) : (
        <>
          {!any && <Empty>Sin evaluaciones aún</Empty>}
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] border-separate border-spacing-0 text-sm">
              <caption className="sr-only">Media de soft skills por startup</caption>
              <thead>
                <tr className="text-left text-xs text-[var(--text-muted)]">
                  <th scope="col" className="sticky left-0 bg-[var(--surface-1)] py-2 pr-3 font-medium">Startup</th>
                  <th scope="col" className="px-2 py-2 text-center font-medium">Cobertura</th>
                  {SOFT_KEYS.map((k) => (
                    <th key={k} scope="col" className="px-1 py-2 text-center font-medium" title={SOFT_LABEL[k]}>
                      {SOFT_SHORT[k]}
                    </th>
                  ))}
                  <th scope="col" className="px-2 py-2 text-center font-medium">Media</th>
                </tr>
              </thead>
              <tbody>
                {startups.map((s) => {
                  const avg = mean(SOFT_KEYS.map((k) => s.softAvg[k]));
                  return (
                    <tr key={s.startupId}>
                      <th scope="row" className="sticky left-0 border-t border-[var(--border)] bg-[var(--surface-1)] py-1.5 pr-3 text-left font-normal">
                        <button
                          type="button"
                          onClick={() => onSelect(s.startupId)}
                          className="text-left font-medium text-[var(--text-primary)] underline-offset-2 hover:underline focus-visible:underline"
                        >
                          {s.name}
                        </button>
                      </th>
                      <td className="border-t border-[var(--border)] px-2 py-1.5 text-center text-[var(--text-secondary)]">
                        {s.coverage.withSoft}/{s.coverage.founders}
                      </td>
                      {SOFT_KEYS.map((k) => {
                        const v = s.softAvg[k];
                        const has = typeof v === "number" && Number.isFinite(v);
                        return (
                          <td
                            key={k}
                            className="border-t border-[var(--border)] px-1 py-1.5 text-center"
                            style={has ? { background: `color-mix(in srgb, var(--series-1) ${Math.round((v / 10) * 40)}%, transparent)` } : undefined}
                          >
                            <span className={has ? "font-medium text-[var(--text-primary)]" : "text-[var(--text-muted)]"}>{fmt(v)}</span>
                          </td>
                        );
                      })}
                      <td className="border-t border-[var(--border)] px-2 py-1.5 text-center font-semibold text-[var(--text-primary)]">{fmt(avg)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </ChartCard>
  );
}
