import { FiAlertTriangle, FiCheckCircle, FiCrosshair, FiPercent, FiTrendingDown, FiUsers } from "react-icons/fi";
import type { Summary } from "@/lib/metrics/summarize";
import { formatInt, formatPct } from "@/lib/format";
import { Kpi } from "@/components/kpi/Kpi";
import { TargetGauge } from "@/components/kpi/TargetGauge";

/**
 * PLAN.md §5.3 — the Target-vs-Achieved gauge beside six KPI tiles (3 × 2, so
 * the gauge card is as tall as two rows). `INCENTIVE ELIGIBLE` is deliberately
 * not here (not in the data).
 */
export function KpiCards({ summary }: { summary: Summary }) {
    return (
        <div data-component="KpiCards" className="grid grid-cols-1 gap-4 lg:grid-cols-[280px_1fr]">
            <TargetGauge summary={summary} />
            <div className="grid g3">
                <Kpi label="Counsellors" value={formatInt(summary.headcount)} icon={<FiUsers aria-hidden />} />
                <Kpi label="Target" value={formatInt(summary.target)} icon={<FiCrosshair aria-hidden />} />
                <Kpi label="Achieved" value={formatInt(summary.achieved)} icon={<FiCheckCircle aria-hidden />} />
                <Kpi
                    label="Achievement %"
                    value={formatPct(summary.pctAchieved)}
                    icon={<FiPercent aria-hidden />}
                    foot={
                        summary.pctAchievedExcludedCount > 0
                            ? `${String(summary.pctAchievedExcludedCount)} excluded (no target)`
                            : undefined
                    }
                />
                <Kpi label="Target gap" value={formatInt(summary.targetGap)} icon={<FiTrendingDown aria-hidden />} />
                <Kpi
                    label="Below non-negotiable"
                    value={summary.belowNonNegotiableCount === null ? "—" : formatInt(summary.belowNonNegotiableCount)}
                    icon={<FiAlertTriangle aria-hidden />}
                />
            </div>
        </div>
    );
}
