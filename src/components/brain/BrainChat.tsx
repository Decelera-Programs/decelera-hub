"use client";

import { useEffect, useRef, useState } from "react";
import type { BrainEvent, BrainSource } from "@/lib/brain-shared";

type Turn = {
  question: string;
  /** Texto de la respuesta; va creciendo mientras Claude escribe. */
  answer: string;
  sources: BrainSource[];
  consulted: number;
  error: string | null;
  done: boolean;
};

const EXAMPLES = [
  "¿Qué startups están levantando ronda o buscan subvenciones tipo ENISA o CDTI?",
  "¿Qué impresión tuvimos de las startups de ciberseguridad con las que hablamos?",
  "¿Cuántos deals hay por stage en Mexico 2026?",
  "¿Qué dudas o riesgos hemos anotado sobre startups en fase pre-seed?",
];

const MAX_CHARS = 600;

/** Convierte [1], [D1]… del texto de la respuesta en marcas pequeñas, sin tocar el resto. */
function renderAnswer(text: string) {
  return text.split(/(\[D?\d+\])/g).map((part, i) =>
    /^\[D?\d+\]$/.test(part) ? (
      <sup key={i} className="mx-0.5 text-[11px] font-semibold text-[var(--brand-sea)]">
        {part.slice(1, -1)}
      </sup>
    ) : (
      <span key={i}>{part}</span>
    ),
  );
}

function Icon({ d, className = "h-4 w-4" }: { d: string; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path d={d} />
    </svg>
  );
}

function SourceCard({ s }: { s: BrainSource }) {
  const meta = [s.type, s.fecha, s.autor].filter(Boolean).join(" · ");
  return (
    <li className="rounded-xl border border-[var(--border)] bg-[var(--surface-1)] px-3.5 py-3">
      <div className="flex items-baseline gap-2">
        <span className="text-xs font-semibold text-[var(--brand-sea)]">[{s.ref}]</span>
        <span className="min-w-0 truncate text-sm font-semibold text-[var(--text-primary)]">{s.name}</span>
        <span className="shrink-0 rounded-full bg-[var(--pill-neutral-bg)] px-2 py-0.5 text-[11px] text-[var(--text-secondary)]">
          {s.kind}
        </span>
      </div>
      {meta && <div className="mt-0.5 text-xs text-[var(--text-muted)]">{meta}</div>}
      {s.isQuery ? (
        <pre className="mt-1.5 overflow-x-auto whitespace-pre-wrap break-words rounded-lg bg-[var(--row-alt)] px-2.5 py-2 text-xs leading-relaxed text-[var(--text-secondary)]">
          {s.snippet}
        </pre>
      ) : (
        <p className="mt-1 text-[13px] leading-relaxed text-[var(--text-secondary)]">{s.snippet}…</p>
      )}
    </li>
  );
}

function Sources({ sources, consulted }: { sources: BrainSource[]; consulted: number }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-5">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="group flex flex-wrap items-center gap-1.5 text-left"
      >
        <span className="mr-1 text-xs text-[var(--text-muted)]">
          {sources.length} {sources.length === 1 ? "fuente" : "fuentes"} · {consulted} fragmentos consultados
        </span>
        {sources.map((s) => (
          <span
            key={s.ref}
            className="max-w-[11rem] truncate rounded-full border border-[var(--border)] bg-[var(--surface-1)] px-2.5 py-0.5 text-xs text-[var(--text-secondary)] transition-colors group-hover:bg-[var(--row-hover)]"
          >
            <span className="font-semibold text-[var(--brand-sea)]">{s.ref}</span> {s.name}
          </span>
        ))}
        <Icon d={open ? "M6 15l6-6 6 6" : "M6 9l6 6 6-6"} className="h-3.5 w-3.5 text-[var(--text-muted)]" />
      </button>
      {open && (
        <ul className="mt-3 flex flex-col gap-2">
          {sources.map((s) => (
            <SourceCard key={s.ref} s={s} />
          ))}
        </ul>
      )}
    </div>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch {
          /* sin permiso de portapapeles: no pasa nada */
        }
      }}
      className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs text-[var(--text-muted)] transition-colors hover:bg-[var(--row-hover)] hover:text-[var(--text-primary)]"
    >
      <Icon d={copied ? "M5 12l5 5L20 7" : "M9 9h10v10H9zM5 15V5h10"} className="h-3.5 w-3.5" />
      {copied ? "Copiado" : "Copiar"}
    </button>
  );
}

