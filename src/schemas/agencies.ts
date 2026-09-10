import { z } from "zod";

/** A new agency's name — `agencies.name` is notNull and UNIQUE. */
export const AgencyNameInput = z.string().trim().min(1);
export type AgencyNameInput = z.infer<typeof AgencyNameInput>;
