"use server";

import { refresh } from "next/cache";
import { createAgency } from "@/db/queries/agencies";
import { AgencyNameInput } from "@/schemas/agencies";

export async function createAgencyAction(name: string) {
    const parsed = AgencyNameInput.parse(name);
    await createAgency(parsed);
    refresh();
}
