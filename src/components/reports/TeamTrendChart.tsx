"use client";

import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { TeamSeries } from "@/db/queries/reports";
import { formatPct } from "@/lib/format";
import {
    AXIS_STROKE,
    AXIS_TICK,
    GRID_STROKE,
    LEGEND_STYLE,
    seriesColor,
    TOOLTIP_LABEL_STYLE,
    TOOLTIP_STYLE,
} from "./chart-theme";

export function TeamTrendChart({ series }: { series: TeamSeries[] }) {
    if (series.length === 0) {
        return (
            <div data-component="TeamTrendChart" className="card">
                <p className="empty">No monthly data yet.</p>
            </div>
        );
    }

    const months = new Map<string, string>();
    for (const { points } of series) {
        for (const p of points) {
            if (!months.has(p.date)) months.set(p.date, p.monthLabel);
        }
    }
    // "YYYY-MM" strings sort/compare correctly as strings.
    const ordered = [...months.entries()].sort(([a], [b]) => a.localeCompare(b));

    const rows = ordered.map(([date, label]) => {
        const row: Record<string, string | number | null> = { monthLabel: label };
        for (const { team, points } of series) {
            const point = points.find((p) => p.date === date);
            row[team] = point ? point.pctAchieved : null;
        }
        return row;
    });

    return (
        <div data-component="TeamTrendChart" className="card card-pad">
            <h3 className="card-title mb-3">Achievement % by team</h3>
            <ResponsiveContainer width="100%" height={380}>
                <LineChart data={rows}>
                    <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
                    <XAxis dataKey="monthLabel" tick={AXIS_TICK} stroke={AXIS_STROKE} tickLine={false} />
                    <YAxis
                        tick={AXIS_TICK}
                        stroke={AXIS_STROKE}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(v: number) => formatPct(v)}
                    />
                    <Tooltip
                        formatter={(v) => formatPct(Number(v ?? 0))}
                        contentStyle={TOOLTIP_STYLE}
                        labelStyle={TOOLTIP_LABEL_STYLE}
                    />
                    <Legend wrapperStyle={LEGEND_STYLE} iconType="plainline" />
                    {series.map(({ team }, index) => (
                        <Line
                            key={team}
                            type="monotone"
                            dataKey={team}
                            name={team}
                            stroke={seriesColor(index)}
                            strokeWidth={2}
                            connectNulls
                        />
                    ))}
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
}
