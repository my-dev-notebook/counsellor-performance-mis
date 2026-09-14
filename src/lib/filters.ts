import type { Counsellor, Status } from "@/schemas/parser";

export interface Filters {
    team: string;
    agency: string;
    counsellor: string;
    status: Status | "All";
}

export const DEFAULT_FILTERS: Filters = {
    team: "All",
    agency: "All",
    counsellor: "All",
    status: "All",
};

/** Filter bar drives every panel below it (PLAN.md §5.2). */
export function applyFilters(counsellors: readonly Counsellor[], filters: Filters): Counsellor[] {
    return counsellors.filter((c) => {
        if (filters.team !== "All" && c.team !== filters.team) return false;
        if (filters.agency !== "All" && c.agency !== filters.agency) return false;
        if (filters.counsellor !== "All" && c.name !== filters.counsellor) return false;
        if (filters.status !== "All" && c.status !== filters.status) return false;
        return true;
    });
}

/** Counsellor options respect the team/agency/status filters, never the counsellor filter itself. */
export function counsellorOptions(counsellors: readonly Counsellor[], filters: Filters): string[] {
    const scoped = applyFilters(counsellors, { ...filters, counsellor: "All" });
    return Array.from(new Set(scoped.map((c) => c.name))).sort();
}

/** Every team present in the data, alphabetically. */
export function teamOptions(counsellors: readonly Counsellor[]): string[] {
    return Array.from(new Set(counsellors.map((c) => c.team))).sort();
}

export function agencyOptions(counsellors: readonly Counsellor[]): string[] {
    const agencies = counsellors.map((c) => c.agency).filter((agency): agency is string => agency !== null);
    return Array.from(new Set(agencies)).sort();
}
