import { z } from "zod";

/**
 * zod is the single source of truth for the domain types (PLAN.md §8.1) —
 * types below are derived via `z.infer`, never hand-written separately.
 */

export const CanonicalTeam = z.enum(["Design", "Engineering", "Inbound", "Law", "Management", "Media/Liberal Arts"]);
export type CanonicalTeam = z.infer<typeof CanonicalTeam>;

export const CANONICAL_TEAMS = CanonicalTeam.options;

export const Status = z.enum(["Green", "Yellow", "Red", "Unknown"]);
export type Status = z.infer<typeof Status>;

export const WarningLevel = z.enum(["info", "warn", "error"]);
export type WarningLevel = z.infer<typeof WarningLevel>;

export const WarningScope = z.enum(["file", "sheet", "row", "cell"]);
export type WarningScope = z.infer<typeof WarningScope>;

export const Warning = z.object({
    level: WarningLevel,
    scope: WarningScope,
    sheet: z.string().optional(),
    row: z.number().optional(),
    column: z.string().optional(),
    code: z.string(),
    message: z.string(),
});
export type Warning = z.infer<typeof Warning>;

export const CounsellorSource = z.object({
    sheet: z.string(),
    row: z.number(),
});
export type CounsellorSource = z.infer<typeof CounsellorSource>;

export const Counsellor = z.object({
    id: z.string(),
    name: z.string().min(1),
    team: CanonicalTeam,
    agency: z.string().nullable(),
    doj: z.date().nullable(),
    email: z.string().nullable(),
    target: z.number().nullable(),
    nonNegotiable: z.number().nullable(),
    achieved: z.number().nullable(),
    acknowledgment: z.boolean().nullable(),
    feedback: z.string().nullable(),
    // derived — always recomputed, never read from the sheet (PLAN.md §2.6)
    pending: z.number().nullable(),
    pctAchieved: z.number().nullable(),
    status: Status,
    belowNonNegotiable: z.boolean().nullable(),
    source: CounsellorSource,
    issues: z.array(z.string()),
});
export type Counsellor = z.infer<typeof Counsellor>;

export const DeclaredTotal = z.object({
    target: z.number().optional(),
    achieved: z.number().optional(),
});
export type DeclaredTotal = z.infer<typeof DeclaredTotal>;

export const TeamAggregate = z.object({
    team: CanonicalTeam,
    headcount: z.number(),
    target: z.number(),
    nonNegotiable: z.number().nullable(),
    achieved: z.number(),
    targetGap: z.number(),
    pctAchieved: z.number().nullable(),
    pctAchievedExcludedCount: z.number(),
    belowNonNegotiableCount: z.number().nullable(),
    declaredTotal: DeclaredTotal.optional(),
    reconciles: z.boolean().nullable(),
});
export type TeamAggregate = z.infer<typeof TeamAggregate>;

export const ParsedWorkbook = z.object({
    sourceFileName: z.string(),
    monthLabel: z.string(),
    teams: z.array(TeamAggregate),
    counsellors: z.array(Counsellor),
    agencies: z.array(z.string()),
    warnings: z.array(Warning),
});
export type ParsedWorkbook = z.infer<typeof ParsedWorkbook>;
