"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { DailyPoint } from "@/db/queries/reports";
import { formatInt } from "@/lib/format";

const TOOLTIP_STYLE = {
    backgroundColor: "var(--popover)",
    borderColor: "var(--border)",
    color: "var(--popover-foreground)",
    borderRadius: 6,
    fontSize: 12,
};

/** Admissions per day of one month, as bars. Every day is on the axis; empty days sit at 0. */
export function DailyChart({ points, monthLabel }: { points: readonly DailyPoint[]; monthLabel: string }) {
    const total = points.reduce((sum, p) => sum + p.count, 0);

    return (
        <div data-component="DailyChart" className="rounded-lg border border-border bg-card p-4">
            <div className="mb-3 flex items-baseline justify-between">
                <h3 className="text-sm font-semibold text-foreground">Daily admissions — {monthLabel}</h3>
                <span className="text-xs text-muted-foreground">{formatInt(total)} in month</span>
            </div>
            {total === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">No daily entries for this month.</p>
            ) : (
                <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={[...points]}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                        <XAxis dataKey="day" tick={{ fontSize: 12, fill: "var(--muted-foreground)" }} />
                        <YAxis
                            allowDecimals={false}
                            tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
                            tickFormatter={(v: number) => formatInt(v)}
                        />
                        <Tooltip
                            cursor={{ fill: "var(--accent)", opacity: 0.4 }}
                            formatter={(v) => [formatInt(Number(v ?? 0)), "Admissions"]}
                            labelFormatter={(day) => `Day ${String(day)}`}
                            contentStyle={TOOLTIP_STYLE}
                        />
                        <Bar dataKey="count" fill="var(--info)" radius={[3, 3, 0, 0]} />
                    </BarChart>
                </ResponsiveContainer>
            )}
        </div>
    );
}
