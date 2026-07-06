"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ChartCard } from "./ChartCard";
import { buildWeeklyVolume } from "@/lib/aggregate";
import { CHANNEL_COLOR, CHANNEL_ORDER } from "@/lib/colors";
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
          {item.dataKey}: {item.value}
        </p>
      ))}
      <p className="font-medium text-[var(--text-primary)]">Total: {total}</p>
    </div>
  );
}

export function WeeklyVolumeChart({ deals }: { deals: Deal[] }) {
  const data = buildWeeklyVolume(deals);

  return (
    <ChartCard
      title="Volumen semanal por canal"
      subtitle="Deals creados por semana (no cambia con el filtro de semana)"
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
              tick={{ fill: "var(--text-muted)", fontSize: 12 }}
              axisLine={false}
              tickLine={false}
              width={32}
            />
            <Tooltip content={<WeeklyTooltip />} cursor={{ fill: "var(--page)" }} />
            {CHANNEL_ORDER.map((channel, i) => (
              <Bar
                key={channel}
                dataKey={channel}
                stackId="week"
                fill={CHANNEL_COLOR[channel]}
                radius={i === CHANNEL_ORDER.length - 1 ? [4, 4, 0, 0] : undefined}
                maxBarSize={40}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 pt-1 text-xs text-[var(--text-secondary)]">
        {CHANNEL_ORDER.map((channel) => (
          <span key={channel} className="flex items-center gap-1.5">
            <span aria-hidden className="inline-block h-2 w-2 rounded-full" style={{ background: CHANNEL_COLOR[channel] }} />
            {channel}
          </span>
        ))}
      </div>
    </ChartCard>
  );
}
