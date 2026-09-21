"use client";

import { FiX } from "react-icons/fi";
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
        <div data-component="FilterSelect" className="field">
            <span className="label">{label}</span>
            {disabled ? (
                <span className="input readonly inline-flex items-center text-ink-3">{disabledHint ?? "—"}</span>
            ) : (
                <Select
                    aria-label={label}
                    value={value}
                    onChange={onChange}
                    options={[
                        { value: "All", label: "All" },
                        ...options.map((option) => ({ value: option, label: option })),
                    ]}
                />
            )}
        </div>
    );
}

export type FilterField = keyof Filters;

export const ALL_FILTER_FIELDS: readonly FilterField[] = ["team", "agency", "status", "counsellor"];

const GRID_COLUMNS: Record<number, string> = {
    1: "sm:grid-cols-1",
    2: "sm:grid-cols-2",
    3: "sm:grid-cols-3",
    4: "sm:grid-cols-4",
};

/** `fields` picks which selects to show — a single-team reader has no use for a Team filter. */
export function FilterBar({
    counsellors,
    agencies,
    filters,
    onChange,
    onReset,
    fields = ALL_FILTER_FIELDS,
}: {
    counsellors: readonly Counsellor[];
    agencies: readonly string[];
    filters: Filters;
    onChange: (filters: Filters) => void;
    onReset: () => void;
    fields?: readonly FilterField[];
}) {
    const show = (field: FilterField) => fields.includes(field);
    return (
        <div data-component="FilterBar" className="card card-pad flex flex-wrap items-end gap-x-4 gap-y-3">
            <div className={`grid flex-1 grid-cols-1 gap-4 ${GRID_COLUMNS[fields.length] ?? "sm:grid-cols-4"}`}>
                {show("team") && (
                    <FilterSelect
                        label="Team"
                        value={filters.team}
                        options={teamOptions(counsellors)}
                        onChange={(team) => {
                            onChange({ ...filters, team, counsellor: "All" });
                        }}
                    />
                )}
                {show("agency") && (
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
                )}
                {show("status") && (
                    <FilterSelect
                        label="Band"
                        value={filters.status}
                        options={STATUS_OPTIONS}
                        onChange={(status) => {
                            onChange({ ...filters, status: status as Filters["status"], counsellor: "All" });
                        }}
                    />
                )}
                {show("counsellor") && (
                    <FilterSelect
                        label="Counsellor"
                        value={filters.counsellor}
                        options={counsellorOptions(counsellors, filters)}
                        onChange={(counsellor) => {
                            onChange({ ...filters, counsellor });
                        }}
                    />
                )}
            </div>
            <button type="button" onClick={onReset} className="btn btn-ghost">
                <FiX aria-hidden />
                Reset
            </button>
        </div>
    );
}
