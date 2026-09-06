"use client";

import { CANONICAL_TEAMS } from "@/lib/parser/schemas";
import type { Counsellor } from "@/lib/parser/schemas";
import { counsellorOptions } from "@/lib/filters";
import type { Filters } from "@/lib/filters";

const STATUS_OPTIONS = ["Green", "Yellow", "Red"] as const;

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
    <label data-component="Select" className="flex flex-col gap-1">
      <span className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
        {label}
      </span>
      {disabled ? (
        <span className="rounded-md border border-border bg-muted px-3 py-2 text-sm text-muted-foreground">
          {disabledHint ?? "—"}
        </span>
      ) : (
        <select
          value={value}
          onChange={(event) => {
            onChange(event.target.value);
          }}
          className="rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:border-ring focus:ring-1 focus:ring-ring focus:outline-none"
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
  onReset,
}: {
  counsellors: readonly Counsellor[];
  agencies: readonly string[];
  filters: Filters;
  onChange: (filters: Filters) => void;
  onReset: () => void;
}) {
  return (
    <div
      data-component="FilterBar"
      className="flex flex-col gap-4 rounded-lg border border-border bg-card p-4 sm:flex-row sm:items-end sm:justify-between"
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
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
          label="Status"
          value={filters.status}
          options={STATUS_OPTIONS}
          onChange={(status) => {
            onChange({ ...filters, status: status as Filters["status"], counsellor: "All" });
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
      <button
        type="button"
        onClick={onReset}
        className="rounded-md border border-input px-3 py-2 text-sm font-medium text-foreground hover:bg-accent hover:text-accent-foreground"
      >
        Reset filters
      </button>
    </div>
  );
}
