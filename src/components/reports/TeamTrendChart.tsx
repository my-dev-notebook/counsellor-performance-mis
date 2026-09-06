"use client";

import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { TeamSeries } from "@/db/queries/reports";
import { formatPct } from "@/lib/format";

const TEAM_COLORS: Record<string, string> = {
  Design: "#ec4899",
  Engineering: "#2563eb",
  Inbound: "#10b981",
  Law: "#f59e0b",
  Management: "#8b5cf6",
  "Media/Liberal Arts": "#ef4444",
};

export function TeamTrendChart({ series }: { series: TeamSeries[] }) {
  if (series.length === 0) {
    return (
      <p data-component="TeamTrendChart" className="py-8 text-center text-sm text-zinc-500">
        No monthly data yet.
      </p>
    );
  }

  const months = new Map<number, { year: number; month: number; label: string }>();
  for (const { points } of series) {
    for (const p of points) {
      const key = p.year * 12 + p.month;
      if (!months.has(key)) months.set(key, { year: p.year, month: p.month, label: p.monthLabel });
    }
  }
  const ordered = [...months.entries()].sort(([a], [b]) => a - b).map(([, v]) => v);

  const rows = ordered.map(({ year, month, label }) => {
    const row: Record<string, string | number | null> = { monthLabel: label };
    for (const { team, points } of series) {
      const point = points.find((p) => p.year === year && p.month === month);
      row[team] = point ? point.pctAchieved : null;
    }
    return row;
  });

  return (
    <div data-component="TeamTrendChart" className="rounded-lg border border-zinc-200 bg-white p-4">
      <h3 className="mb-3 text-sm font-semibold text-zinc-900">Achievement % by Team</h3>
      <ResponsiveContainer width="100%" height={380}>
        <LineChart data={rows}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
          <XAxis dataKey="monthLabel" tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 12 }} tickFormatter={(v: number) => formatPct(v)} />
          <Tooltip formatter={(v: number) => formatPct(v)} />
          <Legend />
          {series.map(({ team }) => (
            <Line
              key={team}
              type="monotone"
              dataKey={team}
              name={team}
              stroke={TEAM_COLORS[team] ?? "#71717a"}
              strokeWidth={2}
              connectNulls
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
