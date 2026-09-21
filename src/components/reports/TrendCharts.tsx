"use client";

import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatInt, formatPct } from "@/lib/format";
import { AXIS_STROKE, AXIS_TICK, GRID_STROKE, LEGEND_STYLE, TOOLTIP_LABEL_STYLE, TOOLTIP_STYLE } from "./chart-theme";

/** The fields both a company/team `MonthlyPoint` and a `PersonHistoryPoint` carry. */
export interface TrendPoint {
    monthLabel: string;
    target: number | null;
    achieved: number | null;
    nonNegotiable: number | null;
    pctAchieved: number | null;
}

/** Target vs Achieved (with Non-Negotiable) beside Achievement %, month by month. */
export function TrendCharts({ points }: { points: readonly TrendPoint[] }) {
    if (points.length === 0) {
        return (
            <div data-component="TrendCharts" className="card">
                <p className="empty">No monthly data yet.</p>
            </div>
        );
    }

    return (
        <div data-component="TrendCharts" className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            <div className="card card-pad">
                <h3 className="card-title mb-3">Target vs Achieved</h3>
                <ResponsiveContainer width="100%" height={280}>
                    <LineChart data={[...points]}>
                        <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
                        <XAxis dataKey="monthLabel" tick={AXIS_TICK} stroke={AXIS_STROKE} tickLine={false} />
                        <YAxis
                            tick={AXIS_TICK}
                            stroke={AXIS_STROKE}
                            tickLine={false}
                            axisLine={false}
                            tickFormatter={(v: number) => formatInt(v)}
                        />
                        <Tooltip
                            formatter={(v) => formatInt(Number(v ?? 0))}
                            contentStyle={TOOLTIP_STYLE}
                            labelStyle={TOOLTIP_LABEL_STYLE}
                        />
                        <Legend wrapperStyle={LEGEND_STYLE} iconType="plainline" />
                        <Line
                            type="monotone"
                            dataKey="target"
                            name="Target"
                            stroke="var(--ink-3)"
                            strokeWidth={2}
                            strokeDasharray="6 4"
                            dot={false}
                            connectNulls
                        />
                        <Line
                            type="monotone"
                            dataKey="achieved"
                            name="Achieved"
                            stroke="var(--series-1)"
                            strokeWidth={2.5}
                            connectNulls
                        />
                        <Line
                            type="monotone"
                            dataKey="nonNegotiable"
                            name="Non-Negotiable"
                            stroke="var(--warn)"
                            strokeWidth={1.5}
                            strokeDasharray="3 3"
                            dot={false}
                            connectNulls
                        />
                    </LineChart>
                </ResponsiveContainer>
            </div>
            <div className="card card-pad">
                <h3 className="card-title mb-3">Achievement %</h3>
                <ResponsiveContainer width="100%" height={280}>
                    <LineChart data={[...points]}>
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
                        <Line
                            type="monotone"
                            dataKey="pctAchieved"
                            name="Achievement %"
                            stroke="var(--series-1)"
                            strokeWidth={2.5}
                            connectNulls
                        />
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
