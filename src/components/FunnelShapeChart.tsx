"use client";

import { Bar, BarChart, CartesianGrid, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ChartCard } from "./ChartCard";
import { buildFunnelShape } from "@/lib/aggregate";
import type { Deal } from "@/lib/types";

function ShapeTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: { stage: string; count: number } }>;
}) {
  if (!active || !payload?.length) return null;
  const { stage, count } = payload[0].payload;
  return (
    <div className="card px-3 py-2 text-sm shadow-md">
      <p className="font-medium text-[var(--text-primary)]">{stage}</p>
      <p className="text-[var(--text-secondary)]">{count} startups</p>
    </div>
  );
}

export function FunnelShapeChart({ deals }: { deals: Deal[] }) {
  const data = buildFunnelShape(deals);

  return (
    <ChartCard title="Forma del funnel" subtitle="Startups que llegaron a cada etapa o más allá">
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 4, right: 36, bottom: 4, left: 8 }}
            barCategoryGap={12}
          >
            <CartesianGrid horizontal={false} stroke="var(--gridline)" />
            <XAxis
              type="number"
              allowDecimals={false}
              tick={{ fill: "var(--text-muted)", fontSize: 12 }}
              axisLine={{ stroke: "var(--gridline)" }}
              tickLine={false}
            />
            <YAxis
              type="category"
              dataKey="stage"
              width={100}
              tick={{ fill: "var(--text-secondary)", fontSize: 13 }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip content={<ShapeTooltip />} cursor={{ fill: "var(--page)" }} />
            <Bar dataKey="count" fill="var(--series-1)" radius={[0, 4, 4, 0]} maxBarSize={24}>
              <LabelList dataKey="count" position="right" style={{ fill: "var(--text-secondary)", fontSize: 12 }} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  );
}
