import { deriveStatus } from "@/lib/metrics/buckets";
import { summarizeByTeam } from "@/lib/metrics/summarize";
import { formatInt, formatPct } from "@/lib/format";
import type { Counsellor } from "@/schemas/parser";
import type { Status } from "@/schemas/parser";

const BAR_STYLES: Record<Status, string> = {
    Green: "bg-success",
    Yellow: "bg-warning",
    Red: "bg-destructive",
    Unknown: "bg-muted-foreground/50",
};

/** PLAN.md §5.4 — horizontal bar per team, alphabetical. */
export function TeamPerformancePanel({ counsellors }: { counsellors: readonly Counsellor[] }) {
    const teams = summarizeByTeam(counsellors);

    if (teams.length === 0) {
        return (
            <p data-component="TeamPerformancePanel" className="text-sm text-muted-foreground">
                No teams in the current filter.
            </p>
        );
    }

    return (
        <div data-component="TeamPerformancePanel" className="space-y-3">
            {teams.map(({ team, summary }) => {
                const status = deriveStatus(summary.pctAchieved);
                const widthPct =
                    summary.pctAchieved === null ? 0 : Math.min(100, Math.round(summary.pctAchieved * 100));
                return (
                    <div key={team}>
                        <div className="flex items-baseline justify-between text-sm">
                            <span className="font-medium text-foreground">{team}</span>
                            <span className="text-muted-foreground">
                                {formatPct(summary.pctAchieved)} · {formatInt(summary.achieved)} /{" "}
                                {formatInt(summary.target)}
                            </span>
                        </div>
                        <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-muted">
                            <div
                                className={`h-full rounded-full ${BAR_STYLES[status]}`}
                                style={{ width: `${String(widthPct)}%` }}
                            />
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
