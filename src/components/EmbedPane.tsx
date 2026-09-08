"use client";

import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import type { HubApp } from "@/lib/apps";
import { IconTile } from "./HubPrimitives";

/**
 * Convierte el enlace en algo embebible cuando se puede. Google Docs/Sheets/Slides no
 * dejan embeber la vista de edición, pero sí `/preview` (solo lectura).
 */
function toEmbedSrc(href: string): string {
  try {
    const u = new URL(href, window.location.origin);
    if (u.hostname === "docs.google.com") {
      const p = u.pathname.replace(/\/$/, "");
      if (/\/(edit|view|htmlview)$/.test(p)) {
        u.pathname = p.replace(/\/(edit|view|htmlview)$/, "/preview");
        u.search = "";
        u.hash = "";
        return u.toString();
      }
    }
    return href;
  } catch {
    return href;
  }
}

/** Panel principal del workspace: muestra la tarjeta embebida con barra de acciones. */
export function EmbedPane({ card, onClose }: { card: HubApp; onClose: () => void }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [isFs, setIsFs] = useState(false);
  const src = useMemo(() => toEmbedSrc(card.href), [card.href]);

  useEffect(() => {
    /* eslint-disable-next-line react-hooks/set-state-in-effect -- reset al cambiar de tarjeta */
    setLoading(true);
  }, [src]);

  useEffect(() => {
    const onFs = () => setIsFs(document.fullscreenElement === wrapRef.current);
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

  function openExternal() {
    window.open(card.href, "_blank", "noopener,noreferrer");
  }

  function toggleFullscreen() {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void wrapRef.current?.requestFullscreen?.();
  }

  return (
    <div ref={wrapRef} className="flex h-full min-h-0 flex-col bg-[var(--surface-1)]">
      <div className="flex shrink-0 items-center gap-2.5 border-b border-[var(--border)] px-3 py-2">
        <IconTile category={card.category} initial={card.initial} size={22} />
        <span className="truncate text-sm font-semibold text-[var(--text-primary)]">{card.title}</span>
        {card.meta && (
          <span className="hidden truncate text-[11px] text-[var(--text-muted)] sm:inline">
            {card.meta}
          </span>
        )}
        <div className="ml-auto flex shrink-0 items-center gap-1">
          <ToolbarBtn
            onClick={toggleFullscreen}
            title={isFs ? "Salir de pantalla completa" : "Pantalla completa"}
          >
            {isFs ? <ExitFullscreenIcon /> : <FullscreenIcon />}
          </ToolbarBtn>
          <ToolbarBtn onClick={openExternal} title="Abrir en pestaña nueva">
            <ExternalIcon />
          </ToolbarBtn>
          <ToolbarBtn onClick={onClose} title="Cerrar">
            <CloseIcon />
          </ToolbarBtn>
        </div>
      </div>

      <div className="relative min-h-0 flex-1">
        {loading && (
          <div className="absolute inset-0 grid place-items-center text-sm text-[var(--text-muted)]">
            Cargando {card.title}…
          </div>
        )}
        <iframe
          key={src}
          src={src}
          title={card.title}
          onLoad={() => setLoading(false)}
          className="h-full w-full border-0"
          allow="clipboard-write; fullscreen; clipboard-read"
          referrerPolicy="no-referrer-when-downgrade"
        />
      </div>

      <p className="shrink-0 border-t border-[var(--border)] px-3 py-1.5 text-[11px] text-[var(--text-muted)]">
        ¿No carga? Algunas webs no permiten embeberse —{" "}
        <button type="button" onClick={openExternal} className="underline hover:text-[var(--text-primary)]">
          ábrela en pestaña nueva
        </button>
        .
      </p>
    </div>
  );
}

function ToolbarBtn({
  children,
  title,
  onClick,
}: {
  children: ReactNode;
  title: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onClick={onClick}
      className="grid h-7 w-7 place-items-center rounded-md text-[var(--text-secondary)] transition-colors hover:bg-[var(--row-hover)] hover:text-[var(--text-primary)]"
    >
      {children}
    </button>
  );
}

function FullscreenIcon() {
  return (
    <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" aria-hidden>
      <path
        d="M2 6V2h4M14 6V2h-4M2 10v4h4M14 10v4h-4"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
function ExitFullscreenIcon() {
  return (
    <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" aria-hidden>
      <path
        d="M6 2v4H2M10 2v4h4M6 14v-4H2M10 14v-4h4"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
function ExternalIcon() {
  return (
    <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" aria-hidden>
      <path
        d="M6 3H3v10h10v-3M9.5 2.5H13.5V6.5M13 3 7 9"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
function CloseIcon() {
  return (
    <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" aria-hidden>
      <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}
