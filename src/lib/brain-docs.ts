import "server-only";
import { extractText, getDocumentProxy } from "unpdf";
import { hubDb } from "@/lib/supabase/hub";

/**
 * Lectura de documentos adjuntos a un deal (deck, data room, DD, memo…) para el Brain.
 *
 * Seguridad:
 * - El modelo NO elige la URL: indica el deal y el tipo de documento, y la URL sale de la ficha del CRM.
 * - Esas URLs las escriben los founders, así que solo se descarga de una lista de dominios permitidos, por https
 *   y siguiendo las redirecciones a mano (cada salto también debe estar en la lista): evita llamadas a direcciones internas.
 * - Fase 1: solo documentos accesibles sin sesión ("cualquiera con el enlace", nuestro Storage, Typebot). Los
 *   restringidos no se abren: se devuelve el enlace para que la persona lo abra con su cuenta.
 * - Fuera a propósito: human_dd (sensible) y program_contract_signed (contratos).
 */

export const DOC_TYPES = {
  deck: { column: "deck_url", label: "Deck" },
  data_room: { column: "data_room", label: "Data room" },
  business_dd: { column: "business_dd", label: "Business DD" },
  tech_dd: { column: "tech_dd_url", label: "Tech DD" },
  dos_pagers: { column: "2pagers", label: "2 pagers" },
  investment_memo: { column: "investment_memo", label: "Memo de inversión" },
} as const;
export type DocType = keyof typeof DOC_TYPES;
export const DOC_TYPE_KEYS = Object.keys(DOC_TYPES) as DocType[];

const ALLOWED_HOSTS: RegExp[] = [
  /^drive\.google\.com$/,
  /^docs\.google\.com$/,
  /^drive\.usercontent\.google\.com$/,
  /^[a-z0-9-]+\.googleusercontent\.com$/,
  /^ewhruuwvarxthbgimxyf\.supabase\.co$/,
  /^s3\.typebot\.io$/,
  /^s3\.typebotstorage\.com$/,
];
const MAX_BYTES = 15 * 1024 * 1024;
const MAX_TEXT_CHARS = 30_000;
const FETCH_TIMEOUT_MS = 25_000;

function allowed(u: URL): boolean {
  return u.protocol === "https:" && ALLOWED_HOSTS.some((re) => re.test(u.hostname));
}

/** Enlace "de compartir" de Google → URL de descarga/exportación directa. null si no es un tipo que sepamos leer. */
function toDownloadUrl(raw: string): URL | null {
  let u: URL;
  try {
    u = new URL(raw.trim());
  } catch {
    return null;
  }
  if (u.hostname === "drive.google.com") {
    if (u.pathname.startsWith("/drive/folders") || u.pathname.startsWith("/folders")) return null; // carpetas: no
    const id = u.pathname.match(/\/file\/d\/([\w-]+)/)?.[1] ?? u.searchParams.get("id");
    return id ? new URL(`https://drive.usercontent.google.com/download?id=${id}&export=download`) : null;
  }
  if (u.hostname === "docs.google.com") {
    const m = u.pathname.match(/^\/(document|spreadsheets|presentation)\/d\/([\w-]+)/);
    if (!m) return null;
    const format = m[1] === "spreadsheets" ? "csv" : "txt";
    return new URL(`https://docs.google.com/${m[1]}/d/${m[2]}/export?format=${format}`);
  }
  return u;
}

async function download(start: URL): Promise<{ ok: true; bytes: Uint8Array; type: string } | { ok: false; reason: "restricted" | "unsupported" | "error" }> {
  let url = start;
  for (let hop = 0; hop < 5; hop++) {
    if (!allowed(url)) return { ok: false, reason: "unsupported" };
    const res = await fetch(url, { redirect: "manual", signal: AbortSignal.timeout(FETCH_TIMEOUT_MS), headers: { "User-Agent": "Mozilla/5.0 (compatible; DeceleraBrain)" } });
    if (res.status >= 300 && res.status < 400) {
      const loc = res.headers.get("location");
      if (!loc) return { ok: false, reason: "error" };
      url = new URL(loc, url);
      continue;
    }
    if (res.status === 401 || res.status === 403 || res.status === 404) return { ok: false, reason: "restricted" };
    if (!res.ok || !res.body) return { ok: false, reason: "error" };
    const type = (res.headers.get("content-type") ?? "").toLowerCase();
    // Una página HTML en vez del archivo = pantalla de inicio de sesión / permisos de Google.
    if (type.includes("text/html")) return { ok: false, reason: "restricted" };
    const chunks: Uint8Array[] = [];
    let size = 0;
    for await (const chunk of res.body as unknown as AsyncIterable<Uint8Array>) {
      size += chunk.byteLength;
      if (size > MAX_BYTES) return { ok: false, reason: "unsupported" };
      chunks.push(chunk);
    }
    const bytes = new Uint8Array(size);
    let off = 0;
    for (const c of chunks) {
      bytes.set(c, off);
      off += c.byteLength;
    }
    return { ok: true, bytes, type };
  }
  return { ok: false, reason: "error" };
}

