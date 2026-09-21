"use client";

import { useMemo, useState, type ReactNode } from "react";
import { formatInt, formatPct, formatText } from "@/lib/format";
import type { Counsellor } from "@/schemas/parser";
import { DataTable } from "@/components/DataTable";
import type { Column } from "@/components/DataTable";
import { BandLegend, statusAccent, statusTextColor } from "@/components/StatusPill";
import { initials } from "@/components/shell/nav";
import { DrillDownPanel } from "@/components/drilldown/DrillDownPanel";

type SortKey = "rank" | "name" | "agency" | "target" | "nonNegotiable" | "achieved" | "gap" | "pctAchieved";
type SortDirection = "asc" | "desc";

const COLUMNS: { key: SortKey; label: string; numeric: boolean }[] = [
    { key: "rank", label: "#", numeric: false },
    { key: "name", label: "Counsellor", numeric: false },
    { key: "agency", label: "Agency", numeric: false },
    { key: "target", label: "Target", numeric: true },
    { key: "nonNegotiable", label: "Non-neg", numeric: true },
    { key: "achieved", label: "Achieved", numeric: true },
    { key: "gap", label: "Gap", numeric: true },
    { key: "pctAchieved", label: "Ach %", numeric: true },
];

/** Achieved minus target; null without a target. */
function gap(c: Counsellor): number | null {
    return c.target === null || c.achieved === null ? null : c.achieved - c.target;
}

function formatGap(value: number | null): string {
    if (value === null) return "—";
    const abs = formatInt(Math.abs(value));
    return value > 0 ? `+${abs}` : value < 0 ? `−${abs}` : abs;
}

/** Rank by achieved % descending; ties broken by name ascending (alphabetical), independent of the table's current sort. */
function computeRanks(counsellors: readonly Counsellor[]): Map<string, number> {
    const ordered = [...counsellors].sort((a, b) => {
        if (a.pctAchieved === null && b.pctAchieved === null) return a.name.localeCompare(b.name);
        if (a.pctAchieved === null) return 1;
        if (b.pctAchieved === null) return -1;
        if (a.pctAchieved !== b.pctAchieved) return b.pctAchieved - a.pctAchieved;
        return a.name.localeCompare(b.name);
    });
    return new Map(ordered.map((c, i) => [c.id, i + 1]));
}

function sortValue(c: Counsellor, key: SortKey, ranks: Map<string, number>): string | number | null {
    switch (key) {
        case "rank":
            return ranks.get(c.id) ?? null;
        case "name":
            return c.name;
        case "agency":
            return c.agency;
        case "target":
            return c.target;
        case "nonNegotiable":
            return c.nonNegotiable;
        case "achieved":
            return c.achieved;
        case "gap":
            return gap(c);
        case "pctAchieved":
            return c.pctAchieved;
    }
}

function compare(a: Counsellor, b: Counsellor, key: SortKey, dir: SortDirection, ranks: Map<string, number>): number {
    const va = sortValue(a, key, ranks);
    const vb = sortValue(b, key, ranks);
    // nulls always sort last, regardless of direction
    if (va === null && vb === null) return 0;
    if (va === null) return 1;
    if (vb === null) return -1;
    const sign = dir === "asc" ? 1 : -1;
    if (typeof va === "number" && typeof vb === "number") return (va - vb) * sign;
    return String(va).localeCompare(String(vb)) * sign;
}

function renderCell(c: Counsellor, key: SortKey, ranks: Map<string, number>): ReactNode {
    switch (key) {
        case "rank": {
            const rank = ranks.get(c.id);
            return <span className={`rank ${rank !== undefined && rank <= 3 ? "top" : ""}`}>{rank}</span>;
        }
        case "name":
            return (
                <div className="person">
                    <span className="avatar" aria-hidden>
                        {initials(c.name)}
                    </span>
                    <div className="min-w-0">
                        <div className="name">{c.name}</div>
                        <div className="sub">{c.team}</div>
                    </div>
                </div>
            );
        case "agency":
            return formatText(c.agency);
        case "target":
            return formatInt(c.target);
        case "nonNegotiable":
            return formatInt(c.nonNegotiable);
        case "achieved":
            return formatInt(c.achieved);
        case "gap": {
            const g = gap(c);
            return (
                <span style={g !== null && g >= 0 ? { color: "var(--good-soft-fg)" } : undefined}>{formatGap(g)}</span>
            );
        }
        case "pctAchieved":
            return (
                <span className="inline-flex items-center justify-end gap-1.5">
                    {c.belowNonNegotiable && c.status !== "Red" && <span className="tag tag-bad">&lt; NN</span>}
                    <b style={{ color: statusTextColor(c.status) }}>{formatPct(c.pctAchieved)}</b>
                </span>
            );
    }
}

/**
 * PLAN.md §5.6 — every counsellor, full sortable table, defaulting to Ach % descending. The band is carried by
 * the row's edge accent and the coloured Ach % (legend in the footer); clicking a row opens its drill-down.
 */
export function CounsellorTable({ counsellors }: { counsellors: readonly Counsellor[] }) {
    const [sort, setSort] = useState<{ key: SortKey; direction: SortDirection }>({
        key: "pctAchieved",
        direction: "desc",
    });

    const ranks = useMemo(() => computeRanks(counsellors), [counsellors]);

    const sorted = useMemo(
        () => [...counsellors].sort((a, b) => compare(a, b, sort.key, sort.direction, ranks)),
        [counsellors, sort, ranks],
    );

    const toggleSort = (key: SortKey) => {
        setSort((prev) =>
            prev.key === key
                ? { key, direction: prev.direction === "asc" ? "desc" : "asc" }
                : { key, direction: "desc" },
        );
    };

    const columns: Column<Counsellor>[] = COLUMNS.map((col) => ({
        key: col.key,
        header: col.label,
        onHeaderClick: () => {
            toggleSort(col.key);
        },
        sort: sort.key === col.key ? (sort.direction === "asc" ? "ascending" : "descending") : undefined,
        className: col.numeric ? "num" : col.key === "name" ? "primary" : col.key === "rank" ? "w-10" : "muted",
        render: (c) => renderCell(c, col.key, ranks),
    }));

    return (
        <div data-component="CounsellorTable">
            <DataTable
                columns={columns}
                rows={sorted}
                rowKey={(c) => c.id}
                emptyMessage="No counsellors match the current filters."
                rowAccent={(c) => statusAccent(c.status)}
                footer={<BandLegend />}
                renderExpanded={(c) => <DrillDownPanel counsellor={c} rank={ranks.get(c.id) ?? null} />}
            />
        </div>
    );
}
