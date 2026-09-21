"use client";

import { useMemo, useState } from "react";
import { FiCheck, FiSearch } from "react-icons/fi";
import type { MonthSummary, ProgressRow } from "@/db/types";
import { formatInt, formatText } from "@/lib/format";
import { DataTable } from "@/components/DataTable";
import type { Column } from "@/components/DataTable";
import { Kpi } from "@/components/kpi/Kpi";
import { EntryPanel } from "@/components/entry/EntryPanel";

type StatusFilter = "all" | "pending" | "filled";

const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
    { value: "all", label: "All" },
    { value: "pending", label: "Pending" },
    { value: "filled", label: "Filled" },
];

const COLUMNS: Column<ProgressRow>[] = [
    {
        key: "name",
        header: "Counsellor",
        className: "primary",
        render: (r) => r.counsellor.name,
    },
    { key: "team", header: "Team", className: "muted", render: (r) => formatText(r.teamName) },
    {
        key: "agency",
        header: "Agency",
        className: "muted",
        render: (r) => formatText(r.counsellor.agencyName),
    },
    {
        key: "target",
        header: "Target",
        className: "num",
        render: (r) => formatInt(r.entry?.overall ?? null),
    },
    {
        key: "nonNegotiable",
        header: "Non-neg",
        className: "num",
        render: (r) => formatInt(r.entry?.nonNegotiable ?? null),
    },
    {
        key: "achieved",
        header: "Achieved",
        className: "num",
        render: (r) => formatInt(r.entry?.achieved ?? null),
    },
    {
        key: "state",
        header: "State",
        render: (r) =>
            r.entry === null ? (
                <span className="unsaved">Pending</span>
            ) : (
                <span className="saved">
                    <FiCheck aria-hidden />
                    Filled
                </span>
            ),
    },
];

function SummaryBar({ summary }: { summary: MonthSummary }) {
    return (
        <div data-component="SummaryBar" className="grid g3">
            <Kpi label="Filled" value={`${String(summary.filledCount)} / ${String(summary.totalCount)}`} />
            <Kpi label="Target so far" value={formatInt(summary.targetSoFar)} />
            <Kpi label="Achieved so far" value={formatInt(summary.achievedSoFar)} />
        </div>
    );
}

export function EntryView({
    date,
    progress,
    summary,
}: {
    date: string;
    progress: ProgressRow[];
    summary: MonthSummary;
}) {
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
    const [showInactive, setShowInactive] = useState(false);

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        return progress.filter((row) => {
            if (!showInactive && !row.counsellor.isActive) return false;
            if (
                q !== "" &&
                !row.counsellor.name.toLowerCase().includes(q) &&
                !(row.teamName?.toLowerCase().includes(q) ?? false) &&
                !(row.counsellor.agencyName?.toLowerCase().includes(q) ?? false)
            ) {
                return false;
            }
            if (statusFilter === "filled" && row.entry === null) return false;
            if (statusFilter === "pending" && row.entry !== null) return false;
            return true;
        });
    }, [progress, search, statusFilter, showInactive]);

    return (
        <div data-component="EntryView" className="stack">
            <SummaryBar summary={summary} />

            <div className="card card-pad flex flex-wrap items-center gap-x-4 gap-y-3">
                <div className="input-wrap w-72 max-w-full">
                    <FiSearch className="lead" aria-hidden />
                    <input
                        type="search"
                        placeholder="Search by name, team, agency…"
                        aria-label="Search counsellors"
                        value={search}
                        onChange={(e) => {
                            setSearch(e.target.value);
                        }}
                        className="input"
                    />
                </div>
                <div className="segmented" role="tablist" aria-label="Show">
                    {STATUS_FILTERS.map((s) => (
                        <button
                            key={s.value}
                            type="button"
                            role="tab"
                            aria-selected={statusFilter === s.value}
                            onClick={() => {
                                setStatusFilter(s.value);
                            }}
                        >
                            {s.label}
                        </button>
                    ))}
                </div>
                <label className="checkbox">
                    <input
                        type="checkbox"
                        checked={showInactive}
                        onChange={(e) => {
                            setShowInactive(e.target.checked);
                        }}
                    />
                    Include inactive (back-filling)
                </label>
            </div>

            <DataTable
                columns={COLUMNS}
                rows={filtered}
                rowKey={(r) => r.counsellor.id}
                emptyMessage="No counsellors match the current filters."
                rowClassName={(r) => (r.counsellor.isActive ? "" : "opacity-60")}
                renderExpanded={(r) => <EntryPanel row={r} date={date} />}
                footer={<span>Click a row to edit its targets</span>}
            />
        </div>
    );
}
