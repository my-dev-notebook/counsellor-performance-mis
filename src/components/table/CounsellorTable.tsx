"use client";

import { useMemo, useState, type CSSProperties, type ReactNode } from "react";
import { FiChevronDown, FiChevronUp } from "react-icons/fi";
import { formatInt, formatPct, formatText } from "@/lib/format";
import type { Counsellor, Status } from "@/schemas/parser";
import { DataTable } from "@/components/DataTable";
import type { Column } from "@/components/DataTable";
import { DrillDownPanel } from "@/components/drilldown/DrillDownPanel";

type SortKey = "rank" | "name" | "team" | "agency" | "target" | "nonNegotiable" | "achieved" | "pctAchieved";
type SortDirection = "asc" | "desc";

const COLUMNS: { key: SortKey; label: string }[] = [
    { key: "rank", label: "Rank" },
    { key: "name", label: "Counsellor" },
    { key: "team", label: "Team" },
    { key: "agency", label: "Agency" },
    { key: "target", label: "Target" },
    { key: "nonNegotiable", label: "Non-Neg" },
    { key: "achieved", label: "Achieved" },
    { key: "pctAchieved", label: "Ach %" },
];

/** Left-edge accent tint per status, faded out toward the row's background. Low-opacity overlay reads fine on both light and dark cards, so it stays a fixed value rather than a theme token. */
const ROW_TINT: Record<Status, string> = {
    Green: "rgba(16, 185, 129, 0.16)",
    Yellow: "rgba(245, 158, 11, 0.16)",
    Red: "rgba(239, 68, 68, 0.16)",
    Unknown: "rgba(161, 161, 170, 0.14)",
};

function rowAccentStyle(status: Status): CSSProperties {
    return { backgroundImage: `linear-gradient(to right, ${ROW_TINT[status]}, transparent 12rem)` };
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
        case "team":
            return c.team;
        case "agency":
            return c.agency;
        case "target":
            return c.target;
        case "nonNegotiable":
            return c.nonNegotiable;
        case "achieved":
            return c.achieved;
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
        case "rank":
            return ranks.get(c.id);
        case "name":
            return c.name;
        case "team":
            return c.team;
        case "agency":
            return formatText(c.agency);
        case "target":
            return formatInt(c.target);
        case "nonNegotiable":
            return formatInt(c.nonNegotiable);
        case "achieved":
            return formatInt(c.achieved);
        case "pctAchieved":
            return (
                <div className="flex items-center gap-1.5">
                    {formatPct(c.pctAchieved)}
                    {c.belowNonNegotiable && c.status !== "Red" && (
                        <span className="inline-flex items-center rounded-full bg-destructive/15 px-1.5 py-0.5 text-[10px] font-semibold text-nowrap text-destructive ring-1 ring-destructive/30 ring-inset">
                            &lt; NN
                        </span>
                    )}
                </div>
            );
    }
}

/** PLAN.md §5.6 — every counsellor, full sortable table, defaulting to Ach % descending. Clicking a row opens its drill-down. */
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
        header: (
            <span className="inline-flex items-center gap-1">
                {col.label}
                {sort.key === col.key &&
                    (sort.direction === "asc" ? (
                        <FiChevronUp className="h-3 w-3" />
                    ) : (
                        <FiChevronDown className="h-3 w-3" />
                    ))}
            </span>
        ),
        onHeaderClick: () => {
            toggleSort(col.key);
        },
        className: col.key === "name" ? "font-medium text-foreground" : "text-muted-foreground",
        render: (c) => renderCell(c, col.key, ranks),
    }));

    return (
        <div data-component="CounsellorTable">
            <DataTable
                columns={columns}
                rows={sorted}
                rowKey={(c) => c.id}
                emptyMessage="No counsellors match the current filters."
                rowStyle={(c) => rowAccentStyle(c.status)}
                panelClassName="p-0"
                renderExpanded={(c) => <DrillDownPanel counsellor={c} rank={ranks.get(c.id) ?? null} />}
            />
        </div>
    );
}
