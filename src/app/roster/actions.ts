"use server";

import { refresh } from "next/cache";
import {
    createCounsellor,
    updateCounsellorProfile,
    changeCounsellorAssignment,
    deactivateCounsellor,
} from "@/db/queries/counsellors";
import { AddCounsellorInput, ProfileInput } from "@/schemas/roster";

export async function addCounsellorAction(input: AddCounsellorInput) {
    const parsed = AddCounsellorInput.parse(input);
    await createCounsellor(parsed);
    refresh();
}

export async function updateProfileAction(id: number, input: ProfileInput) {
    const parsed = ProfileInput.parse(input);
    await updateCounsellorProfile(id, parsed);
    refresh();
}

export async function changeAssignmentAction(currentId: number, input: { teamId: number; agencyId: number | null }) {
    await changeCounsellorAssignment(currentId, input);
    refresh();
}

export async function deactivateCounsellorAction(id: number) {
    await deactivateCounsellor(id);
    refresh();
}
