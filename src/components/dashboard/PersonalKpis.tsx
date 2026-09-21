import type { Counsellor } from "@/schemas/parser";
import { summarize } from "@/lib/metrics/summarize";
import { formatInt, formatPct } from "@/lib/format";
import { Kpi } from "@/components/kpi/Kpi";
import { TargetGauge } from "@/components/kpi/TargetGauge";
import { StatusPill } from "@/components/StatusPill";

/** One counsellor's own month: gauge plus their Target / NN / Achieved / Pending / % / Status. */
export function PersonalKpis({ counsellor }: { counsellor: Counsellor }) {
    const summary = summarize([counsellor]);
    return (
        <div data-component="PersonalKpis" className="grid grid-cols-1 gap-4 lg:grid-cols-[280px_1fr]">
            <TargetGauge summary={summary} />
            <div className="grid g3">
                <Kpi label="Target" value={formatInt(counsellor.target)} />
                <Kpi label="Non-negotiable" value={formatInt(counsellor.nonNegotiable)} />
                <Kpi label="Achieved" value={formatInt(counsellor.achieved)} />
                <Kpi
                    label="Pending"
                    value={formatInt(counsellor.pending)}
                    foot={counsellor.target === null ? "No target set" : undefined}
                />
                <Kpi label="Achievement %" value={formatPct(counsellor.pctAchieved)} />
                <Kpi
                    label="Band"
                    value={<StatusPill status={counsellor.status} long />}
                    foot={counsellor.belowNonNegotiable === true ? "Below non-negotiable" : undefined}
                />
            </div>
        </div>
    );
}
