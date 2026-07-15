"use client";

import { Area, AreaChart, CartesianGrid, Line, LineChart, ReferenceDot, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ChartCard } from "./ChartCard";
import { buildApplicationsOverTime, buildPaceVsPlan, CHANNEL_GOALS } from "@/lib/aggregate";
import type { Deal } from "@/lib/types";

const TOTAL_GOAL = CHANNEL_GOALS.TOTAL;

function formatDate(iso: string) {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("es-ES", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}

function formatDay(totalDays: number) {
  return (day: number) => (day >= totalDays ? "Comité" : `S${Math.round(day / 7) + 1}`);
}

function PaceTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ dataKey: string; value: number; payload: { day: number } }>;
}) {
  if (!active || !payload?.length) return null;
  const { day } = payload[0].payload;
  const real = payload.find((p) => p.dataKey === "real")?.value;
  const plan = payload.find((p) => p.dataKey === "plan")?.value;
  return (
    <div className="card px-3 py-2 text-sm shadow-md">
      <p className="font-medium text-[var(--text-primary)]">Semana {Math.round(day / 7) + 1}</p>
      {real !== undefined && <p className="text-[var(--series-1)]">{real} reales</p>}
      {plan !== undefined && <p className="text-[var(--text-muted)]">{Math.round(plan)} plan</p>}
    </div>
  );
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

function PaceVsPlanChart({ deals, goal }: { deals: Deal[]; goal: number }) {
  const pace = buildPaceVsPlan(deals, goal);
  const { points, planPoints, totalDays, todayDay, todayReal, todayPlan, gap, actualPacePerWeek, requiredPacePerWeek } = pace;

  const merged = Array.from(new Set([...points.map((p) => p.day), ...planPoints.map((p) => p.day), todayDay]))
    .sort((a, b) => a - b)
    .map((day) => ({
      day,
      real: points.find((p) => p.day === day)?.cumulative ?? null,
      plan: (goal * day) / totalDays,
    }));

  const tickFormatter = formatDay(totalDays);
  const ticks = Array.from(new Set([0, 28, 56, totalDays])).filter((d) => d <= totalDays);

  return (
    <ChartCard title="Ritmo vs objetivo" subtitle={`¿Llegamos a la meta de ${goal} aplicaciones?`}>
      <div className="flex flex-wrap gap-4 text-xs text-[var(--text-secondary)]">
        <span className="flex items-center gap-1.5">
          <span aria-hidden className="inline-block h-2 w-2 rounded-full" style={{ background: "var(--series-1)" }} />
          Aplicaciones acumuladas (real)
        </span>
        <span className="flex items-center gap-1.5">
          <span aria-hidden className="inline-block h-2 w-2 rounded-full" style={{ background: "var(--text-muted)" }} />
          Línea de plan
        </span>
      </div>
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={merged} margin={{ top: 12, right: 24, bottom: 4, left: 0 }}>
            <CartesianGrid vertical={false} stroke="var(--gridline)" />
            <XAxis
              type="number"
              dataKey="day"
              domain={[0, totalDays]}
              ticks={ticks}
              tickFormatter={tickFormatter}
              tick={{ fill: "var(--text-secondary)", fontSize: 12 }}
              axisLine={{ stroke: "var(--gridline)" }}
              tickLine={false}
            />
            <YAxis
              allowDecimals={false}
              domain={[0, (dataMax: number) => Math.max(dataMax, goal)]}
              tick={{ fill: "var(--text-muted)", fontSize: 12 }}
              axisLine={false}
              tickLine={false}
              width={40}
            />
            <Tooltip content={<PaceTooltip />} cursor={{ stroke: "var(--baseline)" }} />
            <Line dataKey="plan" stroke="var(--text-muted)" strokeDasharray="4 4" strokeWidth={1.5} dot={false} isAnimationActive={false} />
            <Line dataKey="real" stroke="var(--series-1)" strokeWidth={2} dot={false} connectNulls isAnimationActive={false} />
            <ReferenceLine
              stroke="var(--status-critical)"
              strokeDasharray="2 2"
              strokeWidth={2}
              segment={[
                { x: todayDay, y: Math.min(todayReal, todayPlan) },
                { x: todayDay, y: Math.max(todayReal, todayPlan) },
              ]}
            />
            <ReferenceDot
              x={todayDay}
              y={todayReal}
              r={4}
              fill="var(--series-1)"
              stroke="var(--surface-1)"
              strokeWidth={2}
              label={{
                value: `hoy: ${todayReal}`,
                position: "bottom",
                fill: "var(--text-secondary)",
                fontSize: 12,
                fontWeight: 600,
              }}
            />
            <ReferenceDot
              x={todayDay}
              y={todayPlan}
              r={0}
              label={{
                value: `gap: ${gap >= 0 ? "+" : ""}${Math.round(gap)}`,
                position: "top",
                fill: "var(--status-critical)",
                fontSize: 12,
                fontWeight: 600,
              }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <p className="text-xs text-[var(--text-muted)]">Aplicaciones / semana (real)</p>
          <p className="text-lg font-semibold text-[var(--text-primary)]">{actualPacePerWeek.toFixed(1)}</p>
        </div>
        <div>
          <p className="text-xs text-[var(--text-muted)]">Objetivo / semana para llegar</p>
          <p
            className="text-lg font-semibold"
            style={{
              color:
                requiredPacePerWeek === null
                  ? "var(--text-primary)"
                  : requiredPacePerWeek > actualPacePerWeek
                    ? "var(--status-critical)"
                    : "var(--status-good)",
            }}
          >
            {requiredPacePerWeek !== null ? requiredPacePerWeek.toFixed(1) : "—"}
          </p>
        </div>
      </div>
    </ChartCard>
  );
}

export function ApplicationsOverTimeChart({
  deals,
  showGoal = false,
}: {
  deals: Deal[];
  showGoal?: boolean;
}) {
  const data = buildApplicationsOverTime(deals);

  if (data.length === 0) {
    return (
      <ChartCard title="Aplicaciones en el tiempo" subtitle="Total acumulado por día de creación">
        <p className="text-sm text-[var(--text-muted)]">
          Ninguno de los deals en este filtro tiene fecha de creación.
        </p>
      </ChartCard>
    );
  }

  if (showGoal) {
    return <PaceVsPlanChart deals={deals} goal={TOTAL_GOAL} />;
  }

  const last = data[data.length - 1];

  return (
    <ChartCard title="Aplicaciones en el tiempo" subtitle="Total acumulado por día de creación">
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
              domain={[0, (dataMax: number) => dataMax]}
              tick={{ fill: "var(--text-muted)", fontSize: 12 }}
              axisLine={false}
              tickLine={false}
              width={40}
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
            <ReferenceDot
              x={last.date}
              y={last.cumulative}
              r={4}
              fill="var(--series-1)"
              stroke="var(--surface-1)"
              strokeWidth={2}
              label={{ value: String(last.cumulative), position: "top", fill: "var(--text-secondary)", fontSize: 12 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  );
}
