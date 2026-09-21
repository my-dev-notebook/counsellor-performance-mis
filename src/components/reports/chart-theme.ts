/**
 * Recharts styling from the design-system tokens, so charts follow the
 * theme without any hard-coded colours. Series are coloured by position;
 * status colours (good/warn/bad) are never used for a series.
 */

export const SERIES_COLORS = [
    "var(--series-1)",
    "var(--series-2)",
    "var(--series-3)",
    "var(--series-4)",
    "var(--series-5)",
    "var(--series-6)",
    "var(--series-7)",
    "var(--series-8)",
] as const;

export function seriesColor(index: number): string {
    return SERIES_COLORS[index % SERIES_COLORS.length] ?? SERIES_COLORS[0];
}

export const GRID_STROKE = "var(--viz-grid)";
export const AXIS_STROKE = "var(--viz-axis)";
export const AXIS_TICK = { fontSize: 11, fill: "var(--ink-3)" } as const;
export const LEGEND_STYLE = { color: "var(--ink-2)", fontSize: 12 } as const;

export const TOOLTIP_STYLE = {
    backgroundColor: "var(--surface-raised)",
    borderColor: "var(--line-2)",
    color: "var(--ink-1)",
    borderRadius: 8,
    boxShadow: "var(--shadow-2)",
    fontSize: 12,
} as const;
export const TOOLTIP_LABEL_STYLE = { color: "var(--ink-2)", fontWeight: 600 } as const;
