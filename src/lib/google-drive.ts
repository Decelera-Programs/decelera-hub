import "server-only";
import { createCipheriv, createDecipheriv, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { hubDb } from "@/lib/supabase/hub";

/**
 * Conexión opcional del Drive de cada persona con el Brain: permiso de SOLO LECTURA (drive.readonly), pedido
 * en el momento y por separado del login. El Brain abre los documentos con el token de quien pregunta, así que
 * nunca ve más que esa persona. El token de actualización se guarda cifrado (AES-256-GCM, clave BRAIN_TOKEN_KEY).
 */

export const DRIVE_SCOPE = "https://www.googleapis.com/auth/drive.readonly";
const AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const REVOKE_URL = "https://oauth2.googleapis.com/revoke";

/** ¿Está configurada la conexión? Sin clave de cifrado o sin credenciales de Google, la función queda apagada. */
export function driveConnectEnabled(): boolean {
  return !!(process.env.BRAIN_TOKEN_KEY && process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET);
}

function key(): Buffer {
  const raw = process.env.BRAIN_TOKEN_KEY ?? "";
  const buf = /^[0-9a-f]{64}$/i.test(raw) ? Buffer.from(raw, "hex") : Buffer.from(raw, "base64");
  if (buf.length !== 32) throw new Error("BRAIN_TOKEN_KEY debe ser de 32 bytes (64 hex o base64)");
  return buf;
}

export function encryptToken(plain: string): string {
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", key(), iv);
  const enc = Buffer.concat([c.update(plain, "utf8"), c.final()]);
  return `v1.${iv.toString("base64")}.${c.getAuthTag().toString("base64")}.${enc.toString("base64")}`;
}

export function decryptToken(stored: string): string {
  const [v, iv, tag, enc] = stored.split(".");
  if (v !== "v1" || !iv || !tag || !enc) throw new Error("token cifrado no válido");
  const d = createDecipheriv("aes-256-gcm", key(), Buffer.from(iv, "base64"));
  d.setAuthTag(Buffer.from(tag, "base64"));
  return Buffer.concat([d.update(Buffer.from(enc, "base64")), d.final()]).toString("utf8");
}

/** Dirección pública del hub (para la URL de retorno de Google). */
export function appOrigin(req: Request): string {
  const env = process.env.AUTH_URL?.replace(/\/+$/, "");
  if (env) return new URL(env).origin;
  const h = req.headers;
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? new URL(req.url).host;
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

export const redirectUri = (req: Request) => `${appOrigin(req)}/api/google/drive/callback`;

// --- state anti-CSRF: nonce firmado que va en una cookie y en la URL de Google ---
const sign = (data: string) => createHmac("sha256", process.env.AUTH_SECRET ?? "").update(data).digest("base64url");

export function makeState(memberId: string): { state: string; cookie: string } {
  const nonce = randomBytes(16).toString("base64url");
  const body = `${nonce}.${memberId}.${Date.now()}`;
  const state = `${body}.${sign(body)}`;
  return { state, cookie: state };
}

export function checkState(state: string | null, cookie: string | undefined, memberId: string): boolean {
  if (!state || !cookie || state !== cookie) return false;
  const parts = state.split(".");
  if (parts.length !== 4) return false;
  const [nonce, member, ts, sig] = parts;
  const expected = sign(`${nonce}.${member}.${ts}`);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return false;
  return member === memberId && Date.now() - Number(ts) < 10 * 60_000;
}

export function authorizeUrl(req: Request, state: string, loginHint?: string): string {
  const u = new URL(AUTH_URL);
  u.searchParams.set("client_id", process.env.AUTH_GOOGLE_ID!);
  u.searchParams.set("redirect_uri", redirectUri(req));
  u.searchParams.set("response_type", "code");
  u.searchParams.set("scope", `openid email ${DRIVE_SCOPE}`);
  u.searchParams.set("access_type", "offline");
  u.searchParams.set("prompt", "consent"); // para que Google devuelva siempre el refresh_token
  u.searchParams.set("state", state);
  if (loginHint) u.searchParams.set("login_hint", loginHint);
  return u.toString();
}

type TokenResponse = { access_token?: string; refresh_token?: string; expires_in?: number; scope?: string; id_token?: string; error?: string };

async function tokenRequest(params: Record<string, string>): Promise<TokenResponse> {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: process.env.AUTH_GOOGLE_ID!, client_secret: process.env.AUTH_GOOGLE_SECRET!, ...params }),
    signal: AbortSignal.timeout(15_000),
  });
  return (await res.json().catch(() => ({}))) as TokenResponse;
}

