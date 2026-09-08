"use client";

/* eslint-disable @next/next/no-img-element */
import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import type { AppCategory } from "@/lib/apps";
import { toEmbedSrc } from "@/lib/embed";
import { IconTile } from "./HubPrimitives";

export type EmbedTarget = {
  /** slug de la tarjeta del hub, si el destino es una tarjeta (no un enlace suelto). */
  slug?: string;
  title: string;
  href: string;
  category?: AppCategory;
  initial?: string;
  meta?: string;
};

export type EmbedTab = { key: string; target: EmbedTarget };

function faviconFor(url: string): string {
  try {
    return `https://www.google.com/s2/favicons?domain=${new URL(url, window.location.origin).hostname}&sz=64`;
  } catch {
    return "";
  }
}

/**
 * Panel principal del workspace con varias pestañas embebidas a la vez. Cada iframe se
 * mantiene montado aunque su pestaña no esté activa (se oculta con `hidden`), así el
 * login / scroll / estado de cada módulo se conserva al cambiar de pestaña.
 */
export function EmbedArea({
  tabs,
  activeKey,
  onSelect,
  onClose,
}: {
  tabs: EmbedTab[];
  activeKey: string | null;
  onSelect: (key: string) => void;
  onClose: (key: string) => void;
}) {
  const stackRef = useRef<HTMLDivElement>(null);
  const [isFs, setIsFs] = useState(false);
  const active = tabs.find((t) => t.key === activeKey) ?? tabs[tabs.length - 1] ?? null;

  useEffect(() => {
    const onFs = () => setIsFs(document.fullscreenElement === stackRef.current);
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

  function openExternal() {
    if (active) window.open(active.target.href, "_blank", "noopener,noreferrer");
  }
  function toggleFullscreen() {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void stackRef.current?.requestFullscreen?.();
  }

  return (
    <div className="flex h-full min-h-0 flex-col bg-[var(--surface-1)]">
      <div className="flex shrink-0 items-stretch border-b border-[var(--border)] bg-[var(--page)]">
        <div className="flex min-w-0 flex-1 items-stretch overflow-x-auto">
          {tabs.map((t) => (
            <TabButton
              key={t.key}
              target={t.target}
              active={t.key === active?.key}
              onSelect={() => onSelect(t.key)}
              onClose={() => onClose(t.key)}
            />
          ))}
        </div>
        <div className="flex shrink-0 items-center gap-1 border-l border-[var(--border)] px-2">
          <ToolbarBtn
            onClick={toggleFullscreen}
            title={isFs ? "Salir de pantalla completa" : "Pantalla completa"}
          >
            {isFs ? <ExitFullscreenIcon /> : <FullscreenIcon />}
          </ToolbarBtn>
          <ToolbarBtn onClick={openExternal} title="Abrir en pestaña nueva del navegador">
            <ExternalIcon />
          </ToolbarBtn>
        </div>
      </div>

      <div ref={stackRef} className="relative min-h-0 flex-1 bg-[var(--surface-1)]">
        {tabs.map((t) => (
          <EmbedFrame key={t.key} target={t.target} hidden={t.key !== active?.key} />
        ))}
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

function TabButton({
  target,
  active,
  onSelect,
  onClose,
}: {
  target: EmbedTarget;
  active: boolean;
  onSelect: () => void;
  onClose: () => void;
}) {
  return (
    <div
      className={`group flex shrink-0 items-center gap-1.5 border-r border-[var(--border)] pl-3 pr-2 text-sm transition-colors ${
        active
          ? "bg-[var(--surface-1)] text-[var(--text-primary)]"
          : "text-[var(--text-secondary)] hover:bg-[var(--row-hover)]"
      }`}
      style={active ? { boxShadow: "inset 0 -2px 0 var(--brand-water)" } : undefined}
    >
      <button
        type="button"
        onClick={onSelect}
        className="flex min-w-0 items-center gap-1.5 py-2"
        title={target.title}
      >
        <TabIcon target={target} />
        <span className="max-w-[150px] truncate">{target.title}</span>
      </button>
      <button
        type="button"
        onClick={onClose}
        aria-label={`Cerrar ${target.title}`}
        className="grid h-4 w-4 shrink-0 place-items-center rounded text-[var(--text-muted)] opacity-0 transition-opacity hover:bg-[var(--row-hover)] hover:text-[var(--text-primary)] group-hover:opacity-100"
      >
        <svg viewBox="0 0 12 12" className="h-2.5 w-2.5" fill="none" aria-hidden>
          <path d="M3 3l6 6M9 3l-6 6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  );
}

function TabIcon({ target }: { target: EmbedTarget }) {
  if (target.category && target.initial != null) {
    return <IconTile category={target.category} initial={target.initial} size={16} />;
  }
  return (
    <img
      src={faviconFor(target.href)}
      alt=""
      width={15}
      height={15}
      referrerPolicy="no-referrer"
      className="shrink-0 rounded-[4px]"
    />
  );
}

function EmbedFrame({ target, hidden }: { target: EmbedTarget; hidden: boolean }) {
  const [loading, setLoading] = useState(true);
  const src = useMemo(() => toEmbedSrc(target.href), [target.href]);

  return (
    <div className="absolute inset-0" hidden={hidden}>
      {loading && (
        <div className="absolute inset-0 grid place-items-center text-sm text-[var(--text-muted)]">
          Cargando {target.title}…
        </div>
      )}
      <iframe
        src={src}
        title={target.title}
        onLoad={() => setLoading(false)}
        className="h-full w-full border-0"
        allow="clipboard-write; fullscreen; clipboard-read"
        referrerPolicy="no-referrer-when-downgrade"
      />
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
