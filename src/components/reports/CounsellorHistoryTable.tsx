import { formatInt, formatPct } from "@/lib/format";
import type { PersonHistoryPoint } from "@/db/queries/reports";
import { StatusPill } from "@/components/StatusPill";

const COLUMNS = ["Month", "Team", "Target", "Non-Neg", "Achieved", "Ach %", "Status"];

export function CounsellorHistoryTable({ points }: { points: PersonHistoryPoint[] }) {
  return (
    <div
      data-component="CounsellorHistoryTable"
      className="overflow-x-auto rounded-lg border border-zinc-200 bg-white"
    >
      <table className="min-w-full divide-y divide-zinc-200 text-sm">
        <thead className="bg-zinc-50">
          <tr>
            {COLUMNS.map((h) => (
              <th
                key={h}
                className="px-3 py-2 text-left text-xs font-semibold tracking-wide text-zinc-500 uppercase"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100">
          {points.map((p) => (
            <tr key={`${String(p.year)}-${String(p.month)}`}>
              <td className="px-3 py-2 text-zinc-600">{p.monthLabel}</td>
              <td className="px-3 py-2 text-zinc-600">{p.team}</td>
              <td className="px-3 py-2 text-zinc-600">{formatInt(p.target)}</td>
              <td className="px-3 py-2 text-zinc-600">{formatInt(p.nonNegotiable)}</td>
              <td className="px-3 py-2 text-zinc-600">{formatInt(p.achieved)}</td>
              <td className="px-3 py-2 text-zinc-600">{formatPct(p.pctAchieved)}</td>
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
