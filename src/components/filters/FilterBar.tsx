"use client";

import { CANONICAL_TEAMS } from "@/lib/parser/schemas";
import type { Counsellor } from "@/lib/parser/schemas";
import { counsellorOptions } from "@/lib/filters";
import type { Filters } from "@/lib/filters";

function Select({
  label,
  value,
  onChange,
  options,
  disabled,
  disabledHint,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: readonly string[];
  disabled?: boolean;
  disabledHint?: string;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs font-semibold tracking-wide text-zinc-500 uppercase">{label}</span>
      {disabled ? (
        <span className="rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-400">
          {disabledHint ?? "—"}
        </span>
      ) : (
        <select
          value={value}
          onChange={(event) => {
            onChange(event.target.value);
          }}
          className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 focus:outline-none"
        >
          <option value="All">All</option>
          {options.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      )}
    </label>
  );
}

export function FilterBar({
  counsellors,
  agencies,
  filters,
  onChange,
}: {
  counsellors: readonly Counsellor[];
  agencies: readonly string[];
  filters: Filters;
  onChange: (filters: Filters) => void;
}) {
  return (
    <div className="grid grid-cols-1 gap-4 rounded-lg border border-zinc-200 bg-white p-4 sm:grid-cols-3">
      <Select
        label="Team"
        value={filters.team}
        options={CANONICAL_TEAMS}
        onChange={(team) => {
          onChange({ ...filters, team: team as Filters["team"], counsellor: "All" });
        }}
      />
      <Select
        label="Agency"
        value={filters.agency}
        options={agencies}
        disabled={agencies.length === 0}
        disabledHint="Not in this file"
        onChange={(agency) => {
          onChange({ ...filters, agency, counsellor: "All" });
        }}
      />
      <Select
        label="Counsellor"
        value={filters.counsellor}
        options={counsellorOptions(counsellors, filters)}
        onChange={(counsellor) => {
          onChange({ ...filters, counsellor });
        }}
      />
    </div>
  );
}
