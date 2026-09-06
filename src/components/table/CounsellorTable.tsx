"use client";

import { Fragment, useMemo, useState, type CSSProperties } from "react";
import { FiChevronDown, FiChevronUp } from "react-icons/fi";
import { formatInt, formatPct, formatText } from "@/lib/format";
import type { Counsellor, Status } from "@/lib/parser/schemas";
import { DrillDownPanel } from "@/components/drilldown/DrillDownPanel";

type SortKey = "name" | "team" | "agency" | "target" | "nonNegotiable" | "achieved" | "pctAchieved";
type SortDirection = "asc" | "desc";

const COLUMNS: { key: SortKey; label: string }[] = [
  { key: "name", label: "Counsellor" },
  { key: "team", label: "Team" },
  { key: "agency", label: "Agency" },
  { key: "target", label: "Target" },
  { key: "nonNegotiable", label: "Non-Neg" },
  { key: "achieved", label: "Achieved" },
  { key: "pctAchieved", label: "Ach %" },
];

/** Left-edge accent tint per status, faded out toward the row's background. Low-opacity overlay reads fine on both light and dark cards, so it stays a fixed value rather than a theme token. */
const ROW_TINT: Record<Status, string> = {
  Green: "rgba(16, 185, 129, 0.16)",
  Yellow: "rgba(245, 158, 11, 0.16)",
  Red: "rgba(239, 68, 68, 0.16)",
  Unknown: "rgba(161, 161, 170, 0.14)",
};

function rowAccentStyle(status: Status): CSSProperties {
  return { backgroundImage: `linear-gradient(to right, ${ROW_TINT[status]}, transparent 12rem)` };
}

function sortValue(c: Counsellor, key: SortKey): string | number | null {
  switch (key) {
    case "name":
      return c.name;
    case "team":
      return c.team;
    case "agency":
      return c.agency;
    case "target":
      return c.target;
    case "nonNegotiable":
      return c.nonNegotiable;
    case "achieved":
      return c.achieved;
    case "pctAchieved":
      return c.pctAchieved;
  }
}

function compare(a: Counsellor, b: Counsellor, key: SortKey, dir: SortDirection): number {
  const va = sortValue(a, key);
  const vb = sortValue(b, key);
  // nulls always sort last, regardless of direction
  if (va === null && vb === null) return 0;
  if (va === null) return 1;
  if (vb === null) return -1;
  const sign = dir === "asc" ? 1 : -1;
  if (typeof va === "number" && typeof vb === "number") return (va - vb) * sign;
  return String(va).localeCompare(String(vb)) * sign;
}

/** PLAN.md §5.6 — every counsellor, full sortable table, defaulting to Ach % descending. */
export function CounsellorTable({
  counsellors,
  selectedId,
  onSelect,
  onCloseDrilldown,
}: {
  counsellors: readonly Counsellor[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onCloseDrilldown: () => void;
}) {
  const [sort, setSort] = useState<{ key: SortKey; direction: SortDirection }>({
    key: "pctAchieved",
    direction: "desc",
  });

  const sorted = useMemo(
    () => [...counsellors].sort((a, b) => compare(a, b, sort.key, sort.direction)),
    [counsellors, sort],
  );

  const toggleSort = (key: SortKey) => {
    setSort((prev) =>
      prev.key === key
        ? { key, direction: prev.direction === "asc" ? "desc" : "asc" }
        : { key, direction: "desc" },
    );
  };

  if (counsellors.length === 0) {
    return (
      <p data-component="CounsellorTable" className="py-8 text-center text-sm text-muted-foreground">
        No counsellors match the current filters.
      </p>
    );
  }

  return (
    <div data-component="CounsellorTable" className="overflow-x-auto rounded-lg border border-border bg-card">
      <table className="min-w-full divide-y divide-border text-sm">
        <thead className="bg-muted/50">
          <tr>
            {COLUMNS.map((col) => (
              <th
                key={col.key}
                scope="col"
                className="cursor-pointer px-3 py-2 text-left text-xs font-semibold tracking-wide text-muted-foreground uppercase select-none"
                onClick={() => {
                  toggleSort(col.key);
                }}
              >
                <span className="inline-flex items-center gap-1">
                  {col.label}
                  {sort.key === col.key &&
                    (sort.direction === "asc" ? (
                      <FiChevronUp className="h-3 w-3" />
                    ) : (
                      <FiChevronDown className="h-3 w-3" />
                    ))}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {sorted.map((c) => (
            <Fragment key={c.id}>
              <tr
                onClick={() => {
                  onSelect(c.id);
                }}
                aria-expanded={selectedId === c.id}
                style={rowAccentStyle(c.status)}
                className={`cursor-pointer hover:bg-accent/50 ${selectedId === c.id ? "bg-accent/50" : ""}`}
              >
                <td className="px-3 py-2 font-medium text-foreground">{c.name}</td>
                <td className="px-3 py-2 text-muted-foreground">{c.team}</td>
                <td className="px-3 py-2 text-muted-foreground">{formatText(c.agency)}</td>
                <td className="px-3 py-2 text-muted-foreground">{formatInt(c.target)}</td>
                <td className="px-3 py-2 text-muted-foreground">{formatInt(c.nonNegotiable)}</td>
                <td className="px-3 py-2 text-muted-foreground">{formatInt(c.achieved)}</td>
                <td className="px-3 py-2 text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    {formatPct(c.pctAchieved)}
                    {c.belowNonNegotiable && c.status !== "Red" && (
                      <span className="inline-flex items-center rounded-full bg-destructive/15 px-1.5 py-0.5 text-[10px] font-semibold text-nowrap text-destructive ring-1 ring-destructive/30 ring-inset">
                        &lt; NN
                      </span>
                    )}
                  </div>
                </td>
              </tr>
              {selectedId === c.id && (
                <tr className="bg-accent/50">
                  <td colSpan={COLUMNS.length} className="p-0">
                    <DrillDownPanel counsellor={c} onClose={onCloseDrilldown} />
                  </td>
                </tr>
              )}
            </Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}
