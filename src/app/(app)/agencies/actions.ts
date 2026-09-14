"use server";

import { refresh } from "next/cache";
import { createAgency, deleteAgency, getAgencyUsage, renameAgency } from "@/db/queries/agencies";
import { AgencyIdInput, AgencyNameInput } from "@/schemas/agencies";
import { assertPermission } from "@/lib/auth/session";

export async function createAgencyAction(name: string) {
    const parsed = AgencyNameInput.parse(name);
    await assertPermission("manageAgencies");
    await createAgency(parsed);
    refresh();
}

export async function renameAgencyAction(id: number, name: string) {
    const parsedId = AgencyIdInput.parse(id);
    const parsedName = AgencyNameInput.parse(name);
    await assertPermission("manageAgencies");
    if (!(await getAgencyUsage(parsedId))) throw new Error("Agency not found");
    await renameAgency(parsedId, parsedName);
    refresh();
}

/**
 * Only an unreferenced agency can go: users point at their current agency
 * and every monthly entry / daily admission carries a snapshot agency id, so
 * deleting one with history would orphan those rows.
 */
export async function deleteAgencyAction(id: number) {
    const parsedId = AgencyIdInput.parse(id);
    await assertPermission("manageAgencies");
    const usage = await getAgencyUsage(parsedId);
    if (!usage) throw new Error("Agency not found");
    if (usage.memberCount > 0) {
        throw new Error(`Reassign the ${String(usage.memberCount)} user(s) on this agency first.`);
    }
    if (usage.historyCount > 0) {
        throw new Error("This agency has recorded history and cannot be deleted. Rename it instead.");
    }
    await deleteAgency(parsedId);
    refresh();
}
