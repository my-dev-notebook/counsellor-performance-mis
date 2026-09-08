export const MONTH_NAMES = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
];

/** `date` is a "YYYY-MM" string, e.g. "2026-09". */
export function formatMonthLabel(date: string): string {
    const [yearStr, monthStr] = date.split("-");
    const month = Number.parseInt(monthStr ?? "", 10);
    return `${MONTH_NAMES[month - 1] ?? "?"} ${yearStr ?? "?"}`;
}

export function formatInt(n: number | null): string {
    return n === null ? "—" : Math.round(n).toLocaleString("en-IN");
}

export function formatPct(n: number | null, digits = 1): string {
    return n === null ? "—" : `${(n * 100).toFixed(digits)}%`;
}

export function formatDate(d: Date | null): string {
    if (!d) return "—";
    return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

export function formatText(s: string | null): string {
    return s === null || s.trim() === "" ? "—" : s;
}
