"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ChartCard } from "./ChartCard";
import { buildWeeklyVolume, ROW_LABEL, ROW_ORDER } from "@/lib/aggregate";
import { ROW_COLOR } from "@/lib/colors";
import type { Deal } from "@/lib/types";

interface WeeklyTooltipItem {
  dataKey: string;
  value: number;
  color: string;
}

function WeeklyTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: WeeklyTooltipItem[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  const total = payload.reduce((sum, item) => sum + item.value, 0);
  return (
    <div className="card flex flex-col gap-1 px-3 py-2 text-sm shadow-md">
      <p className="font-medium text-[var(--text-primary)]">{label}</p>
      {payload.map((item) => (
        <p key={item.dataKey} className="flex items-center gap-1.5 text-[var(--text-secondary)]">
          <span aria-hidden className="inline-block h-2 w-2 rounded-full" style={{ background: item.color }} />
          {ROW_LABEL[item.dataKey] ?? item.dataKey}: {item.value}
        </p>
      ))}
      <p className="font-medium text-[var(--text-primary)]">Total: {total}</p>
    </div>
  );
}

export function WeeklyVolumeChart({ deals, tier1Only = false }: { deals: Deal[]; tier1Only?: boolean }) {
  const scopedDeals = tier1Only ? deals.filter((d) => d.formScore.tier === "Tier 1") : deals;
  const data = buildWeeklyVolume(scopedDeals);

  return (
    <ChartCard
      title="Volumen semanal por canal"
      subtitle={
        tier1Only
          ? "Deals Tier 1 creados por semana (no cambia con el filtro de semana)"
          : "Deals creados por semana (no cambia con el filtro de semana)"
      }
    >
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 8, bottom: 4, left: 0 }} barCategoryGap={16}>
            <CartesianGrid vertical={false} stroke="var(--gridline)" />
            <XAxis
              dataKey="weekLabel"
              tick={{ fill: "var(--text-secondary)", fontSize: 12 }}
              axisLine={{ stroke: "var(--gridline)" }}
              tickLine={false}
            />
            <YAxis
              allowDecimals={false}
              domain={[0, (dataMax: number) => Math.max(dataMax, 90)]}
              tick={{ fill: "var(--text-muted)", fontSize: 12 }}
              axisLine={false}
              tickLine={false}
              width={32}
            />
            <Tooltip content={<WeeklyTooltip />} cursor={{ fill: "var(--page)" }} />
            {ROW_ORDER.map((key, i) => (
              <Bar
                key={key}
                dataKey={key}
                stackId="week"
                fill={ROW_COLOR[key]}
                radius={i === ROW_ORDER.length - 1 ? [4, 4, 0, 0] : undefined}
                maxBarSize={40}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 pt-1 text-xs text-[var(--text-secondary)]">
        {ROW_ORDER.map((key) => (
          <span key={key} className="flex items-center gap-1.5">
            <span aria-hidden className="inline-block h-2 w-2 rounded-full" style={{ background: ROW_COLOR[key] }} />
            {ROW_LABEL[key]}
          </span>
        ))}
      </div>
    </ChartCard>
  );
}
