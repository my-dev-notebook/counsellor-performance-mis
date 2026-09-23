"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { DailyPoint } from "@/db/queries/reports";
import { formatInt } from "@/lib/format";
import { AXIS_STROKE, AXIS_TICK, GRID_STROKE, TOOLTIP_LABEL_STYLE, TOOLTIP_STYLE } from "./chart-theme";

/** Successful applications per day of one month, as bars. Every day is on the axis; empty days sit at 0. */
export function DailyChart({ points, monthLabel }: { points: readonly DailyPoint[]; monthLabel: string }) {
    const total = points.reduce((sum, p) => sum + p.count, 0);

    return (
        <div data-component="DailyChart" className="card card-pad">
            <div className="mb-3 flex items-baseline justify-between gap-3">
                <h3 className="card-title">Daily successful applications — {monthLabel}</h3>
                <span className="card-meta t-num">{formatInt(total)} in month</span>
            </div>
            {total === 0 ? (
                <p className="empty">No daily entries for this month.</p>
            ) : (
                <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={[...points]}>
                        <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} vertical={false} />
                        <XAxis dataKey="day" tick={AXIS_TICK} stroke={AXIS_STROKE} tickLine={false} />
                        <YAxis
                            allowDecimals={false}
                            tick={AXIS_TICK}
                            stroke={AXIS_STROKE}
                            tickLine={false}
                            axisLine={false}
                            tickFormatter={(v: number) => formatInt(v)}
                        />
                        <Tooltip
                            cursor={{ fill: "var(--viz-track)" }}
                            formatter={(v) => [formatInt(Number(v ?? 0)), "Successful applications"]}
                            labelFormatter={(day) => `Day ${String(day)}`}
                            contentStyle={TOOLTIP_STYLE}
                            labelStyle={TOOLTIP_LABEL_STYLE}
                        />
                        <Bar dataKey="count" fill="var(--series-1)" radius={[3, 3, 0, 0]} />
                    </BarChart>
                </ResponsiveContainer>
            )}
        </div>
    );
}
