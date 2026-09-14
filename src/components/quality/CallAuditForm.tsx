"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { CallAuditRow } from "@/db/queries/callAudits";
import type { UserRow } from "@/db/types";
import { DatePicker } from "@/components/DatePicker";
import { Select } from "@/components/Select";
import { TimePicker } from "@/components/TimePicker";
import { AqsPill } from "@/components/quality/AqsPill";
import {
    computeAqs,
    DEFAULT_OVERALL_RATING,
    DEFAULT_RATINGS,
    OVERALL_RATING_LABELS,
    OVERALL_RATINGS,
    PARAMETER_KEYS,
    PARAMETER_LABELS,
    RATING_LABELS,
    RATINGS,
} from "@/schemas/call-audit";
import type { CallAuditInput, OverallRating, ParameterKey, Rating } from "@/schemas/call-audit";
import { createCallAuditAction, deleteCallAuditAction, updateCallAuditAction } from "@/app/(app)/quality/actions";

function errorMessage(error: unknown, fallback: string): string {
    return error instanceof Error && error.message !== "" ? error.message : fallback;
}

const inputClass =
    "w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:border-ring focus:ring-1 focus:ring-ring focus:outline-none";
const labelClass = "flex flex-col gap-1 text-xs font-medium text-muted-foreground";
const primaryButton =
    "rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50";
const ghostButton =
    "rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground";
const dangerButton =
    "rounded-md px-3 py-1.5 text-sm font-medium text-destructive hover:bg-destructive/10 disabled:opacity-50";

const RATING_OPTIONS = RATINGS.map((r) => ({ value: r, label: RATING_LABELS[r] }));
const OVERALL_OPTIONS = OVERALL_RATINGS.map((r) => ({ value: r, label: OVERALL_RATING_LABELS[r] }));

