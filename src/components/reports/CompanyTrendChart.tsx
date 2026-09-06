"use client";

import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { MonthlyPoint } from "@/db/queries/reports";
import { formatInt, formatPct } from "@/lib/format";

export function CompanyTrendChart({ points }: { points: MonthlyPoint[] }) {
  if (points.length === 0) {
    return (
      <p data-component="CompanyTrendChart" className="py-8 text-center text-sm text-zinc-500">
        No monthly data yet.
      </p>
    );
  }

  return (
    <div data-component="CompanyTrendChart" className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <div className="rounded-lg border border-zinc-200 bg-white p-4">
        <h3 className="mb-3 text-sm font-semibold text-zinc-900">Target vs Achieved</h3>
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={points}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
            <XAxis dataKey="monthLabel" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} tickFormatter={(v: number) => formatInt(v)} />
            <Tooltip formatter={(v: number) => formatInt(v)} />
            <Legend />
            <Line type="monotone" dataKey="target" name="Target" stroke="#3f3f46" strokeWidth={2} connectNulls />
            <Line type="monotone" dataKey="achieved" name="Achieved" stroke="#10b981" strokeWidth={2} connectNulls />
            <Line
              type="monotone"
              dataKey="nonNegotiable"
              name="Non-Negotiable"
              stroke="#f59e0b"
              strokeWidth={2}
              strokeDasharray="4 4"
              connectNulls
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="rounded-lg border border-zinc-200 bg-white p-4">
        <h3 className="mb-3 text-sm font-semibold text-zinc-900">Achievement %</h3>
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={points}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
            <XAxis dataKey="monthLabel" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} tickFormatter={(v: number) => formatPct(v)} />
            <Tooltip formatter={(v: number) => formatPct(v)} />
            <Line type="monotone" dataKey="pctAchieved" name="Achievement %" stroke="#2563eb" strokeWidth={2} connectNulls />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
