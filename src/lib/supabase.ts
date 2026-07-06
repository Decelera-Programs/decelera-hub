import "server-only";
import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_KEY;

if (!url || !key) {
  throw new Error("Missing SUPABASE_URL / SUPABASE_KEY env vars");
}

export const historico = createClient(url, key, {
  db: { schema: "historico" },
  auth: { persistSession: false },
});
