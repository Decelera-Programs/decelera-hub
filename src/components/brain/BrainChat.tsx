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
  "¿Qué dudas o riesgos hemos anotado sobre startups en fase pre-seed?",
];

/** Convierte [1], [2][3]… del texto de la respuesta en marcas pequeñas, sin tocar el resto. */
function renderAnswer(text: string) {
  return text.split(/(\[D?\d+\])/g).map((part, i) =>
    /^\[D?\d+\]$/.test(part) ? (
      <sup key={i} className="mx-0.5 font-semibold text-[var(--brand-sea)]">
        {part.slice(1, -1)}
      </sup>
    ) : (
      <span key={i}>{part}</span>
    ),
  );
}

function SourceCard({ s }: { s: BrainSource }) {
  const meta = [s.type, s.fecha, s.autor].filter(Boolean).join(" · ");
  return (
    <li className="rounded-xl border border-[var(--border)] bg-[var(--surface-1)]/70 px-3 py-2.5">
      <div className="flex items-baseline gap-2">
        <span className="text-xs font-semibold text-[var(--brand-sea)]">[{s.ref}]</span>
        <span className="min-w-0 truncate text-sm font-semibold text-[var(--text-primary)]">{s.name}</span>
        <span className="shrink-0 rounded-full bg-[var(--pill-neutral-bg)] px-2 py-0.5 text-[11px] text-[var(--text-secondary)]">
          {s.kind}
        </span>
      </div>
      {meta && <div className="mt-0.5 text-xs text-[var(--text-muted)]">{meta}</div>}
      {s.isQuery ? (
        <pre className="mt-1 overflow-x-auto whitespace-pre-wrap break-words text-xs leading-relaxed text-[var(--text-secondary)]">
          {s.snippet}
        </pre>
      ) : (
        <p className="mt-1 text-[13px] leading-relaxed text-[var(--text-secondary)]">{s.snippet}…</p>
      )}
    </li>
  );
}

export function BrainChat() {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [question, setQuestion] = useState("");
  const [busy, setBusy] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Al empezar una pregunta y al terminarla (aparecen las fuentes) se baja al final. Mientras se escribe la
  // respuesta no se fuerza el scroll, para no pelearse con quien está leyendo.
  const lastDone = turns.length ? turns[turns.length - 1].done : false;
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [turns.length, lastDone]);

  // Si se cambia de página a media respuesta, se corta la petición (el servidor deja de gastar).
  useEffect(() => () => abortRef.current?.abort(), []);

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

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-8">
        <div className="mx-auto w-full max-w-3xl">
          {turns.length === 0 && (
            <div className="pt-6 sm:pt-12">
              <h1 className="page-title text-4xl text-[var(--text-primary)] sm:text-5xl">Pregunta al Brain</h1>
              <p className="mt-3 max-w-xl text-base leading-relaxed text-[var(--text-secondary)]">
                Respondo con lo que Decelera ya ha anotado: notas, comentarios y descripciones del CRM. Cada respuesta
                cita sus fuentes.
              </p>
              <div className="mt-8 flex flex-col gap-2">
                {EXAMPLES.map((ex) => (
                  <button
                    key={ex}
                    type="button"
                    onClick={() => submit(ex)}
                    className="rounded-xl border border-[var(--border)] bg-[var(--surface-1)]/70 px-4 py-3 text-left text-sm text-[var(--text-primary)] transition-colors hover:bg-[var(--row-hover)]"
                  >
                    {ex}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="flex flex-col gap-10" aria-live="polite">
            {turns.map((t, i) => (
              <section key={i}>
                <h2 className="text-lg font-normal leading-snug text-[var(--text-primary)]">{t.question}</h2>

                {t.answer ? (
                  <p className="mt-4 whitespace-pre-wrap text-[15px] leading-relaxed text-[var(--text-primary)]">
                    {renderAnswer(t.answer)}
                    {!t.done && (
                      <span aria-hidden className="ml-0.5 inline-block h-4 w-[2px] translate-y-0.5 animate-pulse bg-[var(--brand-sea)]" />
                    )}
                  </p>
                ) : (
                  !t.done && (
                    <p className="mt-4 text-sm text-[var(--text-muted)]" role="status">
                      Buscando en las notas…
                    </p>
                  )
                )}

                {t.sources.length > 0 && (
                  <div className="mt-5">
                    <div className="mb-2 text-xs uppercase tracking-wide text-[var(--text-muted)]">
                      Fuentes citadas · {t.consulted} fragmentos consultados
                    </div>
                    <ul className="flex flex-col gap-2">
                      {t.sources.map((s) => (
                        <SourceCard key={s.ref} s={s} />
                      ))}
                    </ul>
                  </div>
                )}

                {t.error && (
                  <p className="mt-4 rounded-xl border border-[var(--warning-border)] bg-[var(--warning-bg)] px-4 py-3 text-sm text-[var(--warning-fg)]">
                    {t.error}
                  </p>
                )}
              </section>
            ))}
          </div>
          <div ref={endRef} />
        </div>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit(question);
        }}
        className="glass shrink-0 border-t border-[var(--border)] px-4 py-3"
      >
        <div className="mx-auto flex w-full max-w-3xl items-end gap-2">
          <label htmlFor="brain-question" className="sr-only">
            Tu pregunta
          </label>
          <textarea
            id="brain-question"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                submit(question);
              }
            }}
            rows={1}
            maxLength={600}
            placeholder="¿Qué quieres saber?"
            className="max-h-32 min-h-11 flex-1 resize-none rounded-xl border border-[var(--border)] bg-[var(--surface-1)] px-4 py-2.5 text-[15px] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)] focus:border-[var(--brand-sea)]"
          />
          <button
            type="submit"
            disabled={busy || !question.trim()}
            className="h-11 shrink-0 rounded-xl bg-[var(--brand-sea)] px-5 text-sm font-semibold text-[var(--brand-sky)] transition-opacity disabled:opacity-40"
          >
            Preguntar
          </button>
        </div>
      </form>
    </div>
  );
}
