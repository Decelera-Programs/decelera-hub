import Link from "next/link";

const TABS = [
  { key: "mapa", label: "Mapa", href: "/agentes" },
  { key: "auditoria", label: "Auditoría", href: "/agentes/auditoria" },
] as const;

/** Pestañas de la página Agentes (mismo estilo que Kanban / Gantt en Proyectos). */
export function AgentTabs({ active }: { active: (typeof TABS)[number]["key"] }) {
  return (
    <div className="glass flex items-center gap-0.5 rounded-full border border-[var(--border)] p-0.5">
      {TABS.map((t) => {
        const on = t.key === active;
        return (
          <Link
            key={t.key}
            href={t.href}
            aria-current={on ? "page" : undefined}
            className="hub-tab rounded-full px-3.5 py-1 text-xs font-semibold transition-colors"
            style={{
              background: on ? "var(--brand-sea)" : "transparent",
              boxShadow: on ? "0 4px 12px -4px color-mix(in srgb, var(--brand-sea) 60%, transparent)" : undefined,
              color: on ? "#fff" : "var(--text-muted)",
            }}
          >
            {t.label}
          </Link>
        );
      })}
    </div>
  );
}
