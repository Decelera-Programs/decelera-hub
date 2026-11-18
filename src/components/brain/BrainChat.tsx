"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { askBrain } from "@/app/brain/actions";
import type { BrainAnswer, BrainSource } from "@/lib/brain-shared";

type Turn = { question: string; result: BrainAnswer };

const EXAMPLES = [
  "¿Qué startups están levantando ronda o buscan subvenciones tipo ENISA o CDTI?",
  "¿Qué impresión tuvimos de las startups de ciberseguridad con las que hablamos?",
  "¿Qué dudas o riesgos hemos anotado sobre startups en fase pre-seed?",
];

/** Convierte [1], [2][3]… del texto de la respuesta en marcas pequeñas, sin tocar el resto. */
function renderAnswer(text: string) {
  return text.split(/(\[\d+\])/g).map((part, i) =>
    /^\[\d+\]$/.test(part) ? (
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
        <span className="text-xs font-semibold text-[var(--brand-sea)]">[{s.n}]</span>
        <span className="min-w-0 truncate text-sm font-semibold text-[var(--text-primary)]">{s.name}</span>
        <span className="shrink-0 rounded-full bg-[var(--pill-neutral-bg)] px-2 py-0.5 text-[11px] text-[var(--text-secondary)]">
          {s.kind}
        </span>
      </div>
      {meta && <div className="mt-0.5 text-xs text-[var(--text-muted)]">{meta}</div>}
      <p className="mt-1 text-[13px] leading-relaxed text-[var(--text-secondary)]">{s.snippet}…</p>
    </li>
  );
}

export function BrainChat() {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [question, setQuestion] = useState("");
  const [pending, startTransition] = useTransition();
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [turns.length, pending]);

  function submit(q: string) {
    const text = q.trim();
    if (!text || pending) return;
    setQuestion("");
    startTransition(async () => {
      let result: BrainAnswer;
      try {
        result = await askBrain(text);
      } catch {
        result = { ok: false, error: "No he podido responder. Prueba de nuevo en un momento." };
      }
      setTurns((t) => [...t, { question: text, result }]);
    });
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-8">
        <div className="mx-auto w-full max-w-3xl">
          {turns.length === 0 && !pending && (
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
                {t.result.ok ? (
                  <>
                    <p className="mt-4 whitespace-pre-wrap text-[15px] leading-relaxed text-[var(--text-primary)]">
                      {renderAnswer(t.result.answer)}
                    </p>
                    {t.result.sources.length > 0 && (
                      <div className="mt-5">
                        <div className="mb-2 text-xs uppercase tracking-wide text-[var(--text-muted)]">
                          Fuentes citadas · {t.result.consulted} fragmentos consultados
                        </div>
                        <ul className="flex flex-col gap-2">
                          {t.result.sources.map((s) => (
                            <SourceCard key={s.n} s={s} />
                          ))}
                        </ul>
                      </div>
                    )}
                  </>
                ) : (
                  <p className="mt-4 rounded-xl border border-[var(--warning-border)] bg-[var(--warning-bg)] px-4 py-3 text-sm text-[var(--warning-fg)]">
                    {t.result.error}
                  </p>
                )}
              </section>
            ))}

            {pending && (
              <p className="text-sm text-[var(--text-muted)]" role="status">
                Buscando en las notas…
              </p>
            )}
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
            disabled={pending || !question.trim()}
            className="h-11 shrink-0 rounded-xl bg-[var(--brand-sea)] px-5 text-sm font-semibold text-[var(--brand-sky)] transition-opacity disabled:opacity-40"
          >
            Preguntar
          </button>
        </div>
      </form>
    </div>
  );
}