function Mark({ pulse = false }: { pulse?: boolean }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src="/decelera-mark.svg" alt="" className={`h-6 w-6 shrink-0 ${pulse ? "animate-pulse" : ""}`} />
  );
}

export function BrainChat() {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [question, setQuestion] = useState("");
  const [busy, setBusy] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);

  // Al empezar una pregunta y al terminarla (aparecen las fuentes) se baja al final. Mientras se escribe la
  // respuesta no se fuerza el scroll, para no pelearse con quien está leyendo.
  const lastDone = turns.length ? turns[turns.length - 1].done : false;
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [turns.length, lastDone]);

  // Si se cambia de página a media respuesta, se corta la petición (el servidor deja de gastar).
  useEffect(() => () => abortRef.current?.abort(), []);

  // El cuadro de texto crece con lo que se escribe (hasta un tope) y vuelve a una línea al enviar.
  useEffect(() => {
    const ta = taRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = `${Math.min(ta.scrollHeight, 200)}px`;
  }, [question]);

  function patchLast(fn: (t: Turn) => Turn) {
    setTurns((ts) => ts.map((t, i) => (i === ts.length - 1 ? fn(t) : t)));
  }

  function handleEvent(ev: BrainEvent) {
    if (ev.type === "delta") patchLast((t) => ({ ...t, answer: t.answer + ev.text }));
    else if (ev.type === "done") patchLast((t) => ({ ...t, sources: ev.sources, consulted: ev.consulted }));
    else patchLast((t) => ({ ...t, error: ev.error }));
  }

  async function submit(q: string) {
    const text = q.trim();
    if (!text || busy) return;
    setQuestion("");
    setBusy(true);
    setTurns((ts) => [...ts, { question: text, answer: "", sources: [], consulted: 0, error: null, done: false }]);

    const ctrl = new AbortController();
    abortRef.current = ctrl;
    try {
      const res = await fetch("/api/brain/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: text }),
        signal: ctrl.signal,
      });
      if (res.status === 401) throw new Error("session");
      if (!res.ok || !res.body) throw new Error(`http ${res.status}`);

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        let nl: number;
        while ((nl = buf.indexOf("\n")) >= 0) {
          const line = buf.slice(0, nl).trim();
          buf = buf.slice(nl + 1);
          if (line) handleEvent(JSON.parse(line) as BrainEvent);
        }
      }
    } catch (e) {
      if (!ctrl.signal.aborted) {
        const msg =
          e instanceof Error && e.message === "session"
            ? "Tu sesión ha caducado. Recarga la página para volver a entrar."
            : "No he podido responder. Prueba de nuevo en un momento.";
        patchLast((t) => ({ ...t, error: t.error ?? msg }));
      }
    } finally {
      patchLast((t) => ({ ...t, done: true }));
      setBusy(false);
    }
  }

  const composer = (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit(question);
      }}
      className="rounded-3xl border border-[var(--border)] bg-[var(--surface-1)] p-2 shadow-[0_2px_16px_rgba(45,56,82,0.08)] transition-shadow focus-within:shadow-[0_4px_24px_rgba(17,88,229,0.14)]"
    >
      <label htmlFor="brain-question" className="sr-only">
        Tu pregunta
      </label>
      <textarea
        id="brain-question"
        ref={taRef}
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            submit(question);
          }
        }}
        rows={1}
        maxLength={MAX_CHARS}
        placeholder="¿Qué quieres saber?"
        className="block max-h-[200px] w-full resize-none bg-transparent px-3 pb-1 pt-2 text-[15px] leading-relaxed text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]"
      />
      <div className="flex items-center justify-between gap-2 px-1 pt-1">
        <span className="pl-2 text-[11px] text-[var(--text-muted)]">
          {question.length > MAX_CHARS - 100 ? `${question.length}/${MAX_CHARS}` : "Intro envía · Mayús+Intro salto de línea"}
        </span>
        {busy ? (
          <button
            type="button"
            onClick={() => abortRef.current?.abort()}
            aria-label="Parar respuesta"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--brand-night)] text-[var(--brand-sky)] transition-opacity hover:opacity-85"
          >
            <span className="block h-3 w-3 rounded-[2px] bg-current" />
          </button>
        ) : (
          <button
            type="submit"
            disabled={!question.trim()}
            aria-label="Enviar pregunta"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--brand-sea)] text-[var(--brand-sky)] transition-opacity hover:opacity-90 disabled:opacity-30"
          >
            <Icon d="M12 19V5M5 12l7-7 7 7" className="h-[18px] w-[18px]" />
          </button>
        )}
      </div>
    </form>
  );

  // Estado inicial: saludo y cuadro de texto en el centro, como en Claude.ai.
  if (turns.length === 0) {
    return (
      <div className="flex min-h-0 flex-1 flex-col items-center overflow-y-auto px-4">
        <div className="my-auto w-full max-w-2xl py-10">
          <div className="mb-8 flex items-center justify-center gap-3">
            <Mark />
            <h1 className="page-title text-3xl text-[var(--text-primary)] sm:text-4xl">¿Qué quieres saber?</h1>
          </div>
          {composer}
          <p className="mx-auto mt-4 max-w-md text-center text-[13px] leading-relaxed text-[var(--text-muted)]">
            Respondo con lo que Decelera ya ha anotado en el CRM, y cada respuesta cita sus fuentes.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            {EXAMPLES.map((ex) => (
              <button
                key={ex}
                type="button"
                onClick={() => submit(ex)}
                className="max-w-full rounded-full border border-[var(--border)] bg-[var(--surface-1)]/70 px-3.5 py-2 text-left text-[13px] leading-snug text-[var(--text-secondary)] transition-colors hover:bg-[var(--row-hover)] hover:text-[var(--text-primary)]"
              >
                {ex}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-6 pt-8">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-10" aria-live="polite">
          {turns.map((t, i) => (
            <section key={i} className="flex flex-col gap-6">
              <div className="flex justify-end">
                <p className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-br-md bg-[var(--pill-neutral-bg)] px-4 py-2.5 text-[15px] leading-relaxed text-[var(--text-primary)]">
                  {t.question}
                </p>
              </div>

              <div className="flex gap-3">
                <div className="pt-0.5">
                  <Mark pulse={!t.done && !t.answer} />
                </div>
                <div className="min-w-0 flex-1">
                  {t.answer ? (
                    <p className="whitespace-pre-wrap text-[15px] leading-[1.7] text-[var(--text-primary)]">
                      {renderAnswer(t.answer)}
                      {!t.done && (
                        <span aria-hidden className="ml-0.5 inline-block h-4 w-[2px] translate-y-0.5 animate-pulse bg-[var(--brand-sea)]" />
                      )}
                    </p>
                  ) : (
                    !t.done && (
                      <p className="pt-0.5 text-sm text-[var(--text-muted)]" role="status">
                        Buscando en el CRM…
                      </p>
                    )
                  )}

                  {t.sources.length > 0 && <Sources sources={t.sources} consulted={t.consulted} />}

                  {t.error && (
                    <p className="mt-3 rounded-xl border border-[var(--warning-border)] bg-[var(--warning-bg)] px-4 py-3 text-sm text-[var(--warning-fg)]">
                      {t.error}
                    </p>
                  )}

                  {t.done && t.answer && (
                    <div className="mt-3 -ml-2">
                      <CopyButton text={t.answer} />
                    </div>
                  )}
                </div>
              </div>
            </section>
          ))}
          <div ref={endRef} />
        </div>
      </div>

      <div className="shrink-0 px-4 pb-4 pt-2">
        <div className="mx-auto w-full max-w-3xl">
          {composer}
          <p className="mt-2 text-center text-[11px] text-[var(--text-muted)]">
            El Brain puede equivocarse. Revisa las fuentes citadas antes de tomar decisiones.
          </p>
        </div>
      </div>
    </div>
  );
}
