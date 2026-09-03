"use client";

import { useState } from "react";
import Link from "next/link";
import type { HubApp } from "@/lib/apps";
import { IconTile, StatusPill } from "./HubPrimitives";

export function ToolCard({
  app,
  revealDelay = 0,
}: {
  app: HubApp;
  revealDelay?: number;
}) {
  const [dragging, setDragging] = useState(false);

  return (
    <div
      className={`hub-card hub-reveal card group relative flex min-h-[176px] flex-col gap-4 p-5${
        dragging ? " opacity-40" : ""
      }`}
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
        // Fantasma = copia estática de la tarjeta. El snapshot nativo de la tarjeta
        // viva sale recortado/en blanco por las animaciones de hover/entrada (hub-card,
        // hub-reveal), así que clonamos, quitamos esas clases y usamos eso.
        const card = e.currentTarget;
        const rect = card.getBoundingClientRect();
        const ghost = card.cloneNode(true) as HTMLElement;
        ghost.classList.remove("hub-card", "hub-reveal", "group");
        ghost.style.cssText +=
          `;position:fixed;top:0;left:-9999px;margin:0;width:${rect.width}px;height:${rect.height}px;` +
          "transform:none;animation:none;opacity:1;pointer-events:none;" +
          "box-shadow:0 20px 45px -12px rgba(20,25,40,.35)";
        document.body.appendChild(ghost);
        e.dataTransfer.setDragImage(ghost, e.clientX - rect.left, e.clientY - rect.top);
        requestAnimationFrame(() => ghost.remove());
        setDragging(true);
      }}
      onDragEnd={() => setDragging(false)}
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
        <StatusPill status={app.status} />
      </div>

      <div className="relative z-0 flex flex-1 flex-col gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
          {app.meta ?? app.category}
        </p>
        <h2 className="text-xl font-semibold leading-tight text-[var(--text-primary)]">{app.title}</h2>
        <p className="text-sm leading-relaxed text-[var(--text-secondary)]">{app.description}</p>
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
      className="hub-reveal flex min-h-[176px] flex-col gap-4 rounded-[20px] border border-dashed border-[var(--border)] p-5"
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
