"use client";

import type { ReactNode } from "react";
import { FiSearch, FiX } from "react-icons/fi";
import { ATTENTION_STATUSES } from "@/lib/import/decisions";
import type { RowStatus, RowView } from "@/lib/import/decisions";
import { chipClass, STATUS_ORDER, STATUS_STYLES } from "@/components/upload/import/status-styles";

export interface RowFilter {
    status: "all" | "attention" | RowStatus;
    query: string;
}

/** Bulk decisions over every row currently in a given status. */
export interface BulkActions {
    confirmLikely: () => void;
    resolveConflicts: (take: "sheet" | "keep", includeSnapshots: boolean) => void;
    /** Fill the conventional login email into every "create" row whose email is still empty. */
    fillDefaultEmails: () => void;
}

export const DEFAULT_ROW_FILTER: RowFilter = { status: "all", query: "" };

/**
 * `pinned` rows skip the status check: a row the operator just resolved stays on screen instead of
 * vanishing from under them the moment its status no longer matches the active filter.
 */
export function applyRowFilter(
    views: readonly RowView[],
    filter: RowFilter,
    pinned: ReadonlySet<string> = new Set(),
): RowView[] {
    const query = filter.query.trim().toLowerCase();
    return views.filter((view) => {
        if (!pinned.has(view.row.rowId)) {
            if (filter.status === "attention" && !view.needsAttention) return false;
            if (filter.status !== "all" && filter.status !== "attention" && view.status !== filter.status) return false;
        }
        if (query === "") return true;
        const { name, email, sheet } = view.row.input;
        return (
            name.toLowerCase().includes(query) ||
            (email?.toLowerCase().includes(query) ?? false) ||
            sheet.toLowerCase().includes(query)
        );
    });
}

const BULK_BUTTON = "btn btn-primary btn-sm";

/** One-click resolution for every row in the selected status, shown next to that status's chip. */
function BulkForStatus({
    status,
    count,
    bulk,
    locked,
}: {
    status: RowFilter["status"];
    count: number;
    bulk: BulkActions;
    locked: boolean;
}) {
    const disabled = locked || count === 0;
    const n = `(${String(count)})`;
    let buttons: ReactNode = null;
    if (status === "confirm") {
        buttons = (
            <button type="button" className={BULK_BUTTON} disabled={disabled} onClick={bulk.confirmLikely}>
                Confirm all {n}
            </button>
        );
    } else if (status === "conflict") {
        buttons = (
            <>
                <button
                    type="button"
                    className={BULK_BUTTON}
                    disabled={disabled}
                    onClick={() => {
                        bulk.resolveConflicts("keep", false);
                    }}
                >
                    Keep DB for all {n}
                </button>
                <button
                    type="button"
                    className={BULK_BUTTON}
                    disabled={disabled}
                    onClick={() => {
                        bulk.resolveConflicts("sheet", false);
                    }}
                >
                    Take sheet for all {n}
                </button>
            </>
        );
    } else if (status === "invalid") {
        buttons = (
            <button type="button" className={BULK_BUTTON} disabled={disabled} onClick={bulk.fillDefaultEmails}>
                Fill default email for all {n}
            </button>
        );
    }
    if (buttons === null) return null;
    return (
        <span data-component="BulkForStatus" className="flex items-center gap-1.5">
            <span className="bg-line-2 mx-1 h-5 w-px" aria-hidden />
            {buttons}
        </span>
    );
}

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
        <button data-component="FilterChip" type="button" aria-pressed={active} onClick={onClick} className={className}>
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
    bulk,
    locked,
}: {
    counts: Record<RowStatus, number>;
    total: number;
    shown: number;
    filter: RowFilter;
    onChange: (next: RowFilter) => void;
    bulk: BulkActions;
    locked: boolean;
}) {
    const attention = STATUS_ORDER.filter((status) => ATTENTION_STATUSES.has(status)).reduce(
        (sum, status) => sum + counts[status],
        0,
    );
    const setStatus = (status: RowFilter["status"]) => {
        onChange({ ...filter, status: filter.status === status && status !== "all" ? "all" : status });
    };

    return (
        <div data-component="ImportFilterBar" className="card card-pad flex flex-wrap items-center gap-2">
            <FilterChip
                active={filter.status === "all"}
                onClick={() => {
                    setStatus("all");
                }}
                className="chip"
            >
                All <span className="count">{total}</span>
            </FilterChip>
            <FilterChip
                active={filter.status === "attention"}
                onClick={() => {
                    setStatus("attention");
                }}
                className="chip chip-warn"
            >
                Needs attention <span className="count">{attention}</span>
            </FilterChip>
            <span className="bg-line-2 mx-1 h-5 w-px" aria-hidden />
            {STATUS_ORDER.filter((status) => counts[status] > 0).map((status) => (
                <FilterChip
                    key={status}
                    active={filter.status === status}
                    onClick={() => {
                        setStatus(status);
                    }}
                    className={chipClass(STATUS_STYLES[status].tone)}
                >
                    {STATUS_STYLES[status].label} <span className="count">{counts[status]}</span>
                </FilterChip>
            ))}
            {filter.status !== "all" && filter.status !== "attention" && (
                <BulkForStatus status={filter.status} count={counts[filter.status]} bulk={bulk} locked={locked} />
            )}
            <label className="input-wrap ml-auto w-60">
                <FiSearch className="lead" aria-hidden />
                <input
                    type="search"
                    value={filter.query}
                    onChange={(e) => {
                        onChange({ ...filter, query: e.target.value });
                    }}
                    placeholder="Search name, email or sheet"
                    aria-label="Search rows"
                    className="input input-sm has-trail"
                />
                {filter.query !== "" && (
                    <button
                        type="button"
                        aria-label="Clear search"
                        onClick={() => {
                            onChange({ ...filter, query: "" });
                        }}
                        className="btn btn-ghost btn-icon btn-sm absolute right-1"
                    >
                        <FiX aria-hidden />
                    </button>
                )}
            </label>
            {shown !== total && (
                <span className="t-xs ink-3 w-full">
                    Showing {shown} of {total} rows
                </span>
            )}
        </div>
    );
}
