/** Tipos y etiquetas compartidos entre la lógica de servidor del Brain y su interfaz. Sin dependencias de servidor. */

export type BrainSource = {
  /** Número con el que la respuesta cita el fragmento: [1], [2]… */
  n: number;
  /** Ficha de origen: "Deal", "Empresa", "Persona" o "EM". */
  kind: string;
  /** Nombre de la ficha (startup, persona…). */
  name: string;
  /** Tipo de texto: "Nota", "Comentario", "Descripción"… */
  type: string;
  fecha: string | null;
  autor: string | null;
  titulo: string | null;
  /** Arranque del fragmento, para que se vea de dónde sale la cita. */
  snippet: string;
};

/**
 * Eventos que el servidor envía al navegador (una línea JSON por evento, NDJSON):
 * `delta` va llegando mientras Claude escribe; `done` cierra con las fuentes citadas; `error` corta.
 */
export type BrainEvent =
  | { type: "delta"; text: string }
  | { type: "done"; sources: BrainSource[]; consulted: number }
  | { type: "error"; error: string };

/** historico.<tabla> → etiqueta de ficha */
export const KIND_LABEL: Record<string, string> = {
  deals: "Deal",
  companies: "Empresa",
  people: "Persona",
  ems: "EM",
};

/** columna de origen → etiqueta del tipo de texto */
export const TYPE_LABEL: Record<string, string> = {
  attio_notes: "Nota",
  attio_comments: "Comentario",
  description: "Descripción",
  notes: "Nota",
  added_comments: "Comentario",
  signals_comments_qualified: "Señal",
  notes_mexico: "Nota",
};
