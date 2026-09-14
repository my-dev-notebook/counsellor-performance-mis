import { z } from "zod";

/**
 * The editable half of a user: name, login email, Meritto id. Team, agency,
 * role and active flag are the ASSIGNMENT and go through
 * `AssignmentChangeInput` -> applyAssignmentChanges, which logs them.
 */
export const ProfileInput = z.object({
    name: z.string().trim().min(1),
    email: z.string().trim().toLowerCase().pipe(z.email()),
    // Meritto's user id — an int on their side (7-8 digits today). Nullable
    // here because non-counsellors may have no Meritto account; the action
    // layer enforces "required for counsellors" via `assertRoleConstraints`.
    merittoUserId: z.number().int().positive().nullable(),
});
export type ProfileInput = z.infer<typeof ProfileInput>;

/** A new user: profile plus the initial assignment. Password is the default one. */
export const AddUserInput = ProfileInput.extend({
    roleId: z.number().int().positive(),
    teamId: z.number().int().positive().nullable(),
    agencyId: z.number().int().positive().nullable(),
});
export type AddUserInput = z.infer<typeof AddUserInput>;

/** Any subset of the four logged fields. */
export const AssignmentChangeInput = z.object({
    roleId: z.number().int().positive().optional(),
    teamId: z.number().int().positive().nullable().optional(),
    agencyId: z.number().int().positive().nullable().optional(),
    isActive: z.boolean().optional(),
});
export type AssignmentChangeInput = z.infer<typeof AssignmentChangeInput>;
