"use client";

import { Fragment, useMemo, useState } from "react";
import { formatInt, formatPct, formatText } from "@/lib/format";
import type { Counsellor } from "@/lib/parser/schemas";
import { StatusPill } from "@/components/StatusPill";
import { DrillDownPanel } from "@/components/drilldown/DrillDownPanel";

type SortKey =
  "name" | "team" | "agency" | "target" | "nonNegotiable" | "achieved" | "pctAchieved" | "status";
type SortDirection = "asc" | "desc";

const COLUMNS: { key: SortKey; label: string }[] = [
  { key: "name", label: "Counsellor" },
  { key: "team", label: "Team" },
  { key: "agency", label: "Agency" },
  { key: "target", label: "Target" },
  { key: "nonNegotiable", label: "Non-Neg" },
  { key: "achieved", label: "Achieved" },
  { key: "pctAchieved", label: "Ach %" },
  { key: "status", label: "Status" },
];

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
    case "status":
      return c.status;
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
      <p data-component="CounsellorTable" className="py-8 text-center text-sm text-zinc-500">
        No counsellors match the current filters.
      </p>
    );
  }

  return (
    <div
      data-component="CounsellorTable"
      className="overflow-x-auto rounded-lg border border-zinc-200 bg-white"
    >
      <table className="min-w-full divide-y divide-zinc-200 text-sm">
        <thead className="bg-zinc-50">
          <tr>
            {COLUMNS.map((col) => (
              <th
                key={col.key}
                scope="col"
                className="cursor-pointer px-3 py-2 text-left text-xs font-semibold tracking-wide text-zinc-500 uppercase select-none"
                onClick={() => {
                  toggleSort(col.key);
                }}
              >
                {col.label}
                {sort.key === col.key && (
                  <span className="ml-1">{sort.direction === "asc" ? "↑" : "↓"}</span>
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100">
          {sorted.map((c) => (
            <Fragment key={c.id}>
              <tr
                onClick={() => {
                  onSelect(c.id);
                }}
                aria-expanded={selectedId === c.id}
                className={`cursor-pointer hover:bg-zinc-50 ${selectedId === c.id ? "bg-zinc-50" : ""}`}
              >
                <td className="px-3 py-2 font-medium text-zinc-900">{c.name}</td>
                <td className="px-3 py-2 text-zinc-600">{c.team}</td>
                <td className="px-3 py-2 text-zinc-600">{formatText(c.agency)}</td>
                <td className="px-3 py-2 text-zinc-600">{formatInt(c.target)}</td>
                <td className="px-3 py-2 text-zinc-600">{formatInt(c.nonNegotiable)}</td>
                <td className="px-3 py-2 text-zinc-600">{formatInt(c.achieved)}</td>
                <td className="px-3 py-2 text-zinc-600">{formatPct(c.pctAchieved)}</td>
                <td className="px-3 py-2">
                  <div className="flex items-center gap-1.5">
                    <StatusPill status={c.status} />
                    {c.belowNonNegotiable === true && c.status !== "Red" && (
                      <span className="inline-flex items-center rounded-full bg-red-50 px-1.5 py-0.5 text-[10px] font-semibold text-red-700 ring-1 ring-red-600/20 ring-inset">
                        &lt; NN
                      </span>
                    )}
                  </div>
                </td>
              </tr>
              {selectedId === c.id && (
                <tr className="bg-zinc-50">
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
