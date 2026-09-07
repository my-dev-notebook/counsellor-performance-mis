/** Year is hardcoded to 2026 — no workbook contains one (PLAN.md §2.6.12, ANS.md Q7). */
const HARDCODED_YEAR = "2026";

const MONTHS: readonly { name: string; aliases: readonly string[] }[] = [
    { name: "January", aliases: ["jan", "january"] },
    { name: "February", aliases: ["feb", "february"] },
    { name: "March", aliases: ["mar", "march"] },
    { name: "April", aliases: ["apr", "april"] },
    { name: "May", aliases: ["may"] },
    { name: "June", aliases: ["jun", "june"] },
    { name: "July", aliases: ["jul", "july"] },
    { name: "August", aliases: ["aug", "august"] },
    { name: "September", aliases: ["sep", "sept", "september"] },
    { name: "October", aliases: ["oct", "october"] },
    { name: "November", aliases: ["nov", "november"] },
    { name: "December", aliases: ["dec", "december"] },
];

function findMonthInText(text: string): string | null {
    const tokens = text
        .toLowerCase()
        .replace(/[^a-z]+/g, " ")
        .split(/\s+/)
        .filter(Boolean);
    for (const token of tokens) {
        const hit = MONTHS.find((month) => month.aliases.includes(token));
        if (hit) return hit.name;
    }
    return null;
}

/** Filename first, else majority vote across sheet titles (PLAN.md §4 "Month detection"). */
export function detectMonth(fileName: string, sheetTitleTexts: readonly string[]): string {
    const fromFileName = findMonthInText(fileName);
    if (fromFileName) return `${fromFileName} ${HARDCODED_YEAR}`;

    const counts = new Map<string, number>();
    for (const title of sheetTitleTexts) {
        const found = findMonthInText(title);
        if (found) counts.set(found, (counts.get(found) ?? 0) + 1);
    }

    let best: string | null = null;
    let bestCount = 0;
    for (const [month, count] of counts) {
        if (count > bestCount) {
            best = month;
            bestCount = count;
        }
    }
    return best ? `${best} ${HARDCODED_YEAR}` : `Unknown ${HARDCODED_YEAR}`;
}
