"use client";

import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { PersonHistoryPoint } from "@/db/queries/reports";
import { formatInt, formatPct } from "@/lib/format";

const TOOLTIP_STYLE = {
    backgroundColor: "var(--popover)",
    borderColor: "var(--border)",
    color: "var(--popover-foreground)",
    borderRadius: 6,
    fontSize: 12,
};

export function CounsellorHistoryChart({ points }: { points: PersonHistoryPoint[] }) {
    return (
        <div data-component="CounsellorHistoryChart" className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="rounded-lg border border-border bg-card p-4">
                <h3 className="mb-3 text-sm font-semibold text-foreground">Target vs Achieved</h3>
                <ResponsiveContainer width="100%" height={280}>
                    <LineChart data={points}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                        <XAxis dataKey="monthLabel" tick={{ fontSize: 12, fill: "var(--muted-foreground)" }} />
                        <YAxis
                            tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
                            tickFormatter={(v: number) => formatInt(v)}
                        />
                        <Tooltip formatter={(v: number) => formatInt(v)} contentStyle={TOOLTIP_STYLE} />
                        <Legend wrapperStyle={{ color: "var(--foreground)", fontSize: 12 }} />
                        <Line
                            type="monotone"
                            dataKey="target"
                            name="Target"
                            stroke="var(--muted-foreground)"
                            strokeWidth={2}
                            connectNulls
                        />
                        <Line
                            type="monotone"
                            dataKey="achieved"
                            name="Achieved"
                            stroke="var(--success)"
                            strokeWidth={2}
                            connectNulls
                        />
                    </LineChart>
                </ResponsiveContainer>
            </div>
            <div className="rounded-lg border border-border bg-card p-4">
                <h3 className="mb-3 text-sm font-semibold text-foreground">Achievement %</h3>
                <ResponsiveContainer width="100%" height={280}>
                    <LineChart data={points}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                        <XAxis dataKey="monthLabel" tick={{ fontSize: 12, fill: "var(--muted-foreground)" }} />
                        <YAxis
                            tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
                            tickFormatter={(v: number) => formatPct(v)}
                        />
                        <Tooltip formatter={(v: number) => formatPct(v)} contentStyle={TOOLTIP_STYLE} />
                        <Line
                            type="monotone"
                            dataKey="pctAchieved"
                            name="Achievement %"
                            stroke="var(--info)"
                            strokeWidth={2}
                            connectNulls
                        />
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