function todayDate(): string {
    const now = new Date();
    return `${String(now.getFullYear())}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

/** Whole non-negative number from a text field; NaN when it is not one. */
function parseWhole(text: string): number {
    const trimmed = text.trim();
    if (trimmed === "") return 0;
    return /^\d+$/.test(trimmed) ? Number.parseInt(trimmed, 10) : Number.NaN;
}

const EMPTY_SCORES = Object.fromEntries(
    PARAMETER_KEYS.map((k) => [k, { rating: DEFAULT_RATINGS[k], reason: "" }]),
) as Record<ParameterKey, { rating: Rating; reason: string }>;

/**
 * Create (`audit === null`) or edit one call audit. Seeds its state from the
 * row once, so the page must remount it for a different audit.
 */
export function CallAuditForm({ counsellors, audit }: { counsellors: UserRow[]; audit: CallAuditRow | null }) {
    const router = useRouter();
    const [userId, setUserId] = useState<number | "">(audit?.userId ?? "");
    const [callDate, setCallDate] = useState(audit?.callAt.slice(0, 10) ?? todayDate());
    const [callTime, setCallTime] = useState(audit?.callAt.slice(11, 16) ?? "");
    const [minutes, setMinutes] = useState(audit ? String(Math.floor(audit.durationSeconds / 60)) : "");
    const [seconds, setSeconds] = useState(audit ? String(audit.durationSeconds % 60) : "");
    const [phone, setPhone] = useState(audit?.phone ?? "");
    const [applicationId, setApplicationId] = useState(audit?.applicationId ?? "");
    const [periodStart, setPeriodStart] = useState(audit?.periodStart ?? todayDate());
    const [periodEnd, setPeriodEnd] = useState(audit?.periodEnd ?? todayDate());
    const [scores, setScores] = useState<Record<ParameterKey, { rating: Rating; reason: string }>>(() =>
        audit
            ? (Object.fromEntries(
                  PARAMETER_KEYS.map((k) => [k, { rating: audit.ratings[k], reason: audit.reasons[k] }]),
              ) as Record<ParameterKey, { rating: Rating; reason: string }>)
            : EMPTY_SCORES,
    );
    const [overallRating, setOverallRating] = useState<OverallRating>(audit?.overallRating ?? DEFAULT_OVERALL_RATING);
    const [feedback, setFeedback] = useState(audit?.feedback ?? "");
    const [pending, startTransition] = useTransition();
    const [error, setError] = useState<string | null>(null);

    const counsellor = counsellors.find((c) => c.id === userId) ?? null;
    const counsellorOptions = useMemo(
        () =>
            counsellors.map((c) => ({
                value: String(c.id),
                label: c.isActive ? c.name : `${c.name} (inactive)`,
            })),
        [counsellors],
    );

    const aqs = useMemo(
        () =>
            computeAqs(
                Object.fromEntries(PARAMETER_KEYS.map((k) => [k, scores[k].rating])) as Record<ParameterKey, Rating>,
            ),
        [scores],
    );

    const setScore = (key: ParameterKey, patch: Partial<{ rating: Rating; reason: string }>) => {
        setScores((current) => ({ ...current, [key]: { ...current[key], ...patch } }));
    };

    const submit = () => {
        if (userId === "") {
            setError("Pick a counsellor.");
            return;
        }
        if (callDate === "" || callTime === "") {
            setError("Call date and time are required.");
            return;
        }
        const m = parseWhole(minutes);
        const s = parseWhole(seconds);
        if (Number.isNaN(m) || Number.isNaN(s) || s > 59) {
            setError("Duration must be whole minutes and seconds (0–59).");
            return;
        }
        if (phone.trim() === "") {
            setError("Phone number is required.");
            return;
        }
        if (periodStart > periodEnd) {
            setError("Period start must not be after period end.");
            return;
        }
        if (callDate < periodStart || callDate > periodEnd) {
            setError("The call date must fall inside the selected period.");
            return;
        }
        const failedWithoutReason = PARAMETER_KEYS.find(
            (k) => scores[k].rating === "fail" && scores[k].reason.trim() === "",
        );
        if (failedWithoutReason) {
            setError(`Parameter ${failedWithoutReason.toUpperCase()} is marked Fail — add a detailed reason.`);
            return;
        }
        const input: CallAuditInput = {
            userId,
            callAt: `${callDate} ${callTime}`,
            durationSeconds: m * 60 + s,
            phone: phone.trim(),
            applicationId: applicationId.trim(),
            periodStart,
            periodEnd,
            scores,
            overallRating,
            feedback: feedback.trim(),
        };
        setError(null);
        startTransition(async () => {
            try {
                if (audit) {
                    await updateCallAuditAction(audit.id, input);
                } else {
                    await createCallAuditAction(input);
                }
                router.push("/quality");
            } catch (e) {
                setError(errorMessage(e, "Failed to save the audit."));
            }
        });
    };

    const remove = () => {
        if (!audit) return;
        if (!confirm(`Delete this audit of ${audit.counsellorName}'s call? This cannot be undone.`)) return;
        startTransition(async () => {
            try {
                await deleteCallAuditAction(audit.id);
                router.push("/quality");
            } catch (e) {
                setError(errorMessage(e, "Failed to delete the audit."));
            }
        });
    };

    return (
        <form
            data-component="CallAuditForm"
            onSubmit={(e) => {
                e.preventDefault();
                submit();
            }}
            className="space-y-6"
        >
            <section className="space-y-4 rounded-lg border border-border bg-card p-4">
                <h2 className="text-sm font-semibold text-foreground">Call details</h2>
                <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
                    <label className={labelClass}>
                        Counsellor
                        <Select
                            value={userId === "" ? "" : String(userId)}
                            onChange={(v) => {
                                setUserId(v === "" ? "" : Number.parseInt(v, 10));
                            }}
                            options={counsellorOptions}
                            placeholder="Select counsellor…"
                            className="w-full"
                            aria-label="Counsellor"
                        />
                    </label>
                    <label className={labelClass}>
                        Team
                        <input
                            value={counsellor?.teamName ?? ""}
                            readOnly
                            placeholder="—"
                            className={`${inputClass} opacity-70`}
                        />
                    </label>
                    <label className={labelClass}>
                        Application ID (optional)
                        <input
                            value={applicationId}
                            onChange={(e) => {
                                setApplicationId(e.target.value);
                            }}
                            className={inputClass}
                        />
                    </label>
                    <label className={labelClass}>
                        Call date
                        <DatePicker
                            value={callDate}
                            onChange={setCallDate}
                            min={periodStart}
                            max={periodEnd}
                            className="w-full"
                            aria-label="Call date"
                        />
                    </label>
                    <label className={labelClass}>
                        Call time
                        <TimePicker value={callTime} onChange={setCallTime} className="w-full" aria-label="Call time" />
                    </label>
                    <div className={labelClass}>
                        Duration
                        <div className="flex items-center gap-2">
                            <input
                                inputMode="numeric"
                                value={minutes}
                                onChange={(e) => {
                                    setMinutes(e.target.value);
                                }}
                                aria-label="Minutes"
                                placeholder="0"
                                className={inputClass}
                            />
                            <span className="text-xs text-muted-foreground">min</span>
                            <input
                                inputMode="numeric"
                                value={seconds}
                                onChange={(e) => {
                                    setSeconds(e.target.value);
                                }}
                                aria-label="Seconds"
                                placeholder="0"
                                className={inputClass}
                            />
                            <span className="text-xs text-muted-foreground">sec</span>
                        </div>
                    </div>
                    <label className={labelClass}>
                        Phone number
                        <input
                            inputMode="tel"
                            value={phone}
                            onChange={(e) => {
                                setPhone(e.target.value);
                            }}
                            className={inputClass}
                        />
                    </label>
                    <label className={labelClass}>
                        Period start
                        <DatePicker
                            value={periodStart}
                            onChange={setPeriodStart}
                            max={periodEnd}
                            className="w-full"
                            aria-label="Period start"
                        />
                    </label>
                    <label className={labelClass}>
                        Period end
                        <DatePicker
                            value={periodEnd}
                            onChange={setPeriodEnd}
                            min={periodStart}
                            className="w-full"
                            aria-label="Period end"
                        />
                    </label>
                </div>
            </section>

            <section className="space-y-4 rounded-lg border border-border bg-card p-4">
                <h2 className="text-sm font-semibold text-foreground">Parameters</h2>
                <div className="divide-y divide-border">
                    {PARAMETER_KEYS.map((key) => (
                        <ParameterRow
                            key={key}
                            parameter={key}
                            rating={scores[key].rating}
                            reason={scores[key].reason}
                            onChange={(patch) => {
                                setScore(key, patch);
                            }}
                        />
                    ))}
                </div>
            </section>

            <section className="space-y-4 rounded-lg border border-border bg-card p-4">
                <h2 className="text-sm font-semibold text-foreground">Result</h2>
                <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
                    <div className={labelClass}>
                        AQS
                        <div className="py-1.5">
                            <AqsPill aqs={aqs} />
                        </div>
                    </div>
                    <label className={labelClass}>
                        Overall rating
                        <Select
                            value={overallRating}
                            onChange={(v) => {
                                setOverallRating(v as OverallRating);
                            }}
                            options={OVERALL_OPTIONS}
                            className="w-full"
                            aria-label="Overall rating"
                        />
                    </label>
                    <label className={`${labelClass} sm:col-span-2`}>
                        Feedback / coaching area
                        <textarea
                            rows={3}
                            value={feedback}
                            onChange={(e) => {
                                setFeedback(e.target.value);
                            }}
                            className={inputClass}
                        />
                    </label>
                </div>
            </section>

            {error && <p className="text-sm text-destructive">{error}</p>}
            <div className="flex flex-wrap items-center gap-3">
                <button type="submit" disabled={pending} className={primaryButton}>
                    {pending ? "Saving…" : audit ? "Save changes" : "Save audit"}
                </button>
                <button
                    type="button"
                    onClick={() => {
                        router.push("/quality");
                    }}
                    className={ghostButton}
                >
                    Cancel
                </button>
                {audit && (
                    <button type="button" disabled={pending} onClick={remove} className={`${dangerButton} ml-auto`}>
                        Delete audit
                    </button>
                )}
            </div>
        </form>
    );
}

