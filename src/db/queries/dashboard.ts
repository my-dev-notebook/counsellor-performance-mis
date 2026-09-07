import { CanonicalTeam, CANONICAL_TEAMS } from "@/lib/parser/schemas";
import type { Counsellor, ParsedWorkbook, TeamAggregate } from "@/lib/parser/schemas";
import { aggregateTeam } from "@/lib/parser/aggregate";
import { deriveBelowNonNegotiable, derivePctAchieved, derivePending } from "@/lib/metrics/derive";
import { deriveStatus } from "@/lib/metrics/buckets";
import { formatMonthLabel } from "@/lib/format";
import { getProgressForMonth } from "./performance";
import type { PerformanceEntry, ProgressRow } from "@/db/types";

function hasEntry(row: ProgressRow): row is ProgressRow & { entry: PerformanceEntry } {
    return row.entry !== null;
}

/**
 * Builds a `ParsedWorkbook`-shaped snapshot of one (year, month) straight
 * from the database, so the same `Dashboard` component that renders an
 * ad-hoc Excel upload (`/upload`) can also render live data.
 *
 * Only counsellors with an actual `counsellor_performance` row for this
 * (year, month) are included — matching what an Excel sheet for that month
 * would have shown (someone with nothing recorded doesn't appear at all,
 * confirmed over showing them with blank/0 figures).
 *
 * A person who was reassigned mid-history (`person_id` shared across
 * multiple `users` rows) is represented, for a given month, by whichever of
 * their assignment-period rows has the entry — matching the entry page's own
 * "include inactive, for back-filling" workflow, which is how historical
 * entries end up attached to an old (now inactive) period in the first
 * place.
 */
export async function getMonthlyWorkbook(year: number, month: number): Promise<ParsedWorkbook> {
    const progress = await getProgressForMonth(year, month, { includeInactive: true });

    const byPerson = new Map<number, ProgressRow[]>();
    for (const row of progress) {
        const list = byPerson.get(row.counsellor.personId) ?? [];
        list.push(row);
        byPerson.set(row.counsellor.personId, list);
    }

    const counsellors: Counsellor[] = [];
    const agencySet = new Set<string>();

    for (const rows of byPerson.values()) {
        const rep = rows.find(hasEntry);
        if (!rep) continue;

        const team = CanonicalTeam.parse(rep.counsellor.teamName);
        const target = rep.entry.overall;
        const nonNegotiable = rep.entry.nonNegotiable;
        // A flagged entry is treated as unreliable/unknown, matching how the
        // entry page excludes flagged values from its own totals. Otherwise a
        // genuinely blank Achieved cell degrades to 0 (mirrors the Excel-import
        // rule in src/lib/parser/build-row.ts).
        const achieved = rep.entry.achievedFlagged ? null : (rep.entry.achieved ?? 0);
        const pending = derivePending(target, achieved);
        const pctAchieved = derivePctAchieved(target, achieved);

        if (rep.counsellor.agencyName) agencySet.add(rep.counsellor.agencyName);

        counsellors.push({
            id: String(rep.counsellor.id),
            name: rep.counsellor.name,
            team,
            agency: rep.counsellor.agencyName,
            doj: rep.counsellor.doj ? new Date(rep.counsellor.doj) : null,
            email: rep.counsellor.email,
            target,
            nonNegotiable,
            achieved,
            acknowledgment: rep.entry.acknowledgment,
            feedback: rep.entry.feedback,
            pending,
            pctAchieved,
            status: deriveStatus(pctAchieved),
            belowNonNegotiable: deriveBelowNonNegotiable(nonNegotiable, achieved),
            source: { sheet: rep.counsellor.teamName, row: rep.counsellor.id },
            issues: [],
        });
    }

    const teams: TeamAggregate[] = CANONICAL_TEAMS.map(
        (team) =>
            aggregateTeam(
                team,
                counsellors.filter((c) => c.team === team),
                undefined,
                team,
            ).aggregate,
    ).filter((t) => t.headcount > 0);

    return {
        sourceFileName: "database",
        monthLabel: formatMonthLabel(year, month),
        teams: teams.sort((a, b) => a.team.localeCompare(b.team)),
        counsellors,
        agencies: Array.from(agencySet).sort(),
        warnings: [],
    };
}
