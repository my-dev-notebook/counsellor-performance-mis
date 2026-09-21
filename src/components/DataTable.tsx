"use client";

import { Fragment, useState, type CSSProperties, type ReactNode } from "react";
import { FiChevronDown } from "react-icons/fi";

/** Per-row expansion state handed to cell and panel renderers. */
export interface RowState {
    expanded: boolean;
    /** Open this row's panel, or close it if it is already open. */
    toggle: () => void;
    close: () => void;
}

export type SortDirection = "ascending" | "descending";

export interface Column<Row> {
    /** Stable identifier, used as the React key for the header cell. */
    key: string;
    /** Header content. Leave empty (and set `srLabel`) for columns like the actions menu. */
    header: ReactNode;
    /** Screen-reader label for an otherwise empty header. */
    srLabel?: string;
    /** Extra classes applied to both the header and body cells (`num` right-aligns with tabular figures). */
    className?: string;
    /** Called when the header is clicked, e.g. to change the sort. Renders the header as sortable. */
    onHeaderClick?: () => void;
    /** Current sort direction for this column, when it is the active sort key. */
    sort?: SortDirection;
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
    /** Extra classes for the expanded panel cell. */
    panelClassName?: string;
    rowClassName?: (row: Row, state: RowState) => string;
    rowStyle?: (row: Row) => CSSProperties;
    /** Colour for the 3px accent on the row's leading edge (e.g. `var(--good)`), the design system's band marker. */
    rowAccent?: (row: Row) => string | undefined;
    /** Right-hand slot of the footer, typically a `.legend`. The left side always shows the row count. */
    footer?: ReactNode;
    /** Drop the card chrome (border, shadow) when the table sits inside another card. */
    flush?: boolean;
}

/**
 * The app's standard table: the design system's `.table-wrap > .scroll > .table`, uppercase header, hairline
 * rows, row-count footer, and the optional click-a-row-to-open-a-panel behaviour used by the entry and
 * management screens.
 */
export function DataTable<Row>({
    columns,
    rows,
    rowKey,
    emptyMessage = "Nothing to show.",
    onRowClick,
    renderExpanded,
    expandable,
    panelClassName = "",
    rowClassName,
    rowStyle,
    rowAccent,
    footer,
    flush = false,
}: DataTableProps<Row>) {
    // Only one row is expanded at a time.
    const [openKey, setOpenKey] = useState<string | number | null>(null);
    const wrapClass = flush ? "table-wrap border-0 shadow-none rounded-none" : "table-wrap";

    if (rows.length === 0) {
        return (
            <div data-component="DataTable" className={wrapClass}>
                <p className="table-empty">{emptyMessage}</p>
            </div>
        );
    }

    return (
        <div data-component="DataTable" className={wrapClass}>
            <div className="scroll">
                <table className="table">
                    <thead>
                        <tr>
                            {columns.map((col) => (
                                <th
                                    key={col.key}
                                    scope="col"
                                    onClick={col.onHeaderClick}
                                    aria-sort={col.sort}
                                    className={`${col.onHeaderClick ? "sortable" : ""} ${col.className ?? ""}`}
                                >
                                    {col.srLabel !== undefined && <span className="sr-only">{col.srLabel}</span>}
                                    {col.onHeaderClick ? (
                                        <span className="sort">
                                            {col.header}
                                            <FiChevronDown aria-hidden />
                                        </span>
                                    ) : (
                                        col.header
                                    )}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
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
                            const accent = rowAccent?.(row);
                            const style: CSSProperties = {
                                ...rowStyle?.(row),
                                ...(accent ? ({ "--row-accent": accent } as CSSProperties) : {}),
                            };
                            return (
                                <Fragment key={key}>
                                    <tr
                                        onClick={handleClick}
                                        aria-expanded={canExpand ? state.expanded : undefined}
                                        style={style}
                                        className={`${handleClick ? "row-click" : ""} ${accent ? "row-accent" : ""} ${
                                            rowClassName?.(row, state) ?? ""
                                        }`}
                                    >
                                        {columns.map((col) => (
                                            <td key={col.key} className={col.className}>
                                                {col.render(row, state)}
                                            </td>
                                        ))}
                                    </tr>
                                    {state.expanded && renderExpanded && (
                                        <tr className="expanded-panel">
                                            <td colSpan={columns.length} className={panelClassName}>
                                                {/* w-0 + min-w-full: the panel fills the row without contributing to
                                                    the auto-layout column widths, so opening it never resizes the
                                                    other rows. */}
                                                <div className="w-0 min-w-full">{renderExpanded(row, state)}</div>
                                            </td>
                                        </tr>
                                    )}
                                </Fragment>
                            );
                        })}
                    </tbody>
                </table>
            </div>
            <div className="table-foot">
                <span>
                    {rows.length} {rows.length === 1 ? "row" : "rows"}
                </span>
                {footer}
            </div>
        </div>
    );
}
