import { deriveStatus } from "@/lib/metrics/buckets";
import { summarizeByTeam } from "@/lib/metrics/summarize";
import { formatInt, formatPct } from "@/lib/format";
import type { Counsellor } from "@/lib/parser/schemas";
import type { Status } from "@/lib/parser/schemas";

const BAR_STYLES: Record<Status, string> = {
  Green: "bg-emerald-500",
  Yellow: "bg-amber-500",
  Red: "bg-red-500",
  Unknown: "bg-zinc-300",
};

/** PLAN.md §5.4 — horizontal bar per team, alphabetical. */
export function TeamPerformancePanel({ counsellors }: { counsellors: readonly Counsellor[] }) {
  const teams = summarizeByTeam(counsellors);

  if (teams.length === 0) {
    return <p className="text-sm text-zinc-500">No teams in the current filter.</p>;
  }

  return (
    <div className="space-y-3">
      {teams.map(({ team, summary }) => {
        const status = deriveStatus(summary.pctAchieved);
        const widthPct =
          summary.pctAchieved === null ? 0 : Math.min(100, Math.round(summary.pctAchieved * 100));
        return (
          <div key={team}>
            <div className="flex items-baseline justify-between text-sm">
              <span className="font-medium text-zinc-900">{team}</span>
              <span className="text-zinc-500">
                {formatPct(summary.pctAchieved)} · {formatInt(summary.achieved)} /{" "}
                {formatInt(summary.target)}
              </span>
            </div>
            <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-zinc-100">
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
