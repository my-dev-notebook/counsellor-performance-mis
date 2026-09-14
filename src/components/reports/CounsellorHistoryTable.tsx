"use client";

import { formatInt, formatPct } from "@/lib/format";
import type { PersonHistoryPoint } from "@/db/queries/reports";
import { DataTable } from "@/components/DataTable";
import type { Column } from "@/components/DataTable";
import { StatusPill } from "@/components/StatusPill";

const COLUMNS: Column<PersonHistoryPoint>[] = [
    { key: "month", header: "Month", className: "text-muted-foreground", render: (p) => p.monthLabel },
    { key: "team", header: "Team", className: "text-muted-foreground", render: (p) => p.team },
    { key: "target", header: "Target", className: "text-muted-foreground", render: (p) => formatInt(p.target) },
    { key: "nonNeg", header: "Non-Neg", className: "text-muted-foreground", render: (p) => formatInt(p.nonNegotiable) },
    { key: "achieved", header: "Achieved", className: "text-muted-foreground", render: (p) => formatInt(p.achieved) },
    { key: "pct", header: "Ach %", className: "text-muted-foreground", render: (p) => formatPct(p.pctAchieved) },
    { key: "status", header: "Status", render: (p) => <StatusPill status={p.status} /> },
];

export function CounsellorHistoryTable({ points }: { points: PersonHistoryPoint[] }) {
    return (
        <div data-component="CounsellorHistoryTable">
            <DataTable columns={COLUMNS} rows={points} rowKey={(p) => p.date} emptyMessage="No history yet." />
        </div>
    );
}
