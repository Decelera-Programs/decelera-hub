/**
 * Heurística de "¿esto se puede meter en un iframe?". No hay forma fiable de detectar
 * `X-Frame-Options` / `frame-ancestors` desde JS, así que:
 *  - rutas internas del hub → siempre
 *  - Google Docs/Sheets/Slides → sí (se reescriben a `/preview`, solo lectura)
 *  - Drive: solo un fichero suelto (`/file/d/…`), no las carpetas
 *  - hosts conocidos por bloquear → no (abren en pestaña nueva)
 *  - el resto → se intenta; si no carga, el panel ofrece "abrir en pestaña nueva"
 */
const NO_EMBED_HOSTS = new Set([
  "github.com",
  "gist.github.com",
  "gitlab.com",
  "www.google.com",
  "google.com",
  "accounts.google.com",
  "mail.google.com",
  "calendar.google.com",
  "linkedin.com",
  "www.linkedin.com",
  "x.com",
  "twitter.com",
  "www.figma.com",
  "figma.com",
  "notion.so",
  "www.notion.so",
]);

function siteOrigin(): string {
  return typeof window !== "undefined" ? window.location.origin : "http://localhost";
}

export function canEmbedUrl(href: string): boolean {
  const raw = href.trim();
  if (!raw) return false;
  // ruta interna del propio hub
  if (raw.startsWith("/")) return true;
  try {
    const u = new URL(raw, siteOrigin());
    if (u.protocol !== "http:" && u.protocol !== "https:") return false;
    if (u.origin === siteOrigin()) return true;
    if (u.hostname === "docs.google.com") return true;
    if (u.hostname === "drive.google.com") return /\/file\/d\//.test(u.pathname);
    return !NO_EMBED_HOSTS.has(u.hostname);
  } catch {
    return false;
  }
}

/** Reescribe el enlace a una variante embebible cuando hace falta (Google Docs/Drive). */
export function toEmbedSrc(href: string): string {
  try {
    const u = new URL(href, siteOrigin());
    if (u.hostname === "docs.google.com") {
      const p = u.pathname.replace(/\/$/, "");
      if (/\/(edit|view|htmlview)$/.test(p)) {
        u.pathname = p.replace(/\/(edit|view|htmlview)$/, "/preview");
        u.search = "";
        u.hash = "";
        return u.toString();
      }
    }
    if (u.hostname === "drive.google.com" && /\/file\/d\//.test(u.pathname) && !/\/preview\/?$/.test(u.pathname)) {
      u.pathname = u.pathname.replace(/\/(view|edit)?\/?$/, "/preview");
      return u.toString();
    }
    return href;
  } catch {
    return href;
  }
}
