import { z } from "zod";

/** An agency's name — `agencies.name` is notNull and UNIQUE. */
export const AgencyNameInput = z.string().trim().min(1).max(80);
export type AgencyNameInput = z.infer<typeof AgencyNameInput>;

export const AgencyIdInput = z.number().int().positive();
