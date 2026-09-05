import type { CanonicalTeam, Counsellor } from "@/lib/parser/schemas";

export interface Filters {
  team: CanonicalTeam | "All";
  agency: string;
  counsellor: string;
}

export const DEFAULT_FILTERS: Filters = { team: "All", agency: "All", counsellor: "All" };

/** Filter bar drives every panel below it (PLAN.md §5.2). */
export function applyFilters(counsellors: readonly Counsellor[], filters: Filters): Counsellor[] {
  return counsellors.filter((c) => {
    if (filters.team !== "All" && c.team !== filters.team) return false;
    if (filters.agency !== "All" && c.agency !== filters.agency) return false;
    if (filters.counsellor !== "All" && c.name !== filters.counsellor) return false;
    return true;
  });
}

/** Counsellor options respect the team/agency filters, never the counsellor filter itself. */
export function counsellorOptions(counsellors: readonly Counsellor[], filters: Filters): string[] {
  const scoped = applyFilters(counsellors, { ...filters, counsellor: "All" });
  return Array.from(new Set(scoped.map((c) => c.name))).sort();
}

export function agencyOptions(counsellors: readonly Counsellor[]): string[] {
  const agencies = counsellors
    .map((c) => c.agency)
    .filter((agency): agency is string => agency !== null);
  return Array.from(new Set(agencies)).sort();
}
