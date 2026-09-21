import type { RowStatus } from "@/lib/import/decisions";

/** A status's tone in the design system: the chip/pill/dot variants all derive from it. */
export type StatusTone = "bad" | "warn" | "good" | "info" | "neutral";

/** Label and tone for each review status; shared by the rows table and the filter bar. */
export const STATUS_STYLES: Record<RowStatus, { label: string; tone: StatusTone }> = {
    "team-unmapped": { label: "Team unmapped", tone: "bad" },
    "agency-unmapped": { label: "Agency unmapped", tone: "bad" },
    unresolved: { label: "Choose user", tone: "bad" },
    invalid: { label: "Email needed", tone: "bad" },
    confirm: { label: "Confirm match", tone: "warn" },
    conflict: { label: "Conflict", tone: "warn" },
    insert: { label: "New entry", tone: "good" },
    create: { label: "New user", tone: "good" },
    update: { label: "Update", tone: "info" },
    "no-change": { label: "No change", tone: "neutral" },
    skip: { label: "Skipped", tone: "neutral" },
};

/** `.pill` variant class for a tone (the table's status column). */
export function pillClass(tone: StatusTone): string {
    return `pill pill-${tone}`;
}

/** `.chip` variant class for a tone (the filter bar); neutral chips use the plain accent highlight. */
export function chipClass(tone: StatusTone): string {
    return tone === "neutral" ? "chip" : `chip chip-${tone}`;
}

/** Display order for the filter chips: things to fix first, then what will be written, then the rest. */
export const STATUS_ORDER: readonly RowStatus[] = [
    "team-unmapped",
    "agency-unmapped",
    "unresolved",
    "invalid",
    "confirm",
    "conflict",
    "create",
    "insert",
    "update",
    "no-change",
    "skip",
];