export type DealDoc =
  | { ok: true; dealName: string; label: string; url: string; text: string; pages: number | null; emptyPages: number; truncated: boolean }
  | { ok: false; message: string; url?: string };

const startsWith = (b: Uint8Array, s: string) => s.split("").every((ch, i) => b[i] === ch.charCodeAt(0));

export async function readDealDocument(nombre: string, documento: string): Promise<DealDoc> {
  const kind = DOC_TYPE_KEYS.find((k) => k === documento);
  if (!kind) return { ok: false, message: `Tipo de documento no válido. Opciones: ${DOC_TYPE_KEYS.join(", ")}.` };
  const wanted = nombre.trim();
  if (wanted.length < 2) return { ok: false, message: "Indica el nombre del deal." };

  const esc = wanted.replace(/[%_\\]/g, "\\$&");
  const { data, error } = await hubDb.schema("historico").from("deals_live").select("*").ilike("name", `%${esc}%`).limit(10);
  if (error) return { ok: false, message: "No he podido consultar el CRM ahora mismo." };
  const rows = (data ?? []) as Record<string, unknown>[];
  if (!rows.length) return { ok: false, message: `No encuentro ningún deal llamado "${wanted}".` };

  const exact = rows.filter((r) => String(r.name ?? "").toLowerCase() === wanted.toLowerCase());
  const pool = exact.length ? exact : rows;
  const withDoc = pool.filter((r) => typeof r[DOC_TYPES[kind].column] === "string" && /^https?:\/\//i.test(String(r[DOC_TYPES[kind].column])));
  if (!withDoc.length) {
    return { ok: false, message: `Ningún deal que coincida con "${wanted}" tiene enlace de ${DOC_TYPES[kind].label} en el CRM.` };
  }
  if (withDoc.length > 1) {
    const list = withDoc.map((r) => `${r.name} (${r.stage ?? "?"}, ${r.status ?? "?"})`).join("; ");
    return { ok: false, message: `Hay varios deals que coinciden: ${list}. Repite la consulta con el nombre exacto.` };
  }

  const row = withDoc[0];
  const link = String(row[DOC_TYPES[kind].column]);
  const dealName = String(row.name ?? wanted);
  const label = DOC_TYPES[kind].label;
  const target = toDownloadUrl(link);
  if (!target) {
    return { ok: false, url: link, message: `El enlace de ${label} de ${dealName} no es de un tipo que pueda leer (carpeta, DocSend, Canva, Notion…). Enlace: ${link}` };
  }

  let got: Awaited<ReturnType<typeof download>>;
  try {
    got = await download(target);
  } catch {
    return { ok: false, url: link, message: `No he podido descargar el ${label} de ${dealName} ahora mismo. Enlace: ${link}` };
  }
  if (!got.ok) {
    const why =
      got.reason === "restricted"
        ? "no es público (hace falta iniciar sesión en Google con acceso). Todavía no puedo abrir documentos restringidos"
        : got.reason === "unsupported"
          ? "no es un archivo que pueda leer (o es demasiado grande)"
          : "ha dado un error al descargarlo";
    return { ok: false, url: link, message: `El ${label} de ${dealName} ${why}. Quien tenga acceso puede abrirlo desde este enlace: ${link}` };
  }

  const { bytes, type } = got;
  let text = "";
  let pages: number | null = null;
  let emptyPages = 0;
  try {
    if (startsWith(bytes, "%PDF")) {
      const pdf = await getDocumentProxy(bytes);
      const out = await extractText(pdf, { mergePages: false });
      pages = out.totalPages;
      const perPage = out.text as string[];
      emptyPages = perPage.filter((t) => t.trim().length < 80).length;
      text = perPage.map((t, i) => `[p.${i + 1}] ${t.replace(/\s+/g, " ").trim()}`).join("\n");
    } else if (startsWith(bytes, "PK")) {
      return { ok: false, url: link, message: `El ${label} de ${dealName} es un archivo Word/PowerPoint/Excel, un formato que todavía no sé leer. Enlace: ${link}` };
    } else if (type.startsWith("text/") || type.includes("csv") || type.includes("json")) {
      text = new TextDecoder("utf-8").decode(bytes);
    } else {
      return { ok: false, url: link, message: `El ${label} de ${dealName} tiene un formato que no sé leer (${type || "desconocido"}). Enlace: ${link}` };
    }
  } catch {
    return { ok: false, url: link, message: `No he podido extraer el texto del ${label} de ${dealName}. Enlace: ${link}` };
  }

  text = text.trim();
  if (text.length < 40) {
    return { ok: false, url: link, message: `El ${label} de ${dealName} parece estar hecho solo de imágenes y no he podido extraer texto. Enlace: ${link}` };
  }
  const truncated = text.length > MAX_TEXT_CHARS;
  return { ok: true, dealName, label, url: link, text: truncated ? text.slice(0, MAX_TEXT_CHARS) : text, pages, emptyPages, truncated };
}
