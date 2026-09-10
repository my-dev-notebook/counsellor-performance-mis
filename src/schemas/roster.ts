import { z } from "zod";

/**
 * The editable half of a counsellor: the fields that belong to the PERSON and
 * so carry forward unchanged across a reassignment. Team and agency are the
 * assignment, and live in `AddCounsellorInput` / the reassign path instead —
 * see the `users` table note in src/db/schema.ts on one row per assignment
 * period.
 */
export const ProfileInput = z.object({
    name: z.string().trim().min(1),
    email: z.string().trim().min(1).nullable(),
    // Meritto's user id — required, and an int on their side (7-8 digits
    // today). Not nullable: every counsellor has a Meritto account, and the
    // column is notNull.
    merittoUserId: z.number().int().positive(),
});
export type ProfileInput = z.infer<typeof ProfileInput>;

/** A new counsellor: profile plus the first assignment. */
export const AddCounsellorInput = ProfileInput.extend({
    teamId: z.number().int(),
    agencyId: z.number().int().nullable(),
});
export type AddCounsellorInput = z.infer<typeof AddCounsellorInput>;
