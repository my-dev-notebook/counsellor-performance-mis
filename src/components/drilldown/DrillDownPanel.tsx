import { formatDate, formatInt, formatPct, formatText } from "@/lib/format";
import type { Counsellor } from "@/lib/parser/schemas";
import { StatusPill } from "@/components/StatusPill";

const FIELDS: { label: string; render: (c: Counsellor) => string }[] = [
  { label: "Team", render: (c) => c.team },
  { label: "Agency", render: (c) => formatText(c.agency) },
  { label: "DOJ", render: (c) => formatDate(c.doj) },
  { label: "Target", render: (c) => formatInt(c.target) },
  { label: "Non-Negotiable", render: (c) => formatInt(c.nonNegotiable) },
  { label: "Achieved", render: (c) => formatInt(c.achieved) },
  { label: "Pending", render: (c) => formatInt(c.pending) },
  { label: "Achievement %", render: (c) => formatPct(c.pctAchieved) },
];

/** PLAN.md §5.7 — individual drill-down for the selected counsellor. */
export function DrillDownPanel({
  counsellor,
  onReset,
}: {
  counsellor: Counsellor;
  onReset: () => void;
}) {
  return (
    <section className="rounded-lg border border-zinc-200 bg-white p-4">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-base font-semibold text-zinc-900">{counsellor.name}</h3>
          <div className="mt-1 flex items-center gap-2">
            <StatusPill status={counsellor.status} />
            {counsellor.belowNonNegotiable === true && (
              <span className="inline-flex items-center rounded-full bg-red-50 px-1.5 py-0.5 text-[10px] font-semibold text-red-700 ring-1 ring-red-600/20 ring-inset">
                Below non-negotiable
              </span>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={onReset}
          className="rounded-md border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
        >
          Reset filters
        </button>
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-4">
        {FIELDS.map((field) => (
          <div key={field.label}>
            <dt className="text-xs font-semibold tracking-wide text-zinc-500 uppercase">
              {field.label}
            </dt>
            <dd className="mt-0.5 text-sm text-zinc-900">{field.render(counsellor)}</dd>
          </div>
        ))}
      </dl>

      {counsellor.issues.length > 0 && (
        <div className="mt-4 border-t border-zinc-100 pt-3">
          <dt className="text-xs font-semibold tracking-wide text-zinc-500 uppercase">
            Parse issues
          </dt>
          <ul className="mt-1 list-inside list-disc text-xs text-zinc-500">
            {counsellor.issues.map((issue, i) => (
              <li key={i}>{issue}</li>
            ))}
          </ul>
        </div>
      )}
      <p className="mt-3 text-xs text-zinc-400">
        Source: {counsellor.source.sheet} row {counsellor.source.row}
      </p>
    </section>
  );
}
