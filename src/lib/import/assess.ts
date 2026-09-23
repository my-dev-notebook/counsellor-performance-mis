import type { ImportRowInput } from "@/schemas/import";
import { normalizeText } from "@/lib/matching/similarity";
import type { ExistingEntry, ImportContext, RosterUser } from "@/lib/import/plan";

/**
 * What importing one sheet row onto one chosen user would change, and what
 * the operator should be told about it. Pure and cheap: the review screen
 * calls it again whenever a decision changes.
 */

export interface Flag {
    level: "info" | "warn";
    code:
        | "NAME_DIFFERS"
        | "EMAIL_DIFFERS"
        | "USER_INACTIVE"
        | "ROSTER_TEAM_DIFFERS"
        | "ROSTER_AGENCY_DIFFERS"
        | "SNAPSHOT_TEAM_DIFFERS"
        | "SNAPSHOT_AGENCY_DIFFERS"
        | "ACHIEVED_VS_LIVE"
        | "NO_MERITTO_ID";
    message: string;
}

export interface RowAssessment {
    user: RosterUser;
    existing: ExistingEntry | null;
    liveAchieved: number;
    /** Rounded sheet figures; `achieved` is null when the cell was blank. */
    sheet: { overall: number | null; nonNegotiable: number | null; achieved: number | null };
    /** The figure the month currently shows: stored `achieved`, else the live daily count. */
    dbAchieved: number | null;
    differs: { targets: boolean; achieved: boolean; snapshot: boolean };
    /** An existing row that the sheet would not change at all. */
    identical: boolean;
    flags: Flag[];
}

function roundOrNull(value: number | null): number | null {
    return value === null ? null : Math.round(value);
}

export function assessRow(
    input: ImportRowInput,
    user: RosterUser,
    sheetTeamId: number,
    sheetAgencyId: number | null,
    context: ImportContext,
): RowAssessment {
    const existing = context.entries[user.id] ?? null;
    const liveAchieved = context.liveAchieved[user.id] ?? 0;
    const sheet = {
        overall: roundOrNull(input.target),
        nonNegotiable: roundOrNull(input.nonNegotiable),
        achieved: roundOrNull(input.achieved),
    };
    const dbAchieved = existing ? (existing.achieved ?? liveAchieved) : null;

    const differs = {
        targets:
            existing !== null && (existing.overall !== sheet.overall || existing.nonNegotiable !== sheet.nonNegotiable),
        achieved: existing !== null && sheet.achieved !== null && dbAchieved !== sheet.achieved,
        snapshot: existing !== null && (existing.teamId !== sheetTeamId || existing.agencyId !== sheetAgencyId),
    };
    const identical = existing !== null && !differs.targets && !differs.achieved && !differs.snapshot;

    const flags: Flag[] = [];
    if (normalizeText(user.name) !== normalizeText(input.name)) {
        flags.push({
            level: "info",
            code: "NAME_DIFFERS",
            message: `Sheet says "${input.name}", roster says "${user.name}". The roster name is kept.`,
        });
    }
    if (input.email !== null && input.email.trim().toLowerCase() !== user.email) {
        flags.push({
            level: "info",
            code: "EMAIL_DIFFERS",
            message: `Sheet email ${input.email} differs from roster email ${user.email}. The roster email is kept.`,
        });
    }
    if (!user.isActive) {
        flags.push({ level: "warn", code: "USER_INACTIVE", message: "This user is inactive. The month is still recorded." });
    }
    if (user.teamId !== sheetTeamId) {
        flags.push({
            level: "info",
            code: "ROSTER_TEAM_DIFFERS",
            message: `Roster team is ${user.teamName ?? "none"}; the sheet files this row under another team.`,
        });
    }
    if (user.agencyId !== sheetAgencyId) {
        flags.push({
            level: "info",
            code: "ROSTER_AGENCY_DIFFERS",
            message: `Roster agency is ${user.agencyName ?? "none"}; the sheet says ${input.agency ?? "none"}.`,
        });
    }
    if (existing && existing.teamId !== sheetTeamId) {
        flags.push({
            level: "warn",
            code: "SNAPSHOT_TEAM_DIFFERS",
            message: "The month is already recorded under a different team. Taking the sheet rewrites that snapshot.",
        });
    } else if (existing && existing.agencyId !== sheetAgencyId) {
        flags.push({
            level: "info",
            code: "SNAPSHOT_AGENCY_DIFFERS",
            message: "The month is already recorded under a different agency. Taking the sheet rewrites that snapshot.",
        });
    }
    if (sheet.achieved !== null && liveAchieved > 0 && sheet.achieved !== liveAchieved) {
        flags.push({
            level: "warn",
            code: "ACHIEVED_VS_LIVE",
            message: `Daily successful applications add up to ${String(liveAchieved)}, the sheet says ${String(sheet.achieved)}. The sheet total will be shown for the month.`,
        });
    }
    if (user.merittoUserId === null) {
        flags.push({ level: "info", code: "NO_MERITTO_ID", message: "No Meritto id yet; daily auto-fetch is unavailable." });
    }

    return { user, existing, liveAchieved, sheet, dbAchieved, differs, identical, flags };
}
