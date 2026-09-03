# Decelera Hub — Opencall México 2026

Dashboard de seguimiento de la opencall México 2026, leyendo directamente del
schema `historico` de Supabase (sincronizado desde Attio).

## Stack

- Next.js 16 (App Router, TypeScript) + Tailwind CSS v4
- Supabase (`@supabase/supabase-js`) contra el schema `historico` del proyecto
  `ewhruuwvarxthbgimxyf` (eu-west-1)

## Setup

```bash
npm install
cp .env.local.example .env.local
# rellena SUPABASE_KEY (ver más abajo)
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000).

### Variables de entorno

`SUPABASE_URL` y `SUPABASE_KEY` viven solo en `.env.local` (nunca con prefijo
`NEXT_PUBLIC_`) y solo se usan en `src/lib/supabase.ts`, importado exclusivamente
desde Server Components / módulos server-only (`getOpencallDeals` en
`src/lib/data.ts`). La key nunca llega al bundle del navegador.

Ver `.env.local.example` para el resto: `SUPABASE_SERVICE_ROLE_KEY` (schema `hub`)
y `AUTH_*` (NextAuth). Todas server-only.

## Login (NextAuth + Google)

El hub exige login con cuenta de Decelera (`@decelera.com` /
`@decelerastartups.com`) vía **NextAuth v5** con Google — independiente de la Auth
de Supabase. La sesión es un JWT en cookie; no hay tabla de sesiones.

Los datos por usuario (miembros, favoritos, carpetas, visibilidad de apps) viven
en el schema **`hub`** del mismo proyecto Supabase que `historico`, y se acceden
solo desde el servidor (`src/lib/supabase/hub.ts`). La autorización es 100%
código: `src/lib/hub.ts` (`getMember` / `requireMember` / `requireAdmin`) — cada
consulta a `hub` va scoped por el `id` del miembro.

Alta de miembros: primer login con dominio válido → fila en `hub.members`
(`role='member'`, `is_active=true`). Rol y bajas se editan a mano en Supabase.

## Qué muestra

Fuente: `historico.deals` filtrado por `stage IN ('Mexico 2026', 'Leads Mexico 2026')`.

- **Funnel por canal de entrada**: matriz con el canal (Marketing / Referral /
  Outreach / Otros, derivado de `reference_3`) en filas y las etapas del
  pipeline (Contacted → Qualified → In play → Pre-committee → Invested) en
  columnas, con % de conversión acumulada respecto a la etapa anterior.
  - Para deals vivos, la etapa alcanzada es su `status` actual.
  - Para deals Killed / Not qualified, la etapa alcanzada es `status_6` (su
    último estado activo antes de morir) — así el funnel refleja hasta dónde
    llegó cada compañía, no solo las que siguen vivas.
  - Killed / Not qualified se muestran como columnas informativas aparte
    (totales por canal), fuera de la cadena de conversión.
- **Vista "Gate Out"**: toggle en el dashboard que sustituye los KPIs y
  gráficos de volumen por dos tasas de conversión a "hubo llamada + análisis"
  (= el deal llegó a "In play" o más allá, sea cual sea su estado actual):
  - **Aplicaciones → llamada + análisis**: `# deals con lastPipelineStage ≥
    In play` ÷ `# deals totales` (dentro del filtro activo).
  - **Outreach → hablamos con ellos**: la misma fórmula, mismo numerador
    (llegaron a "In play"+), pero el denominador es solo los deals con
    `channel === "Outreach"` (LinkedIn, Events, Outbound emailing, Maru).
  - Implementación: `buildGateOutSummary` en `src/lib/aggregate.ts`.

## Estructura

- `src/lib/supabase.ts` — cliente Supabase server-only
- `src/lib/data.ts` — query a `historico.deals`
- `src/lib/transform.ts` — parsing de filas crudas + categorización de canal
- `src/lib/aggregate.ts` — construcción de la matriz del funnel
- `src/lib/colors.ts` — paleta categórica (validada con la dataviz skill)
- `src/components/` — UI (Server Components)
