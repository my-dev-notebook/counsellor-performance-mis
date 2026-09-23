/**
 * Heat level for a calendar day (`.cal .day.h1` … `.h5`), by how busy it was
 * relative to the month's best day. Empty days get no heat class and read as
 * the sunken surface; shared by the dashboard calendar and the daily entry
 * grid so both months look the same.
 */
export function cellTone(count: number, max: number): string {
    if (count === 0 || max === 0) return "";
    const ratio = count / max;
    if (ratio >= 0.9) return "h5";
    if (ratio >= 0.7) return "h4";
    if (ratio >= 0.5) return "h3";
    if (ratio >= 0.25) return "h2";
    return "h1";
}
