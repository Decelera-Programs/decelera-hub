"use client";

import { Area, AreaChart, CartesianGrid, ReferenceDot, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ChartCard } from "./ChartCard";
import { buildApplicationsOverTime } from "@/lib/aggregate";
import type { Deal } from "@/lib/types";

function formatDate(iso: string) {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("es-ES", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}

function OverTimeTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: { date: string; newCount: number; cumulative: number } }>;
}) {
  if (!active || !payload?.length) return null;
  const { date, newCount, cumulative } = payload[0].payload;
  return (
    <div className="card px-3 py-2 text-sm shadow-md">
      <p className="font-medium text-[var(--text-primary)]">{formatDate(date)}</p>
      <p className="text-[var(--text-secondary)]">{cumulative} acumuladas</p>
      <p className="text-[var(--text-muted)]">+{newCount} ese día</p>
    </div>
  );
}

export function ApplicationsOverTimeChart({ deals }: { deals: Deal[] }) {
  const data = buildApplicationsOverTime(deals);
  const last = data[data.length - 1];

  return (
    <ChartCard title="Aplicaciones en el tiempo" subtitle="Total acumulado por día de creación">
      {data.length === 0 ? (
        <p className="text-sm text-[var(--text-muted)]">
          Ninguno de los deals en este filtro tiene fecha de creación.
        </p>
      ) : (
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 12, right: 24, bottom: 4, left: 0 }}>
              <CartesianGrid vertical={false} stroke="var(--gridline)" />
              <XAxis
                dataKey="date"
                tickFormatter={formatDate}
                tick={{ fill: "var(--text-secondary)", fontSize: 12 }}
                axisLine={{ stroke: "var(--gridline)" }}
                tickLine={false}
                minTickGap={24}
              />
              <YAxis
                allowDecimals={false}
                tick={{ fill: "var(--text-muted)", fontSize: 12 }}
                axisLine={false}
                tickLine={false}
                width={32}
              />
              <Tooltip content={<OverTimeTooltip />} cursor={{ stroke: "var(--baseline)" }} />
              <Area
                type="monotone"
                dataKey="cumulative"
                stroke="var(--series-1)"
                strokeWidth={2}
                fill="var(--series-1)"
                fillOpacity={0.1}
                dot={false}
                activeDot={{ r: 4, stroke: "var(--surface-1)", strokeWidth: 2 }}
              />
              {last && (
                <ReferenceDot
                  x={last.date}
                  y={last.cumulative}
                  r={4}
                  fill="var(--series-1)"
                  stroke="var(--surface-1)"
                  strokeWidth={2}
                  label={{
                    value: String(last.cumulative),
                    position: "top",
                    fill: "var(--text-secondary)",
                    fontSize: 12,
                  }}
                />
              )}
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </ChartCard>
  );
}
