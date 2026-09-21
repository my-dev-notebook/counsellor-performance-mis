"use client";

import { deriveStatus } from "@/lib/metrics/buckets";
import { summarizeByTeam } from "@/lib/metrics/summarize";
import type { Summary } from "@/lib/metrics/summarize";
import { formatInt, formatPct } from "@/lib/format";
import type { Counsellor } from "@/schemas/parser";
import { STATUS_META } from "@/components/StatusPill";
import { CursorHint, useCursorHint } from "@/components/CursorHint";

type Segment = "done" | "left";

/** One team's bar. Hovering the filled part says what's done, the empty part what's left — same copy as the gauge. */
function TeamMeter({ team, summary }: { team: string; summary: Summary }) {
    const status = deriveStatus(summary.pctAchieved);
    const widthPct = summary.pctAchieved === null ? 0 : Math.min(100, Math.round(summary.pctAchieved * 100));
    const { hint, follow, leave } = useCursorHint<Segment>();

    const left = Math.max(0, summary.target - summary.achieved);
    const over = Math.max(0, summary.achieved - summary.target);
    const hintText: Record<Segment, string> = {
        done:
            over > 0
                ? `${formatInt(summary.achieved)} applications achieved · ${formatInt(over)} over target`
                : `${formatInt(summary.achieved)} applications achieved (${formatPct(summary.pctAchieved)})`,
        left: `${formatInt(left)} applications left to target`,
    };

    return (
        <div data-component="TeamMeter" className="meter-row">
            <span className="name">{team}</span>
            <span className="val">
                {formatInt(summary.achieved)} / {formatInt(summary.target)} ·{" "}
                <b className="text-ink-1">{formatPct(summary.pctAchieved)}</b>
            </span>
            {/* Moves over the fill bubble up to the track, so one handler tells the two apart by target. */}
            <div
                className={`meter ${STATUS_META[status].meter}`}
                data-hover={hint?.key}
                onMouseMove={
                    summary.pctAchieved === null
                        ? undefined
                        : (e) => {
                              follow(e.target === e.currentTarget ? "left" : "done")(e);
                          }
                }
                onMouseLeave={leave}
            >
                <span style={{ width: `${String(widthPct)}%` }} />
            </div>
            {hint && <CursorHint x={hint.x} y={hint.y} text={hintText[hint.key]} />}
        </div>
    );
}

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
            {teams.map(({ team, summary }) => (
                <TeamMeter key={team} team={team} summary={summary} />
            ))}
        </div>
    );
}
