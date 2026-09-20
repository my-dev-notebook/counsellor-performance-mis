/**
 * Heatmap tint for a calendar day, by how busy it was relative to the month's
 * best day. Empty days read as greyed-out; shared by the dashboard calendar and
 * the daily entry grid so both months look the same.
 */
export function cellTone(count: number, max: number): string {
    if (count === 0) return "bg-muted/40 text-muted-foreground";
    const ratio = count / max;
    if (ratio >= 0.75) return "bg-success/30 text-foreground";
    if (ratio >= 0.4) return "bg-success/20 text-foreground";
    return "bg-success/10 text-foreground";
}
