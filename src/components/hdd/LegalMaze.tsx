import { classifyLegalPattern, legalMazeFlags } from "@/lib/hdd/aggregate";
import { LEGAL_MAZE_CONTENT } from "@/lib/hdd/legalMazeContent";
import type { FounderHdd, LegalMazeDilemma, LegalPatternLevel } from "@/lib/hdd/types";
import { Empty } from "./Empty";

// Colores por nivel de señal (tokens de estado/serie del hub). El nivel SIEMPRE lleva su texto: no depende del color.
const LEVEL_COLOR: Record<LegalPatternLevel, string> = {
  esperado: "var(--status-good)",
  comun: "var(--series-1)",
  atencion: "var(--status-warning)",
  senal_fuerte: "var(--status-critical)",
  raro: "var(--series-3)",
};

function Pill({ color, children }: { color: string; children: React.ReactNode }) {
  return (
    <span
      className="inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium text-[var(--text-primary)]"
      style={{ borderColor: color, background: `color-mix(in srgb, ${color} 12%, transparent)` }}
    >
      {children}
    </span>
  );
}

/** Voto como chip: letra V/R siempre visible; verde = relleno, rojo = borde (no solo color). */
function Vote({ option, green }: { option: number; green: boolean }) {
  const color = green ? "var(--status-good)" : "var(--status-critical)";
  return (
    <span
      role="img"
      aria-label={`Opción ${option}: ${green ? "Verde" : "Rojo"}`}
      className="inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-xs font-semibold text-[var(--text-primary)]"
      style={{ borderColor: color, background: green ? `color-mix(in srgb, ${color} 22%, transparent)` : "transparent" }}
    >
      <span className="font-normal text-[var(--text-muted)]">{option}</span>
      {green ? "V" : "R"}
    </span>
  );
}

const LETTERS = ["A", "B", "C"] as const;

/** Versión 2: una opción elegida por dilema (A, B o C). Sin patrones: la lectura es la del doc para la opción elegida. */
function LegalMazeChoices({ dilemmas }: { dilemmas: LegalMazeDilemma[] }) {
  const flags = legalMazeFlags(dilemmas);
  const byId = new Map(dilemmas.map((d) => [d.id, d]));
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
            <Pill color="var(--status-critical)">
              Eligió A en el Dilema 1: según el doc, es la casilla que más pesa de toda la hoja (exige haber decidido perjudicar a alguien que confía)
            </Pill>
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

export function LegalMaze({ founder }: { founder: FounderHdd }) {
  const lm = founder.legalMaze;
  if (!lm || !lm.dilemmas.length) return <Empty>Legal Maze sin completar</Empty>;
  if (lm.version === 2) return <LegalMazeChoices dilemmas={lm.dilemmas} />;
  const flags = legalMazeFlags(lm.dilemmas);
  const hasFlags = flags.d1GreenOption1 || flags.undecided.length > 0 || flags.solidConventional || flags.toReview.length > 0;
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-1.5" aria-label="Resumen de banderas del Legal Maze">
        {flags.d1GreenOption1 && (
          <Pill color="var(--status-critical)">Bandera: Verde a la opción 1 del D1 (pesa más que cualquier otra casilla)</Pill>
        )}
        {flags.undecided.length > 0 && (
          <Pill color="var(--status-warning)">Indecisión en {flags.undecided.join(", ")} (rojo triple sin texto)</Pill>
        )}
        {flags.toReview.length > 0 && (
          <Pill color="var(--status-warning)">Revisar en Fase 3 / Court: {flags.toReview.join(", ")}</Pill>
        )}
        {flags.solidConventional && (
          <Pill color="var(--series-1)">Sólido y convencional (señal media para tesis de riesgo)</Pill>
        )}
        {!hasFlags && <span className="text-xs text-[var(--text-muted)]">Sin banderas</span>}
      </div>
      <ul className="flex flex-col divide-y divide-[var(--border)] text-sm">
        {lm.dilemmas.map((d) => {
          const p = classifyLegalPattern(d.votes, d.answer);
          return (
            <li key={d.id} className="flex flex-col gap-1.5 py-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-medium text-[var(--text-primary)]">
                  {d.id} · {d.title}
                  <span className="ml-1.5 font-normal text-[var(--text-muted)]">KPI {d.kpiLabel}</span>
                </span>
                {d.votes && d.votes.length === 3 ? (
                  <span className="flex gap-1">
                    {d.votes.map((v, i) => <Vote key={i} option={i + 1} green={v} />)}
                  </span>
                ) : (
                  <span className="text-xs text-[var(--text-muted)]">Votos incompletos</span>
                )}
              </div>
              {p && (
                <p className="text-xs leading-relaxed text-[var(--text-secondary)]">
                  <span className="mr-1.5 inline-flex align-middle"><Pill color={LEVEL_COLOR[p.level]}>{p.key} · {p.levelLabel}</Pill></span>
                  {p.reading}
                </p>
              )}
              <p className={d.answer ? "text-xs text-[var(--text-primary)]" : "text-xs italic text-[var(--text-muted)]"}>
                {d.answer ? <>Campo abierto: {d.answer}</> : "Campo abierto vacío"}
              </p>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
