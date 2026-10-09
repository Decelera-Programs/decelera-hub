import { legalMazeFlags } from "@/lib/hdd/aggregate";
import { LEGAL_MAZE_CONTENT } from "@/lib/hdd/legalMazeContent";
import type { FounderHdd } from "@/lib/hdd/types";
import { Empty } from "./Empty";

const LETTERS = ["A", "B", "C"] as const;

/** Legal Maze: una opción elegida por dilema (A, B o C), con la lectura Positivo/Negativo del doc y el campo abierto. */
export function LegalMaze({ founder }: { founder: FounderHdd }) {
  const lm = founder.legalMaze;
  if (!lm || !lm.dilemmas.length) return <Empty>Legal Maze sin completar</Empty>;
  const flags = legalMazeFlags(lm.dilemmas);
  const byId = new Map(lm.dilemmas.map((d) => [d.id, d]));
  const row = LEGAL_MAZE_CONTENT.map((c) => {
    const ch = byId.get(c.id)?.choice;
    return typeof ch === "number" ? LETTERS[ch] : "—";
  });
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <p className="text-xs text-[var(--text-muted)]">Elecciones D1 a D5</p>
        <p className="text-base font-semibold tracking-wide text-[var(--text-primary)]" aria-label={`Elecciones de D1 a D5: ${row.join(", ")}`}>
          {row.join(" · ")}
        </p>
        <div className="flex flex-wrap gap-1.5" aria-label="Resumen de banderas del Legal Maze">
          {flags.d1ChoseA ? (
            <span
              className="inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium text-[var(--text-primary)]"
              style={{ borderColor: "var(--status-critical)", background: "color-mix(in srgb, var(--status-critical) 12%, transparent)" }}
            >
              Eligió A en el Dilema 1: según el doc, es la casilla que más pesa de toda la hoja (exige haber decidido perjudicar a alguien que confía)
            </span>
          ) : (
            <span className="text-xs text-[var(--text-muted)]">Sin banderas</span>
          )}
        </div>
      </div>
      <ul className="flex flex-col divide-y divide-[var(--border)] text-sm">
        {LEGAL_MAZE_CONTENT.map((c) => {
          const d = byId.get(c.id);
          const opt = typeof d?.choice === "number" ? c.options[d.choice] : null;
          return (
            <li key={c.id} className="flex flex-col gap-1.5 py-2.5">
              <span className="font-medium text-[var(--text-primary)]">
                {c.id} · {c.theme}
                <span className="ml-1.5 font-normal text-[var(--text-muted)]">KPI {c.kpiLabel}</span>
              </span>
              {!d ? (
                <p className="text-xs italic text-[var(--text-muted)]">Sin respuesta</p>
              ) : !opt ? (
                <p className="text-xs italic text-[var(--text-muted)]">Sin opción elegida</p>
              ) : (
                <>
                  <p className="flex items-start gap-2 text-[var(--text-primary)]">
                    <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-[var(--series-1)] text-xs font-semibold">{opt.letter}</span>
                    <span>
                      <span className="sr-only">Opción elegida {opt.letter}: </span>
                      {opt.text}
                    </span>
                  </p>
                  <p className="text-xs leading-relaxed text-[var(--text-secondary)]"><span className="font-semibold text-[var(--text-primary)]">Positivo (doc):</span> {opt.positive}</p>
                  <p className="text-xs leading-relaxed text-[var(--text-secondary)]"><span className="font-semibold text-[var(--text-primary)]">Negativo (doc):</span> {opt.negative}</p>
                </>
              )}
              {d && (
                <p className={d.answer ? "text-xs text-[var(--text-primary)]" : "text-xs italic text-[var(--text-muted)]"}>
                  {d.answer ? <>Campo abierto: {d.answer}</> : "Campo abierto vacío"}
                </p>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
