"use server";

import { refresh } from "next/cache";
import { createAgency } from "@/db/queries/agencies";
import { AgencyNameInput } from "@/schemas/agencies";
import { assertPermission } from "@/lib/auth/session";

export async function createAgencyAction(name: string) {
    const parsed = AgencyNameInput.parse(name);
    await assertPermission("manageAgencies");
    await createAgency(parsed);
    refresh();
}
