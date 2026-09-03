import Link from "next/link";
import type { HubApp } from "@/lib/apps";
import { IconTile, Star, StatusPill } from "./HubPrimitives";

export function ToolCard({
  app,
  pinned,
  onTogglePin,
  revealDelay = 0,
}: {
  app: HubApp;
  pinned: boolean;
  onTogglePin: (slug: string) => void;
  revealDelay?: number;
}) {
  return (
    <div
      className="hub-card hub-reveal card group relative flex min-h-[224px] flex-col gap-4 p-5"
      style={{ animationDelay: `${revealDelay}ms` }}
      draggable
      onDragStart={(e) => {
        if ((e.target as HTMLElement).closest("button")) {
          e.preventDefault();
          return;
        }
        e.dataTransfer.setData("application/x-hub-app", app.slug);
        e.dataTransfer.setData("text/plain", app.title);
        e.dataTransfer.effectAllowed = "copy";
        // Ghost limpio: una píldora con el nombre, en vez del fantasma de la tarjeta entera.
        const ghost = document.createElement("div");
        ghost.textContent = app.title;
        ghost.style.cssText =
          "position:fixed;top:-9999px;left:-9999px;padding:8px 14px;border-radius:9999px;white-space:nowrap;" +
          "background:var(--surface-1);color:var(--text-primary);font:600 13px system-ui,sans-serif;" +
          "box-shadow:0 12px 30px -8px rgba(20,25,40,.4),0 0 0 1px color-mix(in srgb,var(--text-primary) 12%,transparent)";
        document.body.appendChild(ghost);
        e.dataTransfer.setDragImage(ghost, 16, 16);
        requestAnimationFrame(() => ghost.remove());
      }}
    >
      <Link
        href={app.href}
        {...(app.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
        className="absolute inset-0 z-10 rounded-[20px]"
      >
        <span className="sr-only">Abrir {app.title}</span>
      </Link>

      <div className="relative z-0 flex items-start justify-between gap-3">
        <span className="hub-icon">
          <IconTile category={app.category} initial={app.initial} />
        </span>
        <div className="flex items-center gap-2.5">
          <StatusPill status={app.status} />
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onTogglePin(app.slug);
            }}
            aria-label={pinned ? "Quitar de favoritos" : "Marcar como favorito"}
            className="relative z-20 grid h-6 w-6 place-items-center transition-transform hover:scale-125"
          >
            <Star active={pinned} />
          </button>
        </div>
      </div>

      <div className="relative z-0 flex flex-1 flex-col gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
          {app.category}
        </p>
        <h2 className="text-xl font-semibold leading-tight text-[var(--text-primary)]">{app.title}</h2>
        <p className="text-sm leading-relaxed text-[var(--text-secondary)]">{app.description}</p>
      </div>

      <div className="relative z-0 flex items-center justify-between border-t border-[var(--border)] pt-3.5">
        <span className="flex items-center gap-1 text-sm font-semibold text-[var(--brand-sea)]">
          {app.external ? "Abrir en pestaña nueva" : "Abrir"}
          <span aria-hidden className="hub-arrow">
            {app.external ? "↗" : "→"}
          </span>
        </span>
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

export function ComingSoonCard({ revealDelay = 0 }: { revealDelay?: number }) {
  return (
    <div
      className="hub-reveal flex min-h-[224px] flex-col gap-4 rounded-[20px] border border-dashed border-[var(--border)] p-5"
      style={{ animationDelay: `${revealDelay}ms` }}
    >
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
