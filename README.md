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

## ⚠️ Nota de seguridad — RLS deshabilitado

Las tablas del schema `historico` (incluida `deals`) tienen **Row Level Security
deshabilitado** en Supabase: cualquier cliente con la key `anon`/`publishable`
puede leer (o escribir) todas las filas, sin restricción. Esta app mitiga el
riesgo consultando Supabase **solo desde el servidor** (nunca desde el cliente),
pero la key en sí sigue siendo de acceso total si se filtrara. Recomendación a
medio plazo: habilitar RLS y añadir políticas de solo-lectura.

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

## Estructura

- `src/lib/supabase.ts` — cliente Supabase server-only
- `src/lib/data.ts` — query a `historico.deals`
- `src/lib/transform.ts` — parsing de filas crudas + categorización de canal
- `src/lib/aggregate.ts` — construcción de la matriz del funnel
- `src/lib/colors.ts` — paleta categórica (validada con la dataviz skill)
- `src/components/` — UI (Server Components)
