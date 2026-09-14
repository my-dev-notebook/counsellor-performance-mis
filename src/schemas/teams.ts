import { z } from "zod";

/** A team's name — `teams.name` is notNull and UNIQUE. */
export const TeamNameInput = z.string().trim().min(1).max(80);
export type TeamNameInput = z.infer<typeof TeamNameInput>;

export const TeamIdInput = z.number().int().positive();

/** The edit form on the Teams page: new name plus who leads it (null = nobody). */
export const UpdateTeamInput = z.object({
    name: TeamNameInput,
    leaderId: TeamIdInput.nullable(),
});
export type UpdateTeamInput = z.infer<typeof UpdateTeamInput>;
