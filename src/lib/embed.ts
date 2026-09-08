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
    // Google Docs/Sheets/Slides → vista /preview (solo lectura)
    if (u.hostname === "docs.google.com") return true;
    // Drive: ficheros sueltos (/preview) y carpetas (embeddedfolderview)
    if (u.hostname === "drive.google.com")
      return /\/file\/d\/|\/folders\//.test(u.pathname) || !!u.searchParams.get("id");
    return !NO_EMBED_HOSTS.has(u.hostname);
  } catch {
    return false;
  }
}

/**
 * Reescribe el enlace a una variante embebible:
 *  - Docs/Sheets/Slides `…/edit` → `…/preview` (solo lectura; conserva `gid` de la hoja)
 *  - Drive fichero `…/file/d/<id>/…` → `…/file/d/<id>/preview`
 *  - Drive carpeta `…/folders/<id>` → `embeddedfolderview?id=<id>#grid`
 * Para editar de verdad hay que usar el botón "abrir en pestaña nueva".
 */
export function toEmbedSrc(href: string): string {
  try {
    const u = new URL(href, siteOrigin());

    if (u.hostname === "docs.google.com") {
      const p = u.pathname.replace(/\/$/, "");
      if (/\/(edit|view|htmlview|preview)$/.test(p)) {
        const gid = u.searchParams.get("gid") ?? u.hash.match(/gid=(\d+)/)?.[1] ?? null;
        u.pathname = p.replace(/\/(edit|view|htmlview|preview)$/, "/preview");
        u.search = gid ? `?gid=${gid}` : "";
        u.hash = "";
        return u.toString();
      }
      return href;
    }

    if (u.hostname === "drive.google.com") {
      const folder = u.pathname.match(/\/folders\/([-\w]+)/)?.[1] ?? u.searchParams.get("id");
      if (folder && /\/folders\//.test(u.pathname))
        return `https://drive.google.com/embeddedfolderview?id=${folder}#grid`;
      const file = u.pathname.match(/\/file\/d\/([-\w]+)/)?.[1];
      if (file) return `https://drive.google.com/file/d/${file}/preview`;
      return href;
    }

    return href;
  } catch {
    return href;
  }
}
