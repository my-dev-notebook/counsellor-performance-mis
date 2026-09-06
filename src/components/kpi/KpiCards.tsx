import type { Summary } from "@/lib/metrics/summarize";
import { formatInt, formatPct } from "@/lib/format";

function KpiCard({
  label,
  value,
  caption,
}: {
  label: string;
  value: string;
  caption?: string | undefined;
}) {
  return (
    <div data-component="KpiCard" className="rounded-lg border border-border bg-card p-4">
      <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-foreground">{value}</p>
      {caption && <p className="mt-1 text-xs text-muted-foreground">{caption}</p>}
    </div>
  );
}

/** PLAN.md §5.3 — six KPI cards. `INCENTIVE ELIGIBLE` is deliberately not here (not in the data). */
export function KpiCards({ summary }: { summary: Summary }) {
  return (
    <div data-component="KpiCards" className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
      <KpiCard label="Counsellors" value={formatInt(summary.headcount)} />
      <KpiCard label="Target" value={formatInt(summary.target)} />
      <KpiCard label="Achieved" value={formatInt(summary.achieved)} />
      <KpiCard
        label="Achievement %"
        value={formatPct(summary.pctAchieved)}
        caption={
          summary.pctAchievedExcludedCount > 0
            ? `${String(summary.pctAchievedExcludedCount)} excluded (no target)`
            : undefined
        }
      />
      <KpiCard label="Target Gap" value={formatInt(summary.targetGap)} />
      <KpiCard
        label="Below Non-Negotiable"
        value={
          summary.belowNonNegotiableCount === null
            ? "—"
            : formatInt(summary.belowNonNegotiableCount)
        }
      />
    </div>
  );
}
