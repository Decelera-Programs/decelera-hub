"use client";

import { Bar, BarChart, CartesianGrid, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ChartCard } from "./ChartCard";
import { buildQualitySummary } from "@/lib/aggregate";
import type { Deal } from "@/lib/types";

function truncate(text: string, max = 42) {
  return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;
}

function PctTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: { label: string; fullLabel?: string; pct: number; detail?: string } }>;
}) {
  if (!active || !payload?.length) return null;
  const { label, fullLabel, pct, detail } = payload[0].payload;
  return (
    <div className="card max-w-xs px-3 py-2 text-sm shadow-md">
      <p className="font-medium text-[var(--text-primary)]">{fullLabel ?? label}</p>
      <p className="text-[var(--text-secondary)]">
        {pct}% {detail}
      </p>
    </div>
  );
}

export function QualitySummary({ deals }: { deals: Deal[] }) {
  const summary = buildQualitySummary(deals);

  if (summary.sampleSize === 0) {
    return (
      <ChartCard title="Calidad de las aplicaciones" subtitle="Puntuación del formulario y green flags">
        <p className="text-sm text-[var(--text-muted)]">
          Ninguna de las startups en este filtro tiene el formulario evaluado todavía (los Leads
          normalmente no lo tienen — solo las Aplicaciones lo rellenan).
        </p>
      </ChartCard>
    );
  }

  const dimensionData = summary.dimensions.map((d) => ({
    label: d.dimension,
    pct: d.avgPct,
    detail: `de media (sobre ${d.max} pts)`,
  }));

  const flagData = summary.topGreenFlags.map((f) => ({
    label: truncate(f.flag),
    fullLabel: f.flag,
    pct: f.pct,
    detail: `de las startups evaluadas (${f.count})`,
  }));

  return (
    <ChartCard
      title="Calidad de las aplicaciones"
      subtitle={`${summary.sampleSize} startups evaluadas · score medio ${summary.avgTotalPct}%`}
    >
      <div className="flex flex-wrap gap-2">
        {summary.tierCounts.map(({ tier, count }) => (
          <span
            key={tier}
            className="rounded-full border border-[var(--border)] px-2.5 py-1 text-xs font-medium text-[var(--text-secondary)]"
          >
            {tier}: {count}
          </span>
        ))}
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="flex flex-col gap-2">
          <h4 className="text-sm font-medium text-[var(--text-secondary)]">
            Puntuación media por dimensión
          </h4>
          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={dimensionData}
                layout="vertical"
                margin={{ top: 4, right: 36, bottom: 4, left: 8 }}
                barCategoryGap={14}
              >
                <CartesianGrid horizontal={false} stroke="var(--gridline)" />
                <XAxis
                  type="number"
                  domain={[0, 100]}
                  tickFormatter={(v) => `${v}%`}
                  tick={{ fill: "var(--text-muted)", fontSize: 12 }}
                  axisLine={{ stroke: "var(--gridline)" }}
                  tickLine={false}
                />
                <YAxis
                  type="category"
                  dataKey="label"
                  width={70}
                  tick={{ fill: "var(--text-secondary)", fontSize: 13 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip content={<PctTooltip />} cursor={{ fill: "var(--page)" }} />
                <Bar dataKey="pct" fill="var(--series-1)" radius={[0, 4, 4, 0]} maxBarSize={20}>
                  <LabelList
                    dataKey="pct"
                    position="right"
                    formatter={(v) => `${v}%`}
                    style={{ fill: "var(--text-secondary)", fontSize: 12 }}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <h4 className="text-sm font-medium text-[var(--text-secondary)]">
            Green flags más frecuentes
          </h4>
          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={flagData}
                layout="vertical"
                margin={{ top: 4, right: 36, bottom: 4, left: 8 }}
                barCategoryGap={10}
              >
                <CartesianGrid horizontal={false} stroke="var(--gridline)" />
                <XAxis
                  type="number"
                  domain={[0, 100]}
                  tickFormatter={(v) => `${v}%`}
                  tick={{ fill: "var(--text-muted)", fontSize: 12 }}
                  axisLine={{ stroke: "var(--gridline)" }}
                  tickLine={false}
                />
                <YAxis
                  type="category"
                  dataKey="label"
                  width={170}
                  tick={{ fill: "var(--text-secondary)", fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip content={<PctTooltip />} cursor={{ fill: "var(--page)" }} />
                <Bar dataKey="pct" fill="var(--series-2)" radius={[0, 4, 4, 0]} maxBarSize={16} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </ChartCard>
  );
}