/** Cambia el código de Google por tokens y guarda (cifrado) el de actualización. Devuelve el email de la cuenta. */
export async function completeConnection(req: Request, code: string, memberId: string, memberEmail: string): Promise<{ ok: true } | { ok: false; reason: string }> {
  const t = await tokenRequest({ code, grant_type: "authorization_code", redirect_uri: redirectUri(req) });
  if (!t.refresh_token || !t.scope?.includes("drive.readonly")) {
    return { ok: false, reason: t.error ? `Google respondió: ${t.error}` : "Google no concedió el permiso de lectura de Drive." };
  }
  // La cuenta con la que se autoriza debe ser la del miembro (evita conectar el Drive de otra cuenta por error).
  const email = (() => {
    try {
      const payload = JSON.parse(Buffer.from((t.id_token ?? "").split(".")[1] ?? "", "base64url").toString("utf8")) as { email?: string };
      return payload.email?.toLowerCase();
    } catch {
      return undefined;
    }
  })();
  if (email && email !== memberEmail.toLowerCase()) {
    return { ok: false, reason: `Has autorizado con ${email}, pero tu sesión es de ${memberEmail}. Usa la misma cuenta.` };
  }
  const { error } = await hubDb.from("member_google_tokens").upsert({
    member_id: memberId,
    refresh_token_enc: encryptToken(t.refresh_token),
    scope: t.scope,
    connected_at: new Date().toISOString(),
  });
  if (error) return { ok: false, reason: "No he podido guardar la conexión." };
  return { ok: true };
}

export async function isConnected(memberId: string): Promise<boolean> {
  const { data } = await hubDb.from("member_google_tokens").select("member_id").eq("member_id", memberId).maybeSingle();
  return !!data;
}

// Tokens de acceso (1 h) en memoria del servidor, para no refrescar en cada pregunta.
const accessCache = new Map<string, { token: string; exp: number }>();

/** Token de acceso de Drive de esta persona, o null si no ha conectado su Drive (o lo revocó). */
export async function getDriveAccessToken(memberId: string): Promise<string | null> {
  if (!driveConnectEnabled()) return null;
  const cached = accessCache.get(memberId);
  if (cached && cached.exp > Date.now() + 60_000) return cached.token;
  const { data } = await hubDb.from("member_google_tokens").select("refresh_token_enc").eq("member_id", memberId).maybeSingle();
  if (!data) return null;
  let refresh: string;
  try {
    refresh = decryptToken(data.refresh_token_enc as string);
  } catch {
    return null;
  }
  const t = await tokenRequest({ refresh_token: refresh, grant_type: "refresh_token" });
  if (!t.access_token) {
    if (t.error === "invalid_grant") {
      // El permiso se revocó desde Google: se borra la conexión.
      await hubDb.from("member_google_tokens").delete().eq("member_id", memberId);
    }
    return null;
  }
  accessCache.set(memberId, { token: t.access_token, exp: Date.now() + (t.expires_in ?? 3600) * 1000 });
  return t.access_token;
}

export async function disconnect(memberId: string): Promise<void> {
  const { data } = await hubDb.from("member_google_tokens").select("refresh_token_enc").eq("member_id", memberId).maybeSingle();
  accessCache.delete(memberId);
  if (data) {
    try {
      await fetch(REVOKE_URL, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ token: decryptToken(data.refresh_token_enc as string) }),
        signal: AbortSignal.timeout(10_000),
      });
    } catch {
      /* si Google no responde, igualmente se borra aquí */
    }
  }
  await hubDb.from("member_google_tokens").delete().eq("member_id", memberId);
}
