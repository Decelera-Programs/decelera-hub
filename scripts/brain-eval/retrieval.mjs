#!/usr/bin/env node
/**
 * Mide la CALIDAD DE LA BÚSQUEDA del Brain (sin generar respuestas): ¿devuelve el trozo correcto entre los primeros?
 *
 *   1. Construir el conjunto de prueba (una vez; usa Claude para escribir preguntas a partir de trozos reales):
 *        node --env-file=.env.local scripts/brain-eval/retrieval.mjs --build 30
 *      Por cada trozo muestreado genera dos preguntas: "con_nombre" (menciona la startup/persona) y "sin_nombre"
 *      (solo detalles distintivos, sin nombrarla), que es la más exigente.
 *   2. Medirlo (repetible: tras cambiar la búsqueda se vuelve a lanzar contra el mismo conjunto):
 *        node --env-file=.env.local scripts/brain-eval/retrieval.mjs [--k 30] [--delay 21] [--limit 6]
 *
 * Métricas: acierto@5, acierto@12 (lo que ve hoy el Brain: MATCH_COUNT=12), acierto@k y MRR, por tipo de pregunta y
 * por fuente. Una pregunta "falla" si el trozo de origen no sale en los k primeros. Aviso: un fallo puede ser un trozo
 * casi idéntico que también responde; por eso se listan los fallos para revisarlos a ojo.
 * El conjunto y los informes contienen texto del CRM: viven en reports/ (ignorado por git).
 * --delay: segundos entre llamadas a Voyage (21 con el plan sin pago, 3 RPM; 0 con método de pago).
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import Anthropic from "@anthropic-ai/sdk";

const here = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const opt = (n, d) => {
  const i = args.indexOf(`--${n}`);
  return i >= 0 ? args[i + 1] : d;
};
const REPORTS = join(here, "reports");
const SET_PATH = opt("set", join(REPORTS, "retrieval-set.json"));
const K = Number(opt("k", "30"));
const DELAY = Number(opt("delay", "21")) * 1000;
const LIMIT = Number(opt("limit", "0"));
const BUILD = opt("build", "");

const need = (name) => {
  const v = process.env[name];
  if (!v) throw new Error(`Falta ${name} (usa --env-file=.env.local)`);
  return v;
};
const db = createClient(need("SUPABASE_URL"), need("SUPABASE_SERVICE_ROLE_KEY"), {
  db: { schema: "hub" },
  auth: { persistSession: false, autoRefreshToken: false },
});
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const shuffle = (a) => a.map((x) => [Math.random(), x]).sort((x, y) => x[0] - y[0]).map((x) => x[1]);

async function recordName(table, recordId) {
  const { data } = await db.schema("historico").from(table).select("name").eq("record_id", recordId).limit(1);
  return (data?.[0]?.name ?? "").trim() || "(sin nombre)";
}

// ── 1. Construcción del conjunto ─────────────────────────────────────────────────────────────────────────────────
async function build(n) {
  // Trozos con texto suficiente para tener algo concreto que preguntar.
  const rows = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await db
      .from("brain_chunks")
      .select("id, source_table, source_column, record_id, texto")
      .range(from, from + 999);
    if (error) throw error;
    rows.push(...data);
    if (data.length < 1000) break;
  }
  const eligible = rows.filter((r) => r.texto.length >= 350 && r.texto.length <= 1900);
  const groups = new Map();
  for (const r of eligible) {
    const g = `${r.source_table}.${r.source_column}`;
    if (!groups.has(g)) groups.set(g, []);
    groups.get(g).push(r);
  }
  for (const [g, list] of groups) groups.set(g, shuffle(list));
  // Reparto por turnos entre fuentes, para que todas estén representadas.
  const picked = [];
  while (picked.length < n && [...groups.values()].some((l) => l.length)) {
    for (const l of groups.values()) if (l.length && picked.length < n) picked.push(l.shift());
  }
  console.log(`Muestreados ${picked.length} trozos de ${groups.size} fuentes. Generando preguntas…`);

  const client = new Anthropic({ apiKey: need("ANTHROPIC_API_KEY") });
  const items = [];
  for (const [i, c] of picked.entries()) {
    const name = await recordName(c.source_table, c.record_id);
    const prompt = `Eres alguien del equipo de inversión de Decelera (programas para startups). Este fragmento viene del CRM (ficha: "${name}", tipo: ${c.source_table}.${c.source_column}):

<fragmento>
${c.texto}
</fragmento>

Escribe dos preguntas, en español y con el tono con el que un compañero se lo preguntaría a un buscador interno, cuya respuesta esté en este fragmento:
1. "con_nombre": menciona la ficha ("${name}") y pregunta por un detalle concreto del fragmento.
2. "sin_nombre": NO nombres la ficha ni ninguna empresa o persona concreta; describe la situación con 2 o 3 detalles distintivos del fragmento (cifras, producto, sector, hecho concreto) para que solo este fragmento encaje.
No copies frases largas del fragmento. Responde SOLO con JSON: {"con_nombre":"...","sin_nombre":"..."}`;
    try {
      let q;
      for (let attempt = 0; ; attempt++) {
        try {
          const res = await client.messages.create({
            model: "claude-haiku-5-5",
            max_tokens: 1000,
            messages: [{ role: "user", content: prompt }],
          });
          const text = res.content.filter((b) => b.type === "text").map((b) => b.text).join("");
          q = JSON.parse(text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1));
          if (!q.con_nombre || !q.sin_nombre) throw new Error("JSON incompleto");
          break;
        } catch (e) {
          if (attempt >= 2) throw new Error(`${e.message} (stop_reason o formato inesperado)`);
        }
      }
      items.push({
        chunk_id: c.id,
        source: `${c.source_table}.${c.source_column}`,
        record_id: c.record_id,
        name,
        excerpt: c.texto.slice(0, 220).replace(/\s+/g, " "),
        questions: { con_nombre: q.con_nombre, sin_nombre: q.sin_nombre },
      });
      process.stdout.write(`\r  ${i + 1}/${picked.length}`);
    } catch (e) {
      console.log(`\n  trozo ${i + 1} descartado: ${e.message}`);
    }
  }
  mkdirSync(REPORTS, { recursive: true });
  writeFileSync(SET_PATH, JSON.stringify({ built_at: new Date().toISOString(), items }, null, 2));
  console.log(`\nConjunto guardado: ${SET_PATH} (${items.length} trozos, ${items.length * 2} preguntas)`);
}

// ── 2. Medición ──────────────────────────────────────────────────────────────────────────────────────────────────
async function embedQuery(text) {
  for (let attempt = 0; attempt < 5; attempt++) {
    const res = await fetch("https://api.voyageai.com/v1/embeddings", {
      method: "POST",
      headers: { Authorization: `Bearer ${need("VOYAGE_API_KEY")}`, "Content-Type": "application/json" },
      body: JSON.stringify({ input: [text], model: "voyage-4", input_type: "query" }),
    });
    if (res.status === 429) {
      await sleep(22_000);
      continue;
    }
    if (!res.ok) throw new Error(`Voyage ${res.status}`);
    return (await res.json()).data[0].embedding;
  }
  throw new Error("Voyage saturado");
}

/** Un solo vector de pregunta para las dos búsquedas, así se comparan en igualdad de condiciones. */
async function search(text) {
  const emb = `[${(await embedQuery(text)).join(",")}]`;
  const base = await db.rpc("brain_match", { query_embedding: emb, match_count: K });
  if (base.error) throw base.error;
  const hybrid = await db.rpc("brain_match_hybrid", { query_embedding: emb, query_text: text, match_count: 12, name_count: 6 });
  if (hybrid.error) throw hybrid.error;
  return { base: base.data ?? [], hybrid: hybrid.data ?? [] };
}

