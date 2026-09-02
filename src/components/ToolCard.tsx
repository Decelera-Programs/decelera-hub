import Link from "next/link";
import type { HubApp } from "@/lib/apps";
import { IconTile, Star, StatusPill } from "./HubPrimitives";

export function ToolCard({
  app,
  pinned,
  onTogglePin,
}: {
  app: HubApp;
  pinned: boolean;
  onTogglePin: (slug: string) => void;
}) {
  return (
    <div className="card group relative flex min-h-[220px] flex-col gap-4 p-5 transition-all duration-150 hover:-translate-y-[3px] hover:shadow-lg">
      <Link
        href={app.href}
        {...(app.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
        className="absolute inset-0 z-0 rounded-[20px]"
      >
        <span className="sr-only">Abrir {app.title}</span>
      </Link>

      <div className="relative z-10 flex items-start justify-between gap-3">
        <IconTile category={app.category} initial={app.initial} />
        <div className="flex items-center gap-2.5">
          <StatusPill status={app.status} />
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              onTogglePin(app.slug);
            }}
            aria-label={pinned ? "Quitar de favoritos" : "Marcar como favorito"}
            className="grid h-6 w-6 place-items-center"
          >
            <Star active={pinned} />
          </button>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
          {app.category}
        </p>
        <h2 className="text-xl font-semibold leading-tight text-[var(--text-primary)]">{app.title}</h2>
        <p className="text-sm leading-relaxed text-[var(--text-secondary)]">{app.description}</p>
      </div>

      <div className="flex items-center justify-between border-t border-[var(--border)] pt-3.5">
        <span className="text-sm font-semibold text-[var(--brand-sea)]">Abrir →</span>
        {app.meta && <span className="text-xs text-[var(--text-muted)]">{app.meta}</span>}
      </div>
    </div>
  );
}

function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden>
      <path
        d="M12 5v14M5 12h14"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function ComingSoonCard() {
  return (
    <div className="flex min-h-[220px] flex-col gap-4 rounded-[20px] border border-dashed border-[var(--border)] p-5">
      <span
        className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-xl"
        style={{ background: "var(--pill-neutral-bg)", color: "var(--text-muted)" }}
      >
        <PlusIcon />
      </span>

      <div className="flex flex-1 flex-col gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
          Próximamente
        </p>
        <h2 className="text-xl font-semibold leading-tight text-[var(--text-muted)]">Nueva herramienta</h2>
        <p className="text-sm leading-relaxed text-[var(--text-muted)]">
          El próximo módulo del hub aparecerá aquí.
        </p>
      </div>
    </div>
  );
}
