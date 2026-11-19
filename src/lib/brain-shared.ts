/** Tipos y etiquetas compartidos entre la lógica de servidor del Brain y su interfaz. Sin dependencias de servidor. */

export type BrainSource = {
  /** Marca con la que la respuesta cita la fuente: "1", "2"… (fragmentos de notas) o "D1", "D2"… (consultas de datos). */
  ref: string;
  /** Ficha de origen: "Deal", "Empresa", "Persona" o "EM". */
  kind: string;
  /** Nombre de la ficha (startup, persona…). */
  name: string;
  /** Tipo de texto: "Nota", "Comentario", "Descripción"… */
  type: string;
  fecha: string | null;
  autor: string | null;
  titulo: string | null;
  /** Arranque del fragmento, para que se vea de dónde sale la cita (o la consulta SQL, si es de datos). */
  snippet: string;
  /** true si la fuente es una consulta de datos (se muestra el SQL tal cual). */
  isQuery?: boolean;
};

/** Tarjeta del hub (dashboard, herramienta, documento) que la respuesta recomienda; se pinta bajo el texto. */
export type BrainCard = {
  /** Marca con la que la respuesta la cita: "C1", "C2"… */
  ref: string;
  slug: string;
  title: string;
  /** "Dashboard", "Herramienta", "Datos"… */
  category: string;
  /** Dónde está en el hub: "Investment › Portfolio". */
  path: string;
  description: string;
  href: string;
  /** true si abre fuera del hub. */
  external: boolean;
  /** true si se puede previsualizar dentro del chat (iframe). */
  embeddable: boolean;
};

/**
 * Eventos que el servidor envía al navegador (una línea JSON por evento, NDJSON):
 * `delta` va llegando mientras Claude escribe; `done` cierra con las fuentes citadas; `error` corta.
 */
export type BrainEvent =
  | { type: "delta"; text: string }
  | { type: "done"; sources: BrainSource[]; consulted: number; queryId: string | null; cards: BrainCard[] }
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