const pct = (x, n) => (n ? `${((100 * x) / n).toFixed(0)}%` : "–");

async function measure() {
  if (!existsSync(SET_PATH)) throw new Error(`No hay conjunto: lanza antes --build N (${SET_PATH})`);
  let { items } = JSON.parse(readFileSync(SET_PATH, "utf8"));
  if (LIMIT) items = items.slice(0, LIMIT);

  const results = [];
  let done = 0;
  for (const it of items) {
    for (const kind of ["con_nombre", "sin_nombre"]) {
      const q = it.questions[kind];
      let rank = null;
      let hybridRank = null;
      let top = null;
      try {
        const { base, hybrid } = await search(q);
        const idx = base.findIndex((h) => h.id === it.chunk_id);
        rank = idx >= 0 ? idx + 1 : null;
        const hidx = hybrid.findIndex((h) => h.id === it.chunk_id);
        hybridRank = hidx >= 0 ? hidx + 1 : null;
        if (base[0]) top = `${base[0].source_table}.${base[0].source_column} · ${await recordName(base[0].source_table, base[0].record_id)}`;
      } catch (e) {
        console.log(`  error: ${e.message}`);
      }
      results.push({ it, kind, q, rank, hybridRank, top });
      process.stdout.write(`\r  ${++done}/${items.length * 2}`);
      if (DELAY) await sleep(DELAY);
    }
  }
  console.log("");

  // Dos búsquedas con el mismo vector de pregunta: "significado" (la de antes: 12 trozos) e "híbrida" (12 por
  // significado + hasta 6 por nombre de ficha = hasta 18). Lo que ve el Brain es @12 en la primera y @18 en la segunda.
  const stat = (rs, key) => {
    const n = rs.length;
    const at = (m) => rs.filter((r) => r[key] && r[key] <= m).length;
    const mrr = rs.reduce((s, r) => s + (r[key] ? 1 / r[key] : 0), 0) / (n || 1);
    return { n, a5: pct(at(5), n), a12: pct(at(12), n), a18: pct(at(18), n), mrr: mrr.toFixed(2) };
  };
  const line = (label, rs) => {
    const a = stat(rs, "rank");
    const b = stat(rs, "hybridRank");
    return `| ${label} | ${a.n} | ${a.a5} / ${b.a5} | ${a.a12} / ${b.a12} | ${a.a18} / ${b.a18} | ${a.mrr} / ${b.mrr} |`;
  };
  const head = `| (significado / híbrida) | preguntas | acierto@5 | acierto@12 | acierto@18 | MRR |\n|---|---|---|---|---|---|`;
  const brainSees = (rs) => `${stat(rs, "rank").a12} → ${stat(rs, "hybridRank").a18}`;

  const sources = [...new Set(results.map((r) => r.it.source))].sort();
  const md = [
    `# Búsqueda del Brain · ${new Date().toISOString().slice(0, 19)}`,
    "",
    `Conjunto: ${items.length} trozos, ${results.length} preguntas. Cada celda: significado / híbrida.`,
    `**Lo que ve el Brain** (significado @12 → híbrida @18): todas ${brainSees(results)} · con nombre ${brainSees(results.filter((r) => r.kind === "con_nombre"))} · sin nombre ${brainSees(results.filter((r) => r.kind === "sin_nombre"))}`,
    "",
    head,
    line("**todas**", results),
    line("con nombre", results.filter((r) => r.kind === "con_nombre")),
    line("sin nombre", results.filter((r) => r.kind === "sin_nombre")),
    "",
    "## Por fuente",
    "",
    head,
    ...sources.map((s) => line(s, results.filter((r) => r.it.source === s))),
    "",
    "## Fallos de la búsqueda híbrida (el trozo no está entre los devueltos)",
    "",
    ...results
      .filter((r) => !r.hybridRank)
      .flatMap((r) => [
        `- **${r.kind}** · ${r.it.source} · ${r.it.name}`,
        `  - Pregunta: ${r.q}`,
        `  - Trozo esperado: ${r.it.excerpt}…`,
        `  - Primer resultado (significado): ${r.top ?? "(ninguno)"}`,
      ]),
    "",
    "## Preguntas que la híbrida arregla (fallaban con solo significado)",
    "",
    ...results
      .filter((r) => (!r.rank || r.rank > 12) && r.hybridRank)
      .map((r) => `- ${r.kind} · ${r.it.name}: ${r.q}`),
    "",
    "## Preguntas que la híbrida empeora",
    "",
    ...results.filter((r) => r.rank && r.rank <= 12 && !r.hybridRank).map((r) => `- ${r.kind} · ${r.it.name}: ${r.q}`),
  ].join("\n");

  mkdirSync(REPORTS, { recursive: true });
  const file = join(REPORTS, `retrieval-${new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19)}.md`);
  writeFileSync(file, md + "\n");
  console.log(
    `Lo que ve el Brain (significado @12 → híbrida @18): todas ${brainSees(results)} · con nombre ${brainSees(results.filter((r) => r.kind === "con_nombre"))} · sin nombre ${brainSees(results.filter((r) => r.kind === "sin_nombre"))}\nInforme: ${file}`,
  );
}

if (BUILD) await build(Number(BUILD));
else await measure();
