#!/usr/bin/env node
/**
 * Lanza las preguntas de questions.json contra el Brain y genera un informe en reports/ (ignorado por git).
 *
 *   1. Arranca el hub en local con HUB_DEV_EMAIL en .env.local:  npm run dev -- -p 3100
 *   2. node scripts/brain-eval/run.mjs [--base http://localhost:3100] [--only id1,id2] [--delay 20]
 *
 * Corrección automática: expect (todo debe aparecer), forbid (nada debe aparecer) y, en data/notes/mixed,
 * que la respuesta cite fuentes. Las preguntas "manual" solo se imprimen para revisarlas a ojo.
 * --delay: segundos entre preguntas; con Voyage sin método de pago (3 RPM) hacen falta ~20.
 */
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const opt = (name, def) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : def;
};
const BASE = opt("base", "http://localhost:3100");
const ONLY = opt("only", "")?.split(",").filter(Boolean);
const DELAY = Number(opt("delay", "20")) * 1000;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
/** "1.496" / "1,496" / "1 496" → "1496", para comparar cifras sin depender del formato. */
const norm = (s) => s.replace(/(\d)[.,\s](?=\d{3}(\D|$))/g, "$1").toLowerCase();

async function ask(question) {
  const t0 = Date.now();
  const res = await fetch(`${BASE}/api/brain/ask`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question }),
  });
  if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);
  let answer = "";
  let error = null;
  let sources = [];
  let buf = "";
  const decoder = new TextDecoder();
  for await (const chunk of res.body) {
    buf += decoder.decode(chunk, { stream: true });
    let nl;
    while ((nl = buf.indexOf("\n")) >= 0) {
      const line = buf.slice(0, nl).trim();
      buf = buf.slice(nl + 1);
      if (!line) continue;
      const ev = JSON.parse(line);
      if (ev.type === "delta") answer += ev.text;
      else if (ev.type === "done") sources = ev.sources;
      else if (ev.type === "error") error = ev.error;
    }
  }
  return { answer, error, sources, seconds: (Date.now() - t0) / 1000 };
}

async function askWithRetry(question) {
  for (let attempt = 0; attempt < 4; attempt++) {
    const r = await ask(question);
    if (r.error && /saturado/i.test(r.error)) {
      await sleep(25_000);
      continue;
    }
    return r;
  }
  return await ask(question);
}

function grade(q, r) {
  const issues = [];
  if (r.error) issues.push(`error: ${r.error}`);
  const text = norm(r.answer);
  for (const e of q.expect ?? []) if (!text.includes(norm(e))) issues.push(`falta "${e}"`);
  for (const f of q.forbid ?? []) if (text.includes(norm(f))) issues.push(`no debería aparecer "${f}"`);
  if (["data", "notes", "mixed"].includes(q.type) && !r.error && r.sources.length === 0) issues.push("no cita fuentes");
  return issues;
}

const { questions } = JSON.parse(readFileSync(join(here, "questions.json"), "utf8"));
const selected = ONLY?.length ? questions.filter((q) => ONLY.includes(q.id)) : questions;

const rows = [];
for (const [i, q] of selected.entries()) {
  process.stdout.write(`[${i + 1}/${selected.length}] ${q.id} … `);
  let r;
  try {
    r = await askWithRetry(q.question);
  } catch (e) {
    r = { answer: "", error: String(e), sources: [], seconds: 0 };
  }
  const auto = !q.manual && (q.expect || q.forbid || ["data", "notes", "mixed"].includes(q.type));
  const issues = grade(q, r);
  const status = q.manual ? "REVISAR" : issues.length ? "FALLA" : "OK";
  console.log(`${status}${issues.length ? " — " + issues.join("; ") : ""} (${r.seconds.toFixed(1)}s)`);
  rows.push({ q, r, status, issues, auto });
  if (i < selected.length - 1) await sleep(DELAY);
}

const count = (s) => rows.filter((x) => x.status === s).length;
const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
const md = [
  `# Informe Brain eval · ${stamp}`,
  "",
  `OK: ${count("OK")} · FALLA: ${count("FALLA")} · A revisar a ojo: ${count("REVISAR")} · Total: ${rows.length}`,
  "",
  ...rows.flatMap(({ q, r, status, issues }) => [
    `## ${status} · ${q.id} (${q.type})`,
    `**Pregunta:** ${q.question}`,
    q._note ? `**Qué se espera:** ${q._note}` : "",
    q.expect ? `**Debe contener:** ${q.expect.join(", ")}` : "",
    issues.length ? `**Problemas:** ${issues.join("; ")}` : "",
    `**Fuentes citadas:** ${r.sources.map((s) => s.ref).join(", ") || "ninguna"} · ${r.seconds.toFixed(1)}s`,
    "",
    "```",
    r.answer.trim() || "(sin respuesta)",
    "```",
    "",
  ]),
].filter((l) => l !== "");

mkdirSync(join(here, "reports"), { recursive: true });
const file = join(here, "reports", `${stamp}.md`);
writeFileSync(file, md.join("\n") + "\n");
console.log(`\nOK ${count("OK")} · FALLA ${count("FALLA")} · REVISAR ${count("REVISAR")}\nInforme: ${file}`);
process.exitCode = count("FALLA") ? 1 : 0;
