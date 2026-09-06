"use server";

import { z } from "zod";
import { refresh } from "next/cache";
import {
  createCounsellor,
  updateCounsellorProfile,
  changeCounsellorAssignment,
  deactivateCounsellor,
} from "@/db/queries/counsellors";

const ProfileInput = z.object({
  name: z.string().trim().min(1),
  email: z.string().trim().min(1).nullable(),
  doj: z.string().trim().min(1).nullable(),
});

const AddCounsellorInput = ProfileInput.extend({
  teamId: z.number().int(),
  agencyId: z.number().int().nullable(),
});

export async function addCounsellorAction(input: z.infer<typeof AddCounsellorInput>) {
  const parsed = AddCounsellorInput.parse(input);
  await createCounsellor(parsed);
  refresh();
}

export async function updateProfileAction(id: number, input: z.infer<typeof ProfileInput>) {
  const parsed = ProfileInput.parse(input);
  await updateCounsellorProfile(id, parsed);
  refresh();
}

export async function changeAssignmentAction(
  currentId: number,
  input: { teamId: number; agencyId: number | null },
) {
  await changeCounsellorAssignment(currentId, input);
  refresh();
}

export async function deactivateCounsellorAction(id: number) {
  await deactivateCounsellor(id);
  refresh();
}
