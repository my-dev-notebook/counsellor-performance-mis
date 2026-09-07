import { formatInt, formatPct } from "@/lib/format";
import type { PersonHistoryPoint } from "@/db/queries/reports";
import { StatusPill } from "@/components/StatusPill";

const COLUMNS = ["Month", "Team", "Target", "Non-Neg", "Achieved", "Ach %", "Status"];

export function CounsellorHistoryTable({ points }: { points: PersonHistoryPoint[] }) {
    return (
        <div
            data-component="CounsellorHistoryTable"
            className="overflow-x-auto rounded-lg border border-border bg-card"
        >
            <table className="min-w-full divide-y divide-border text-sm">
                <thead className="bg-muted/50">
                    <tr>
                        {COLUMNS.map((h) => (
                            <th
                                key={h}
                                className="px-3 py-2 text-left text-xs font-semibold tracking-wide text-muted-foreground uppercase"
                            >
                                {h}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody className="divide-y divide-border">
                    {points.map((p) => (
                        <tr key={`${String(p.year)}-${String(p.month)}`}>
                            <td className="px-3 py-2 text-muted-foreground">{p.monthLabel}</td>
                            <td className="px-3 py-2 text-muted-foreground">{p.team}</td>
                            <td className="px-3 py-2 text-muted-foreground">{formatInt(p.target)}</td>
                            <td className="px-3 py-2 text-muted-foreground">{formatInt(p.nonNegotiable)}</td>
                            <td className="px-3 py-2 text-muted-foreground">{formatInt(p.achieved)}</td>
                            <td className="px-3 py-2 text-muted-foreground">{formatPct(p.pctAchieved)}</td>
                            <td className="px-3 py-2">
                                <StatusPill status={p.status} />
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
