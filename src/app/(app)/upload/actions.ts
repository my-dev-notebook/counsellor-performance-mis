"use server";

import { refresh } from "next/cache";
import { commitImport, loadImportContext } from "@/db/queries/imports";
import type { CommitOutcome } from "@/db/queries/imports";
import { buildImportPlan } from "@/lib/import/plan";
import type { ImportPlan } from "@/lib/import/plan";
import { assertPermission } from "@/lib/auth/session";
import { CommitImportInput, PlanImportInput } from "@/schemas/import";

/** Match the parsed rows against the roster and the month as it stands. Nothing is written. */
export async function planImportAction(input: PlanImportInput): Promise<ImportPlan> {
    const parsed = PlanImportInput.parse(input);
    await assertPermission("writeEntries");
    const context = await loadImportContext(parsed.date);
    return buildImportPlan(parsed.rows, context);
}

/**
 * Write the operator's decisions. Creating users or moving them between
 * teams is roster management, so those rows additionally need
 * `manageRoster`; creating agencies needs `manageAgencies`.
 */
export async function commitImportAction(input: CommitImportInput): Promise<CommitOutcome> {
    const parsed = CommitImportInput.parse(input);
    const actor = await assertPermission("writeEntries");
    const touchesRoster = parsed.rows.some(
        (row) => row.action === "create" || (row.action === "upsert" && row.updateRoster),
    );
    if (touchesRoster && !actor.permissions.manageRoster) {
        return { ok: false, kind: "invalid", message: "You may not create users or change roster assignments." };
    }
    const createsAgencies = parsed.rows.some(
        (row) => row.action !== "skip" && row.agency !== null && row.agency.kind === "new",
    );
    if (createsAgencies && !actor.permissions.manageAgencies) {
        return { ok: false, kind: "invalid", message: "You may not create agencies." };
    }
    const outcome = await commitImport(parsed, actor);
    if (outcome.ok) refresh();
    return outcome;
}
