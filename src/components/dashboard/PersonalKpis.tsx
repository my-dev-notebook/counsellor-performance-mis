import type { ReactNode } from "react";
import type { Counsellor } from "@/schemas/parser";
import { summarize } from "@/lib/metrics/summarize";
import { formatInt, formatPct } from "@/lib/format";
import { TargetGauge } from "@/components/kpi/TargetGauge";
import { StatusPill } from "@/components/StatusPill";

function KpiCard({ label, value, caption }: { label: string; value: ReactNode; caption?: string | undefined }) {
    return (
        <div data-component="KpiCard" className="rounded-lg border border-border bg-card p-4">
            <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">{label}</p>
            <div className="mt-1 text-2xl font-semibold text-foreground">{value}</div>
            {caption && <p className="mt-1 text-xs text-muted-foreground">{caption}</p>}
        </div>
    );
}

/** One counsellor's own month: gauge plus their Target / NN / Achieved / Pending / % / Status. */
export function PersonalKpis({ counsellor }: { counsellor: Counsellor }) {
    const summary = summarize([counsellor]);
    return (
        <div data-component="PersonalKpis" className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,15rem)_1fr]">
            <TargetGauge summary={summary} />
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                <KpiCard label="Target" value={formatInt(counsellor.target)} />
                <KpiCard label="Non-Negotiable" value={formatInt(counsellor.nonNegotiable)} />
                <KpiCard label="Achieved" value={formatInt(counsellor.achieved)} />
                <KpiCard
                    label="Pending"
                    value={formatInt(counsellor.pending)}
                    caption={counsellor.target === null ? "No target set" : undefined}
                />
                <KpiCard label="Achievement %" value={formatPct(counsellor.pctAchieved)} />
                <KpiCard
                    label="Status"
                    value={<StatusPill status={counsellor.status} />}
                    caption={counsellor.belowNonNegotiable === true ? "Below non-negotiable" : undefined}
                />
            </div>
        </div>
    );
}
