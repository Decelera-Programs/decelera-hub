"use client";

import { HEALTH_COLOR, HEALTH_LABEL } from "@/lib/projects";
import { STATUS_COLOR, STATUS_LABEL, fmtValue, type OkrNode, type OkrProject, type OkrStatus, type OkrUnit } from "@/lib/okr";

export const pct = (p: number | null) => (p == null ? "—" : `${Math.round(p * 100)}%`);

/** Barra de avance con una marca fina en el punto donde "tocaría ir" hoy. */
export function ProgressBar({
  progress,
  expected,
  status,
  height = 6,
}: {
  progress: number | null;
  expected: number | null;
  status: OkrStatus;
  height?: number;
}) {
  const color = STATUS_COLOR[status];
  return (
    <div
      className="relative w-full overflow-hidden rounded-full"
      style={{ height, background: "color-mix(in srgb, var(--text-muted) 16%, transparent)" }}
      role="progressbar"
      aria-valuenow={progress == null ? undefined : Math.round(progress * 100)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className="h-full rounded-full transition-[width] duration-500"
        style={{ width: `${Math.round((progress ?? 0) * 100)}%`, background: color }}
      />
      {expected != null && expected > 0.02 && expected < 0.99 && (
        <div
          aria-hidden
          className="absolute top-0 h-full w-[2px]"
          style={{ left: `${Math.round(expected * 100)}%`, background: "var(--text-primary)", opacity: 0.55 }}
        />
      )}
    </div>
  );
}

export function StatusChip({ status, small }: { status: OkrStatus; small?: boolean }) {
  const color = STATUS_COLOR[status];
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full font-semibold ${
        small ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-[11px]"
      }`}
      style={{ background: `color-mix(in srgb, ${color} 14%, transparent)`, color: status === "none" || status === "pending" ? "var(--text-secondary)" : color }}
    >
      <span aria-hidden className="h-1.5 w-1.5 rounded-full" style={{ background: color }} />
      {STATUS_LABEL[status]}
    </span>
  );
}

/** Puntos de salud de los proyectos enlazados: lo que ve el equipo de un vistazo. */
export function ProjectDots({ projects, max = 6, emptyText = "—" }: { projects: OkrProject[]; max?: number; emptyText?: string }) {
  if (!projects.length) return <span className="text-[11px] text-[var(--text-muted)]">{emptyText}</span>;
  const shown = projects.slice(0, max);
  return (
    <span
      className="inline-flex items-center gap-1"
      title={projects.map((p) => `${p.title} · ${HEALTH_LABEL[p.health]}`).join("\n")}
    >
      {shown.map((p) => (
        <span key={p.id} aria-hidden className="h-2 w-2 rounded-full" style={{ background: HEALTH_COLOR[p.health] }} />
      ))}
      {projects.length > max && <span className="text-[10px] text-[var(--text-muted)]">+{projects.length - max}</span>}
      <span className="sr-only">{projects.length} proyectos</span>
    </span>
  );
}

/** "valor actual → meta" de un nodo con métrica propia. */
export function ValueGoal({ node }: { node: OkrNode }) {
  const { item } = node;
  if (item.target == null) return <span className="text-[var(--text-muted)]">—</span>;
  return (
    <span className="whitespace-nowrap tabular-nums">
      <strong className="font-semibold text-[var(--text-primary)]">{fmtValue(node.value, item.unit)}</strong>
      <span className="text-[var(--text-muted)]"> → {fmtValue(item.target, item.unit)}</span>
    </span>
  );
}

/** Input numérico que confirma al salir (o con Enter). Para "Sí/No" muestra un selector. */
export function ValueInput({
  value,
  unit,
  onCommit,
  disabled,
  placeholder = "—",
  label,
}: {
  value: number | null;
  unit: OkrUnit;
  onCommit: (v: number | null) => void;
  disabled?: boolean;
  placeholder?: string;
  label: string;
}) {
  const cls =
    "w-full rounded-lg border border-[var(--border)] bg-[var(--surface-1)] px-2 py-1.5 text-sm tabular-nums text-[var(--text-primary)] outline-none transition-colors focus:border-[var(--brand-sea)] disabled:opacity-60";
  if (unit === "bool") {
    return (
      <select
        aria-label={label}
        className={cls}
        disabled={disabled}
        value={value == null ? "" : value >= 1 ? "1" : "0"}
        onChange={(e) => onCommit(e.target.value === "" ? null : Number(e.target.value))}
      >
        <option value="">{placeholder}</option>
        <option value="0">No</option>
        <option value="1">Sí</option>
      </select>
    );
  }
  return (
    <input
      // `key` fuerza a releer el valor si cambia desde fuera (otro guardado, refresh).
      key={String(value)}
      aria-label={label}
      className={cls}
      inputMode="decimal"
      disabled={disabled}
      placeholder={placeholder}
      defaultValue={value == null ? "" : String(value)}
      onBlur={(e) => {
        const raw = e.target.value.trim().replace(",", ".");
        const next = raw === "" ? null : Number(raw);
        if (next !== null && !Number.isFinite(next)) {
          e.target.value = value == null ? "" : String(value);
          return;
        }
        if (next !== value) onCommit(next);
      }}
      onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
    />
  );
}
