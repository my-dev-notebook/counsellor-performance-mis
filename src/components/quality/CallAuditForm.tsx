"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FiAlertCircle, FiTrash2 } from "react-icons/fi";
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

const inputClass = "input";
const labelClass = "field";
const primaryButton = "btn btn-primary";
const ghostButton = "btn btn-ghost";
const dangerButton = "btn btn-danger";

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
            className="stack gap-5"
        >
            <section className="card">
                <div className="card-head">
                    <h2 className="card-title">Call details</h2>
                </div>
                <div className="card-pad grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
                    <label className={labelClass}>
                        <span className="label">Counsellor</span>
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
                        <span className="label">Team</span>
                        <input value={counsellor?.teamName ?? ""} readOnly placeholder="—" className="input readonly" />
                    </label>
                    <label className={labelClass}>
                        <span className="label">Application ID (optional)</span>
                        <input
                            value={applicationId}
                            onChange={(e) => {
                                setApplicationId(e.target.value);
                            }}
                            className={inputClass}
                        />
                    </label>
                    <label className={labelClass}>
                        <span className="label">Call date</span>
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
                        <span className="label">Call time</span>
                        <TimePicker value={callTime} onChange={setCallTime} className="w-full" aria-label="Call time" />
                    </label>
                    <div className={labelClass}>
                        <span className="label">Duration</span>
                        <div className="flex items-center gap-2">
                            <input
                                inputMode="numeric"
                                value={minutes}
                                onChange={(e) => {
                                    setMinutes(e.target.value);
                                }}
                                aria-label="Minutes"
                                placeholder="0"
                                className="input input-num"
                            />
                            <span className="t-xs ink-3">min</span>
                            <input
                                inputMode="numeric"
                                value={seconds}
                                onChange={(e) => {
                                    setSeconds(e.target.value);
                                }}
                                aria-label="Seconds"
                                placeholder="0"
                                className="input input-num"
                            />
                            <span className="t-xs ink-3">sec</span>
                        </div>
                    </div>
                    <label className={labelClass}>
                        <span className="label">Phone number</span>
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
                        <span className="label">Period start</span>
                        <DatePicker
                            value={periodStart}
                            onChange={setPeriodStart}
                            max={periodEnd}
                            className="w-full"
                            aria-label="Period start"
                        />
                    </label>
                    <label className={labelClass}>
                        <span className="label">Period end</span>
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

            <section className="card">
                <div className="card-head">
                    <h2 className="card-title">Parameters</h2>
                </div>
                <div className="card-pad divide-y divide-line-1 pt-1">
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

            <section className="card">
                <div className="card-head">
                    <h2 className="card-title">Result</h2>
                </div>
                <div className="card-pad grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
                    <div className={labelClass}>
                        <span className="label">AQS</span>
                        <div className="py-1.5">
                            <AqsPill aqs={aqs} />
                        </div>
                    </div>
                    <label className={labelClass}>
                        <span className="label">Overall rating</span>
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
                        <span className="label">Feedback / coaching area</span>
                        <textarea
                            rows={3}
                            value={feedback}
                            onChange={(e) => {
                                setFeedback(e.target.value);
                            }}
                            className="textarea"
                        />
                    </label>
                </div>
            </section>

            {error && (
                <p className="error-text">
                    <FiAlertCircle aria-hidden />
                    {error}
                </p>
            )}
            <div className="flex flex-wrap items-center gap-3">
                <button type="submit" disabled={pending} className={primaryButton}>
                    {pending && <span className="spinner" aria-hidden />}
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
                        <FiTrash2 aria-hidden />
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
            <span className="t-sm ink-3 t-num font-semibold">{String(PARAMETER_KEYS.indexOf(parameter) + 1)}</span>
            <span className="t-sm">{PARAMETER_LABELS[parameter]}</span>
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
                aria-invalid={reasonMissing ? "true" : undefined}
                className="input input-sm"
            />
        </div>
    );
}
