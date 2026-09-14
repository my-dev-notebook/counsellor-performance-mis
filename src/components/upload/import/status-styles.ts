import type { RowStatus } from "@/lib/import/decisions";

/** Label and chip colours for each review status; shared by the rows table and the filter bar. */
export const STATUS_STYLES: Record<RowStatus, { label: string; className: string }> = {
    "team-unmapped": { label: "Team unmapped", className: "bg-destructive/15 text-destructive ring-destructive/30" },
    "agency-unmapped": {
        label: "Agency unmapped",
        className: "bg-destructive/15 text-destructive ring-destructive/30",
    },
    unresolved: { label: "Choose user", className: "bg-destructive/15 text-destructive ring-destructive/30" },
    invalid: { label: "Email needed", className: "bg-destructive/15 text-destructive ring-destructive/30" },
    confirm: { label: "Confirm match", className: "bg-warning/15 text-warning ring-warning/30" },
    conflict: { label: "Conflict", className: "bg-warning/15 text-warning ring-warning/30" },
    insert: { label: "New entry", className: "bg-success/15 text-success ring-success/30" },
    create: { label: "New user", className: "bg-success/15 text-success ring-success/30" },
    update: { label: "Update", className: "bg-info/15 text-info ring-info/30" },
    "no-change": { label: "No change", className: "bg-muted text-muted-foreground ring-border" },
    skip: { label: "Skipped", className: "bg-muted text-muted-foreground ring-border" },
};

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
