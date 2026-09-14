import { z } from "zod";
import { DayDate } from "@/schemas/dates";
import type { Status } from "@/schemas/parser";

/**
 * Call audit vocabulary, shared by the form (client) and the action layer
 * (server). Lives here, not in src/db/schema.ts, so the browser bundle never
 * pulls drizzle in.
 *
 * The eight parameters are fixed columns on `call_audits`
 * (rating_<key> / reason_<key>, one pair per `PARAMETER_KEYS` entry); their
 * labels live only here.
 */

export const RATINGS = ["pass", "fail", "na"] as const;
export const Rating = z.enum(RATINGS);
export type Rating = z.infer<typeof Rating>;

export const RATING_LABELS: Record<Rating, string> = {
    pass: "Pass",
    fail: "Fail",
    na: "Not applicable",
};

export const PARAMETER_KEYS = [
    "opening",
    "language",
    "listening",
    "politeness",
    "information",
    "usp",
    "closure",
    "conversion",
] as const;
export type ParameterKey = (typeof PARAMETER_KEYS)[number];

export const PARAMETER_LABELS: Record<ParameterKey, string> = {
    opening: "Opening of the call",
    language: "Language / Grammar / Sentence construction / Punctuation",
    listening: "Active listening",
    politeness: "Politeness",
    information: "Was correct & complete information provided",
    usp: "USP informed",
    closure: "Call closure",
    conversion: "Lead conversion",
};

/** What a fresh audit form starts each parameter at: USP and lead conversion are usually not applicable. */
export const DEFAULT_RATINGS: Record<ParameterKey, Rating> = {
    opening: "pass",
    language: "pass",
    listening: "pass",
    politeness: "pass",
    information: "pass",
    usp: "na",
    closure: "pass",
    conversion: "na",
};

export const OVERALL_RATINGS = [
    "outstanding",
    "exceeded_expectations",
    "meets_expectations",
    "needs_improvement",
] as const;
export const OverallRating = z.enum(OVERALL_RATINGS);
export type OverallRating = z.infer<typeof OverallRating>;
export const DEFAULT_OVERALL_RATING: OverallRating = "meets_expectations";

export const OVERALL_RATING_LABELS: Record<OverallRating, string> = {
    outstanding: "Outstanding",
    exceeded_expectations: "Exceeded expectations",
    meets_expectations: "Meets expectations",
    needs_improvement: "Needs improvement",
};

/** "YYYY-MM-DD HH:MM" -- the `call_audits.call_at` shape. */
export const CallDateTime = z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2} ([01]\d|2[0-3]):[0-5]\d$/, "call time must be YYYY-MM-DD HH:MM");
export type CallDateTime = z.infer<typeof CallDateTime>;

/** One parameter's score. A failure has to say why; otherwise the reason is optional. */
export const ParameterScore = z
    .object({
        rating: Rating,
        reason: z.string().trim().max(1000),
    })
    .refine((s) => s.rating !== "fail" || s.reason !== "", { message: "A failed parameter needs a reason" });
export type ParameterScore = z.infer<typeof ParameterScore>;

export const CallAuditInput = z
    .object({
        userId: z.number().int().positive(),
        callAt: CallDateTime,
        durationSeconds: z
            .number()
            .int()
            .min(0)
            .max(24 * 60 * 60),
        phone: z.string().trim().min(1).max(20),
        applicationId: z.string().trim().max(50),
        periodStart: DayDate,
        periodEnd: DayDate,
        scores: z.object({
            opening: ParameterScore,
            language: ParameterScore,
            listening: ParameterScore,
            politeness: ParameterScore,
            information: ParameterScore,
            usp: ParameterScore,
            closure: ParameterScore,
            conversion: ParameterScore,
        }),
        overallRating: OverallRating,
        feedback: z.string().trim().max(2000),
    })
    .refine((a) => a.periodStart <= a.periodEnd, { message: "Period start must not be after period end" })
    .refine((a) => a.callAt.slice(0, 10) >= a.periodStart && a.callAt.slice(0, 10) <= a.periodEnd, {
        message: "The call must fall inside the selected period",
    });
export type CallAuditInput = z.infer<typeof CallAuditInput>;

export const CallAuditIdInput = z.number().int().positive();

/** AQS as a 0..1 fraction: `(COUNTIF pass + COUNTIF na) / 8`, the sheet's formula. */
export function computeAqs(ratings: Record<ParameterKey, Rating>): number {
    const ok = PARAMETER_KEYS.filter((k) => ratings[k] !== "fail").length;
    return ok / PARAMETER_KEYS.length;
}

/** Green at 100%, Yellow from 88% up, Red below. */
export function aqsStatus(aqs: number): Status {
    if (aqs >= 1) return "Green";
    if (aqs >= 0.88) return "Yellow";
    return "Red";
}

/** "1 min 58 sec" style, matching how the sheet reads. */
export function formatDuration(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    if (m === 0) return `${String(s)} sec`;
    return `${String(m)} min ${String(s)} sec`;
}
