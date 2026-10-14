import "server-only";
import { createClient } from "@supabase/supabase-js";

// Lectura de `historico` SOLO desde servidor con la service-role key (ya usada por ./supabase/hub.ts).
// `historico` no es legible por anon/authenticated (RLS + REVOKE, 2026-09-29): una key anon
// ya no puede leer estas tablas ni las vistas *_live.
const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  throw new Error("Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY env vars");
}

export const historico = createClient(url, key, {
  db: { schema: "historico" },
  auth: { persistSession: false, autoRefreshToken: false },
});
