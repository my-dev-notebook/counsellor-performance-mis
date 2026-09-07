import type { Status } from "@/lib/parser/schemas";

const STYLES: Record<Status, string> = {
    Green: "bg-success/15 text-success ring-success/30",
    Yellow: "bg-warning/15 text-warning ring-warning/30",
    Red: "bg-destructive/15 text-destructive ring-destructive/30",
    Unknown: "bg-muted text-muted-foreground ring-border",
};

export function StatusPill({ status }: { status: Status }) {
    return (
        <span
            data-component="StatusPill"
            className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${STYLES[status]}`}
        >
            {status}
        </span>
    );
}
