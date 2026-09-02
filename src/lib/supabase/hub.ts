import "server-only";
import { createClient } from "@supabase/supabase-js";

// Datos por usuario del hub (schema `hub` del mismo proyecto que `historico`). Se accede SOLO
// desde el servidor con la service-role key: las tablas de `hub` tienen RLS deny-all, así que
// una key anon/publishable filtrada no puede tocarlas y este cliente la salta.
const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  throw new Error("Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY env vars");
}

export const hubDb = createClient(url, key, {
  db: { schema: "hub" },
  auth: { persistSession: false, autoRefreshToken: false },
});
