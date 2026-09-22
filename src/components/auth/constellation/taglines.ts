/**
 * Copy for the sign-in scene (see tmp/taglines.md). Three sets, three motions: `TYPED` is the tail of
 * "Counsellor Performance is …", `REEL` is the scrambling headline, `TRACK` and `FACTS` feed the two tickers.
 */

export const TYPED = [
    "your admissions dashboard.",
    "targets vs. achieved, live.",
    "every counsellor, every team, one screen.",
    "monthly and daily entry without the spreadsheet.",
    "synced straight from Meritto.",
    "discrepancies caught before month-end.",
    "call audits with a quality score.",
    "trends across months and years.",
    "target gaps you can act on today.",
    "agencies, teams, and counsellors in one roster.",
    "the MIS your admissions team actually opens.",
    "one source of truth for admissions.",
] as const;

export const REEL = [
    "Targets in. Admissions out. Gaps visible.",
    "Know who's on target before the month ends.",
    "From daily entry to yearly trend.",
    "Achieved, pending, gap — per counsellor, per day.",
    "Audit the call. Score the quality. Close the loop.",
    "Sheets out. Dashboard in.",
    "Green, yellow, red — at a glance.",
] as const;

export const TRACK = [
    "targets",
    "admissions",
    "every counsellor",
    "team performance",
    "call quality",
    "discrepancies",
    "trends by month and year",
    "what Meritto reports",
] as const;

export const FACTS = [
    "Targets vs. achieved, per counsellor",
    "Monthly and daily entry",
    "Meritto sync on schedule",
    "Call audits with a quality score",
    "Discrepancies caught before month-end",
    "Trends by month and year",
    "Teams, agencies, counsellors — one roster",
] as const;

export type Band = "good" | "warn" | "bad";
export type Person = { name: string; team: string; pct: number; band: Band };

/** Decorative sample counsellors for the constellation — not real data. */
export const PEOPLE: readonly Person[] = [
    { name: "Priya Sharma", team: "Alpha", pct: 1.15, band: "good" },
    { name: "Rahul Verma", team: "Alpha", pct: 0.97, band: "good" },
    { name: "Aisha Khan", team: "Bravo", pct: 0.91, band: "good" },
    { name: "Vikram Singh", team: "Charlie", pct: 0.44, band: "bad" },
    { name: "Neha Gupta", team: "Charlie", pct: 0.78, band: "warn" },
    { name: "Karan Mehta", team: "Bravo", pct: 0.62, band: "warn" },
    { name: "Ishita Jain", team: "Bravo", pct: 0.88, band: "warn" },
    { name: "Dev Patel", team: "Alpha", pct: 1.02, band: "good" },
    { name: "Mohit Kumar", team: "Delta", pct: 0.55, band: "bad" },
    { name: "Riya Nair", team: "Delta", pct: 0.93, band: "good" },
    { name: "Tanvi Desai", team: "Bravo", pct: 0.71, band: "warn" },
    { name: "Ananya Rao", team: "Alpha", pct: 0.99, band: "good" },
    { name: "Sana Iqbal", team: "Delta", pct: 0.84, band: "warn" },
    { name: "Arjun Bose", team: "Charlie", pct: 0.96, band: "good" },
];
