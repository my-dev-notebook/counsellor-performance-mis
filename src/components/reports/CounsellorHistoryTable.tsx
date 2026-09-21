"use client";

import { formatInt, formatPct } from "@/lib/format";
import type { PersonHistoryPoint } from "@/db/queries/reports";
import { DataTable } from "@/components/DataTable";
import type { Column } from "@/components/DataTable";
import { BandLegend, statusAccent, statusTextColor } from "@/components/StatusPill";

const COLUMNS: Column<PersonHistoryPoint>[] = [
    { key: "month", header: "Month", className: "primary whitespace-nowrap", render: (p) => p.monthLabel },
    { key: "team", header: "Team", className: "muted", render: (p) => p.team },
    { key: "target", header: "Target", className: "num", render: (p) => formatInt(p.target) },
    { key: "nonNeg", header: "Non-neg", className: "num muted", render: (p) => formatInt(p.nonNegotiable) },
    { key: "achieved", header: "Achieved", className: "num", render: (p) => formatInt(p.achieved) },
    {
        key: "pct",
        header: "Ach %",
        className: "num",
        render: (p) => <b style={{ color: statusTextColor(p.status) }}>{formatPct(p.pctAchieved)}</b>,
    },
];

export function CounsellorHistoryTable({ points }: { points: PersonHistoryPoint[] }) {
    return (
        <div data-component="CounsellorHistoryTable">
            <DataTable
                columns={COLUMNS}
                rows={points}
                rowKey={(p) => p.date}
                emptyMessage="No history yet."
                rowAccent={(p) => statusAccent(p.status)}
                footer={<BandLegend />}
            />
        </div>
    );
}
