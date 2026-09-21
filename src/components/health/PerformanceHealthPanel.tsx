import type { Counsellor, Status } from "@/schemas/parser";
import { STATUS_META } from "@/components/StatusPill";
import { Kpi } from "@/components/kpi/Kpi";

const BUCKETS: { status: Status; label: string }[] = [
    { status: "Green", label: "Green (≥ 90%)" },
    { status: "Yellow", label: "Yellow (60–89%)" },
    { status: "Red", label: "Red (< 60%)" },
    { status: "Unknown", label: "No target" },
];

/** PLAN.md §5.5 — counsellor counts per band. `Unknown` is always shown separately, never folded into `Red`. */
export function PerformanceHealthPanel({ counsellors }: { counsellors: readonly Counsellor[] }) {
    const counts: Record<Status, number> = { Green: 0, Yellow: 0, Red: 0, Unknown: 0 };
    for (const c of counsellors) counts[c.status]++;

    return (
        <div data-component="PerformanceHealthPanel" className="grid g4 gap-3">
            {BUCKETS.map((bucket) => (
                <Kpi
                    key={bucket.status}
                    small
                    className="gap-1"
                    label={
                        <span className="inline-flex items-center gap-1.5">
                            <span
                                aria-hidden
                                className="inline-block h-2 w-2 rounded-full"
                                style={{ background: STATUS_META[bucket.status].color }}
                            />
                            {bucket.label}
                        </span>
                    }
                    value={counts[bucket.status]}
                />
            ))}
        </div>
    );
}