function ParameterRow({
    parameter,
    rating,
    reason,
    onChange,
}: {
    parameter: ParameterKey;
    rating: Rating;
    reason: string;
    onChange: (patch: Partial<{ rating: Rating; reason: string }>) => void;
}) {
    const reasonMissing = rating === "fail" && reason.trim() === "";
    return (
        <div
            data-component="ParameterRow"
            className="grid grid-cols-1 gap-x-4 gap-y-2 py-3 md:grid-cols-[2rem_1fr_11rem_1fr] md:items-start"
        >
            <span className="text-sm font-semibold text-muted-foreground">
                {String(PARAMETER_KEYS.indexOf(parameter) + 1)}
            </span>
            <span className="text-sm text-foreground">{PARAMETER_LABELS[parameter]}</span>
            <Select
                value={rating}
                onChange={(v) => {
                    onChange({ rating: v as Rating });
                }}
                options={RATING_OPTIONS}
                size="sm"
                className="w-full"
                aria-label={`Rating for ${PARAMETER_LABELS[parameter]}`}
            />
            <input
                value={reason}
                onChange={(e) => {
                    onChange({ reason: e.target.value });
                }}
                placeholder={rating === "fail" ? "Detailed reason (required)" : "Detailed reason (optional)"}
                aria-label={`Reason for ${PARAMETER_LABELS[parameter]}`}
                className={`rounded-md border bg-background px-2 py-1 text-sm text-foreground ${
                    reasonMissing ? "border-destructive" : "border-input"
                }`}
            />
        </div>
    );
}
