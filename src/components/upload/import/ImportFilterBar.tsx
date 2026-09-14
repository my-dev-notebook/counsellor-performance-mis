"use client";

import type { ReactNode } from "react";
import { FiSearch, FiX } from "react-icons/fi";
import { ATTENTION_STATUSES } from "@/lib/import/decisions";
import type { RowStatus, RowView } from "@/lib/import/decisions";
import { STATUS_ORDER, STATUS_STYLES } from "@/components/upload/import/status-styles";

export interface RowFilter {
    status: "all" | "attention" | RowStatus;
    query: string;
}

export const DEFAULT_ROW_FILTER: RowFilter = { status: "all", query: "" };

export function applyRowFilter(views: readonly RowView[], filter: RowFilter): RowView[] {
    const query = filter.query.trim().toLowerCase();
    return views.filter((view) => {
        if (filter.status === "attention" && !view.needsAttention) return false;
        if (filter.status !== "all" && filter.status !== "attention" && view.status !== filter.status) return false;
        if (query === "") return true;
        const { name, email, sheet } = view.row.input;
        return (
            name.toLowerCase().includes(query) ||
            (email?.toLowerCase().includes(query) ?? false) ||
            sheet.toLowerCase().includes(query)
        );
    });
}

const CHIP =
    "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset transition-colors";

function FilterChip({
    active,
    onClick,
    className,
    children,
}: {
    active: boolean;
    onClick: () => void;
    className: string;
    children: ReactNode;
}) {
    return (
        <button
            data-component="FilterChip"
            type="button"
            aria-pressed={active}
            onClick={onClick}
            className={`${CHIP} ${className} ${active ? "ring-2 ring-primary ring-offset-1 ring-offset-background" : "opacity-80 hover:opacity-100"}`}
        >
            {children}
        </button>
    );
}

/** Status chips (one per status that has rows) and a name/email/sheet search, above the rows table. */
export function ImportFilterBar({
    counts,
    total,
    shown,
    filter,
    onChange,
}: {
    counts: Record<RowStatus, number>;
    total: number;
    shown: number;
    filter: RowFilter;
    onChange: (next: RowFilter) => void;
}) {
    const attention = STATUS_ORDER.filter((status) => ATTENTION_STATUSES.has(status)).reduce(
        (sum, status) => sum + counts[status],
        0,
    );
    const setStatus = (status: RowFilter["status"]) => {
        onChange({ ...filter, status: filter.status === status && status !== "all" ? "all" : status });
    };

    return (
        <div
            data-component="ImportFilterBar"
            className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-card p-3"
        >
            <FilterChip
                active={filter.status === "all"}
                onClick={() => {
                    setStatus("all");
                }}
                className="bg-muted text-foreground ring-border"
            >
                All <span className="tabular-nums text-muted-foreground">{total}</span>
            </FilterChip>
            <FilterChip
                active={filter.status === "attention"}
                onClick={() => {
                    setStatus("attention");
                }}
                className="bg-warning/15 text-warning ring-warning/30"
            >
                Needs attention <span className="tabular-nums">{attention}</span>
            </FilterChip>
            <span className="mx-1 h-5 w-px bg-border" aria-hidden />
            {STATUS_ORDER.filter((status) => counts[status] > 0).map((status) => (
                <FilterChip
                    key={status}
                    active={filter.status === status}
                    onClick={() => {
                        setStatus(status);
                    }}
                    className={STATUS_STYLES[status].className}
                >
                    {STATUS_STYLES[status].label} <span className="tabular-nums">{counts[status]}</span>
                </FilterChip>
            ))}
            <label className="relative ml-auto flex items-center">
                <FiSearch className="pointer-events-none absolute left-2 h-4 w-4 text-muted-foreground" aria-hidden />
                <input
                    type="search"
                    value={filter.query}
                    onChange={(e) => {
                        onChange({ ...filter, query: e.target.value });
                    }}
                    placeholder="Search name, email or sheet"
                    aria-label="Search rows"
                    className="w-56 rounded-md border border-input bg-background py-1 pr-7 pl-8 text-sm text-foreground"
                />
                {filter.query !== "" && (
                    <button
                        type="button"
                        aria-label="Clear search"
                        onClick={() => {
                            onChange({ ...filter, query: "" });
                        }}
                        className="absolute right-1.5 rounded p-0.5 text-muted-foreground hover:text-foreground"
                    >
                        <FiX className="h-3.5 w-3.5" />
                    </button>
                )}
            </label>
            {shown !== total && (
                <span className="w-full text-xs text-muted-foreground">
                    Showing {shown} of {total} rows
                </span>
            )}
        </div>
    );
}
