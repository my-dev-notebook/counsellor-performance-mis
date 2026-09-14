import { z } from "zod";
import { AchievedSource } from "@/schemas/achieved-source";
import { MonthDate } from "@/schemas/dates";

/**
 * The workbook-import boundary (Upload page → src/app/(app)/upload/actions.ts).
 *
 * Two round trips: `PlanImportInput` sends the parsed rows up and gets an
 * `ImportPlan` (src/lib/import/plan.ts) back; `CommitImportInput` sends the
 * operator's decisions, one per row, and the server writes them in one go.
 */

/** One counsellor row as parsed from the sheet, stripped to what the import needs. */
export const ImportRowInput = z.object({
    /** `"<sheet>:<excel row>"` — unique within the workbook, unlike the parser's name-based id. */
    rowId: z.string().min(1),
    name: z.string().trim().min(1),
    /** The sheet's team as the parser resolved it (a `teams` name, or an operator override). */
    team: z.string().trim().min(1),
    agency: z.string().trim().min(1).nullable(),
    email: z.string().trim().min(1).nullable(),
    target: z.number().min(0).nullable(),
    nonNegotiable: z.number().min(0).nullable(),
    /** null when the sheet cell was blank — never write that as 0. */
    achieved: z.number().min(0).nullable(),
    sheet: z.string(),
    row: z.number().int(),
});
export type ImportRowInput = z.infer<typeof ImportRowInput>;

export const PlanImportInput = z.object({
    date: MonthDate,
    rows: z.array(ImportRowInput).min(1),
});
export type PlanImportInput = z.infer<typeof PlanImportInput>;

/** Which agency a row lands under: an existing one, one to create by name, or none. */
export const AgencyChoice = z.union([
    z.object({ kind: z.literal("existing"), id: z.number().int().positive() }),
    z.object({ kind: z.literal("new"), name: z.string().trim().min(1) }),
    z.null(),
]);
export type AgencyChoice = z.infer<typeof AgencyChoice>;

/**
 * The monthly row as the plan showed it, echoed back so the commit can refuse
 * a decision made against a row somebody else changed in the meantime.
 * `null` means the plan saw no row for that user and month.
 */
export const ExpectedEntry = z
    .object({
        overall: z.number().int().nullable(),
        nonNegotiable: z.number().int().nullable(),
        achieved: z.number().int().nullable(),
        achievedSource: AchievedSource,
        teamId: z.number().int().positive(),
        agencyId: z.number().int().positive().nullable(),
    })
    .nullable();
export type ExpectedEntry = z.infer<typeof ExpectedEntry>;

const Figures = {
    overall: z.number().int().min(0).nullable(),
    nonNegotiable: z.number().int().min(0).nullable(),
    achieved: z.number().int().min(0).nullable(),
};

export const CommitRowInput = z.discriminatedUnion("action", [
    z.object({ action: z.literal("skip"), rowId: z.string().min(1) }),
    z.object({
        action: z.literal("upsert"),
        rowId: z.string().min(1),
        userId: z.number().int().positive(),
        teamId: z.number().int().positive(),
        agency: AgencyChoice,
        ...Figures,
        /** Write overall/non-negotiable (false = keep whatever the row has). Always true for a new row. */
        writeTargets: z.boolean(),
        /** Write `achieved` with source 'import'. False leaves the stored/live figure alone. */
        writeAchieved: z.boolean(),
        /** Rewrite an existing row's team/agency snapshot to the sheet's. Ignored for a new row. */
        rewriteSnapshot: z.boolean(),
        /** Also move the user's roster team/agency to the sheet's, through the logged path. */
        updateRoster: z.boolean(),
        expected: ExpectedEntry,
    }),
    z.object({
        action: z.literal("create"),
        rowId: z.string().min(1),
        name: z.string().trim().min(1),
        email: z.string().trim().toLowerCase().pipe(z.email()),
        teamId: z.number().int().positive(),
        agency: AgencyChoice,
        ...Figures,
    }),
]);
export type CommitRowInput = z.infer<typeof CommitRowInput>;

export const CommitImportInput = z.object({
    date: MonthDate,
    sourceFileName: z.string().trim().min(1),
    rows: z.array(CommitRowInput).min(1),
    /** Human-readable flags the operator saw and accepted; stored on the `imports` row. */
    notes: z.array(z.string()),
});
export type CommitImportInput = z.infer<typeof CommitImportInput>;
