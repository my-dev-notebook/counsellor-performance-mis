"use client";

import { Fragment, useState, type CSSProperties, type ReactNode } from "react";

/** Per-row expansion state handed to cell and panel renderers. */
export interface RowState {
    expanded: boolean;
    /** Open this row's panel, or close it if it is already open. */
    toggle: () => void;
    close: () => void;
}

export interface Column<Row> {
    /** Stable identifier, used as the React key for the header cell. */
    key: string;
    /** Header content. Leave empty (and set `srLabel`) for columns like the actions menu. */
    header: ReactNode;
    /** Screen-reader label for an otherwise empty header. */
    srLabel?: string;
    /** Extra classes applied to both the header and body cells (e.g. `text-right`). */
    className?: string;
    /** Called when the header is clicked, e.g. to change the sort. */
    onHeaderClick?: () => void;
    render: (row: Row, state: RowState) => ReactNode;
}

interface DataTableProps<Row> {
    columns: Column<Row>[];
    rows: readonly Row[];
    rowKey: (row: Row) => string | number;
    /** Shown instead of the table when `rows` is empty. */
    emptyMessage?: string;
    /** Makes rows clickable without an expansion panel (e.g. to navigate). Ignored when `renderExpanded` is set. */
    onRowClick?: (row: Row) => void;
    /**
     * Content shown in a full-width row beneath a clicked row. Only one row is expanded at a time; the
     * panel is mounted fresh whenever it opens, so it can seed local state from the row.
     */
    renderExpanded?: (row: Row, state: RowState) => ReactNode;
    /** Which rows may be clicked open. Defaults to every row when `renderExpanded` is set. */
    expandable?: (row: Row) => boolean;
    /** Padding classes for the expanded panel cell. */
    panelClassName?: string;
    rowClassName?: (row: Row, state: RowState) => string;
    rowStyle?: (row: Row) => CSSProperties;
}

const HEADER_CELL = "px-3 py-2 text-left text-xs font-semibold tracking-wide text-muted-foreground uppercase";
const BODY_CELL = "px-3 py-2";

/**
 * The app's standard table: card-style border, uppercase header, divided rows, and the optional
 * click-a-row-to-open-a-panel behaviour used by the entry and management screens.
 */
export function DataTable<Row>({
    columns,
    rows,
    rowKey,
    emptyMessage = "Nothing to show.",
    onRowClick,
    renderExpanded,
    expandable,
    panelClassName = "px-4 py-5 sm:px-6",
    rowClassName,
    rowStyle,
}: DataTableProps<Row>) {
    // Only one row is expanded at a time.
    const [openKey, setOpenKey] = useState<string | number | null>(null);

    if (rows.length === 0) {
        return (
            <p data-component="DataTable" className="py-8 text-center text-sm text-muted-foreground">
                {emptyMessage}
            </p>
        );
    }

    return (
        <div data-component="DataTable" className="overflow-x-auto rounded-lg border border-border bg-card">
            <table className="min-w-full divide-y divide-border text-sm">
                <thead className="bg-muted/50">
                    <tr>
                        {columns.map((col) => (
                            <th
                                key={col.key}
                                scope="col"
                                onClick={col.onHeaderClick}
                                className={`${HEADER_CELL} ${col.onHeaderClick ? "cursor-pointer select-none" : ""} ${col.className ?? ""}`}
                            >
                                {col.srLabel !== undefined && <span className="sr-only">{col.srLabel}</span>}
                                {col.header}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody className="divide-y divide-border">
                    {rows.map((row) => {
                        const key = rowKey(row);
                        const canExpand = renderExpanded !== undefined && (expandable?.(row) ?? true);
                        const state: RowState = {
                            expanded: canExpand && openKey === key,
                            toggle: () => {
                                if (canExpand) setOpenKey(openKey === key ? null : key);
                            },
                            close: () => {
                                setOpenKey(null);
                            },
                        };
                        const handleClick = canExpand
                            ? state.toggle
                            : renderExpanded === undefined && onRowClick
                              ? () => {
                                    onRowClick(row);
                                }
                              : undefined;
                        return (
                            <Fragment key={key}>
                                <tr
                                    onClick={handleClick}
                                    aria-expanded={canExpand ? state.expanded : undefined}
                                    style={rowStyle?.(row)}
                                    className={`${handleClick ? "cursor-pointer hover:bg-accent/40" : ""} ${
                                        rowClassName?.(row, state) ?? ""
                                    }`}
                                >
                                    {columns.map((col) => (
                                        <td key={col.key} className={`${BODY_CELL} ${col.className ?? ""}`}>
                                            {col.render(row, state)}
                                        </td>
                                    ))}
                                </tr>
                                {state.expanded && renderExpanded && (
                                    <tr>
                                        <td colSpan={columns.length} className={panelClassName}>
                                            {/* w-0 + min-w-full: the panel fills the row without contributing to the
                                                auto-layout column widths, so opening it never resizes the other rows. */}
                                            <div className="w-0 min-w-full">{renderExpanded(row, state)}</div>
                                        </td>
                                    </tr>
                                )}
                            </Fragment>
                        );
                    })}
                </tbody>
            </table>
            <p className="border-t border-border bg-muted/30 px-3 py-1.5 text-xs text-muted-foreground">
                {rows.length} {rows.length === 1 ? "row" : "rows"}
            </p>
        </div>
    );
}
