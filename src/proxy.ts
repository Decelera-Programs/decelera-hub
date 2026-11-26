import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig } from "@/auth.config";

/**
 * Proxy global de autenticación (2026-11-26, auditoría): TODA ruta exige sesión salvo las públicas de abajo.
 * Es una red de seguridad: cada página, ruta de API y server action sigue comprobando el miembro
 * (`getMember()`, que además mira que esté activo en hub.members). Esto evita que una ruta nueva sin esa
 * comprobación quede abierta por olvido.
 *
 * Usa solo `authConfig` (sin base de datos): mira que haya un JWT de sesión válido, nada más.
 * Sin sesión: las páginas redirigen a /login (volviendo luego a donde iban) y la API responde 401.
 */
const { auth } = NextAuth({
  ...authConfig,
  callbacks: { ...authConfig.callbacks, authorized: () => true }, // la decisión la toma el handler de abajo
});

/** Rutas que se pueden abrir sin sesión. Añade aquí SOLO lo que de verdad tenga que ser público. */
const PUBLIC_PATHS = ["/login", "/no-access"];
const PUBLIC_PREFIXES = ["/api/auth/"];

export default auth((req) => {
  const { pathname, search } = req.nextUrl;
  const isPublic =
    PUBLIC_PATHS.includes(pathname) || PUBLIC_PREFIXES.some((p) => pathname.startsWith(p));
  if (isPublic || req.auth?.user) return NextResponse.next();

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const login = new URL("/login", req.nextUrl.origin);
  login.searchParams.set("callbackUrl", pathname + search);
  return NextResponse.redirect(login);
});

export const config = {
  // Todo menos los estáticos de Next y los archivos con extensión (iconos, logos, manifest…).
  matcher: ["/((?!_next/static|_next/image|.*\\.[a-zA-Z0-9]+$).*)"],
};
