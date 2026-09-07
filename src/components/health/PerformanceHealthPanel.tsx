import type { Counsellor, Status } from "@/lib/parser/schemas";

const BUCKETS: { status: Status; label: string; dot: string }[] = [
    { status: "Green", label: "Green (≥90%)", dot: "bg-success" },
    { status: "Yellow", label: "Yellow (60–89%)", dot: "bg-warning" },
    { status: "Red", label: "Red (<60%)", dot: "bg-destructive" },
    { status: "Unknown", label: "Unknown (no target)", dot: "bg-muted-foreground/50" },
];

/** PLAN.md §5.5 — counsellor counts per band. `Unknown` is always shown separately, never folded into `Red`. */
export function PerformanceHealthPanel({ counsellors }: { counsellors: readonly Counsellor[] }) {
    const counts: Record<Status, number> = { Green: 0, Yellow: 0, Red: 0, Unknown: 0 };
    for (const c of counsellors) counts[c.status]++;

    return (
        <div data-component="PerformanceHealthPanel" className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {BUCKETS.map((bucket) => (
                <div key={bucket.status} className="rounded-lg border border-border bg-card p-3">
                    <div className="flex items-center gap-2">
                        <span className={`h-2 w-2 rounded-full ${bucket.dot}`} />
                        <span className="text-xs text-muted-foreground">{bucket.label}</span>
                    </div>
                    <p className="mt-1 text-xl font-semibold text-foreground">{counts[bucket.status]}</p>
                </div>
            ))}
        </div>
    );
}
