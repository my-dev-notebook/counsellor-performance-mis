import { deriveStatus } from "@/lib/metrics/buckets";
import { summarizeByTeam } from "@/lib/metrics/summarize";
import { formatInt, formatPct } from "@/lib/format";
import type { Counsellor } from "@/schemas/parser";
import { STATUS_META } from "@/components/StatusPill";

/** PLAN.md §5.4 — horizontal meter per team, alphabetical, coloured by the team's band. */
export function TeamPerformancePanel({ counsellors }: { counsellors: readonly Counsellor[] }) {
    const teams = summarizeByTeam(counsellors);

    if (teams.length === 0) {
        return (
            <p data-component="TeamPerformancePanel" className="t-sm ink-3">
                No teams in the current filter.
            </p>
        );
    }

    return (
        <div data-component="TeamPerformancePanel" className="stack gap-3.5">
            {teams.map(({ team, summary }) => {
                const status = deriveStatus(summary.pctAchieved);
                const widthPct =
                    summary.pctAchieved === null ? 0 : Math.min(100, Math.round(summary.pctAchieved * 100));
                return (
                    <div key={team} className="meter-row">
                        <span className="name">{team}</span>
                        <span className="val">
                            {formatInt(summary.achieved)} / {formatInt(summary.target)} ·{" "}
                            <b className="text-ink-1">{formatPct(summary.pctAchieved)}</b>
                        </span>
                        <div className={`meter ${STATUS_META[status].meter}`}>
                            <span style={{ width: `${String(widthPct)}%` }} />
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
