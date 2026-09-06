import { FiX } from "react-icons/fi";
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

/** PLAN.md §5.7 — individual drill-down for the selected counsellor, expanded inline under their table row. */
export function DrillDownPanel({
  counsellor,
  onClose,
}: {
  counsellor: Counsellor;
  onClose: () => void;
}) {
  return (
    <section data-component="DrillDownPanel" className="p-4">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-base font-semibold text-foreground">{counsellor.name}</h3>
          <div className="mt-1 flex items-center gap-2">
            <StatusPill status={counsellor.status} />
            {counsellor.belowNonNegotiable === true && (
              <span className="inline-flex items-center rounded-full bg-destructive/15 px-1.5 py-0.5 text-[10px] font-semibold text-destructive ring-1 ring-destructive/30 ring-inset">
                Below non-negotiable
              </span>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close details"
          className="inline-flex items-center justify-center rounded-md border border-input p-1.5 text-foreground hover:bg-accent hover:text-accent-foreground"
        >
          <FiX className="h-3.5 w-3.5" />
        </button>
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-4">
        {FIELDS.map((field) => (
          <div key={field.label}>
            <dt className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              {field.label}
            </dt>
            <dd className="mt-0.5 text-sm text-foreground">{field.render(counsellor)}</dd>
          </div>
        ))}
      </dl>

      {counsellor.issues.length > 0 && (
        <div className="mt-4 border-t border-border pt-3">
          <dt className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            Parse issues
          </dt>
          <ul className="mt-1 list-inside list-disc text-xs text-muted-foreground">
            {counsellor.issues.map((issue, i) => (
              <li key={i}>{issue}</li>
            ))}
          </ul>
        </div>
      )}
      <p className="mt-3 text-xs text-muted-foreground">
        Source: {counsellor.source.sheet} row {counsellor.source.row}
      </p>
    </section>
  );
}
