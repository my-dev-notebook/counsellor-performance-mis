"use server";

import { z } from "zod";
import { refresh } from "next/cache";
import { createAgency } from "@/db/queries/agencies";

const AgencyNameInput = z.string().trim().min(1);

export async function createAgencyAction(name: string) {
    const parsed = AgencyNameInput.parse(name);
    await createAgency(parsed);
    refresh();
}
