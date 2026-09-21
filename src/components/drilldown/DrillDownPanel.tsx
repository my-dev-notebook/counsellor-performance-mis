import { formatInt, formatPct, formatText } from "@/lib/format";
import type { Counsellor } from "@/schemas/parser";
import { StatusPill } from "@/components/StatusPill";

const FIELDS: { label: string; render: (c: Counsellor) => string }[] = [
    { label: "Team", render: (c) => c.team },
    { label: "Agency", render: (c) => formatText(c.agency) },
    { label: "Target", render: (c) => formatInt(c.target) },
    { label: "Non-negotiable", render: (c) => formatInt(c.nonNegotiable) },
    { label: "Achieved", render: (c) => formatInt(c.achieved) },
    { label: "Pending", render: (c) => formatInt(c.pending) },
    { label: "Achievement %", render: (c) => formatPct(c.pctAchieved) },
];

/** PLAN.md §5.7 — individual drill-down for the selected counsellor, expanded inline under their table row. */
export function DrillDownPanel({ counsellor, rank }: { counsellor: Counsellor; rank: number | null }) {
    return (
        <section data-component="DrillDownPanel">
            <div className="row">
                <h3 className="t-h3">{counsellor.name}</h3>
                <StatusPill status={counsellor.status} long />
                {counsellor.belowNonNegotiable === true && <span className="tag tag-bad">Below non-negotiable</span>}
            </div>

            <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-4">
                <div>
                    <dt className="t-caps">Rank</dt>
                    <dd className="t-sm t-num mt-0.5">{rank ?? "—"}</dd>
                </div>
                {FIELDS.map((field) => (
                    <div key={field.label}>
                        <dt className="t-caps">{field.label}</dt>
                        <dd className="t-sm t-num mt-0.5">{field.render(counsellor)}</dd>
                    </div>
                ))}
            </dl>

            {counsellor.issues.length > 0 && (
                <div className="mt-4 border-t border-line-1 pt-3">
                    <div className="t-caps">Parse issues</div>
                    <ul className="t-xs ink-3 mt-1 list-inside list-disc">
                        {counsellor.issues.map((issue, i) => (
                            <li key={i}>{issue}</li>
                        ))}
                    </ul>
                </div>
            )}
            <p className="t-xs ink-3 mt-3">
                Source: {counsellor.source.sheet} row {counsellor.source.row}
            </p>
        </section>
    );
}
