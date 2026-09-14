"use client";

import type { Counsellor } from "@/schemas/parser";
import { counsellorOptions, teamOptions } from "@/lib/filters";
import type { Filters } from "@/lib/filters";
import { Select } from "@/components/Select";

const STATUS_OPTIONS = ["Green", "Yellow", "Red"] as const;

function FilterSelect({
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
        <div data-component="FilterSelect" className="flex flex-col gap-1">
            <span className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">{label}</span>
            {disabled ? (
                <span className="rounded-md border border-border bg-muted px-3 py-2 text-sm text-muted-foreground">
                    {disabledHint ?? "—"}
                </span>
            ) : (
                <Select
                    aria-label={label}
                    value={value}
                    onChange={onChange}
                    options={[{ value: "All", label: "All" }, ...options.map((option) => ({ value: option, label: option }))]}
                />
            )}
        </div>
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
                <FilterSelect
                    label="Team"
                    value={filters.team}
                    options={teamOptions(counsellors)}
                    onChange={(team) => {
                        onChange({ ...filters, team, counsellor: "All" });
                    }}
                />
                <FilterSelect
                    label="Agency"
                    value={filters.agency}
                    options={agencies}
                    disabled={agencies.length === 0}
                    disabledHint="Not in this file"
                    onChange={(agency) => {
                        onChange({ ...filters, agency, counsellor: "All" });
                    }}
                />
                <FilterSelect
                    label="Status"
                    value={filters.status}
                    options={STATUS_OPTIONS}
                    onChange={(status) => {
                        onChange({ ...filters, status: status as Filters["status"], counsellor: "All" });
                    }}
                />
                <FilterSelect
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
