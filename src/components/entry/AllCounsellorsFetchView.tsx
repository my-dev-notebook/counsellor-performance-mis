"use client";

import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { AdmissionRow, UserRow } from "@/db/types";
import { FiAlertOctagon, FiChevronDown, FiChevronRight } from "react-icons/fi";
import { MONTH_NAMES } from "@/lib/format";
import { Tooltip } from "@/components/Tooltip";
import { applyFetchedAdmissionsAction } from "@/app/(app)/entry/actions";
import { loadNpfSession } from "@/lib/nopaperformsSession";
import { diffCounsellors, findDuplicateOwnership } from "@/lib/admissions/diff";
import type { CounsellorDiff, DuplicateOwnership, ExistingAdmission, FetchedAdmission } from "@/lib/admissions/diff";
import { ConflictList, DayDiffSection, formatDay } from "@/components/entry/AdmissionDiffPanel";
import type { RowNotes } from "@/components/entry/AdmissionDiffPanel";

const BUTTON = "btn btn-secondary btn-sm";
const PRIMARY = "btn btn-primary btn-sm";

/**
 * How many counsellors are in flight at once. Each is a count request plus
 * one page per 100 rows (~4s a request on Meritto's side), so 8 keeps a
 * ~50-counsellor month under half a minute without hammering the session.
 */
const CONCURRENCY = 8;

/**
 * Goes through a route handler, not a server action: Next.js queues one
 * client's server actions and runs them one at a time, which would turn the
 * worker pool below into a serial loop.
 */
async function fetchCounsellorMonth(
    url: string,
    headers: Record<string, string>,
    userId: number,
    month: string,
): Promise<FetchedAdmission[]> {
    const response = await fetch("/api/meritto/fetch-month", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url, headers, userId, month }),
    });
    const body: unknown = await response.json().catch(() => null);
    if (!response.ok) {
        const message =
            typeof body === "object" && body !== null && "error" in body ? String(body.error) : "Fetch failed";
        throw new Error(message);
    }
    return body as FetchedAdmission[];
}

type FetchState =
    | { status: "skipped" }
    | { status: "pending" }
    | { status: "fetching" }
    | { status: "done"; rows: FetchedAdmission[] }
    | { status: "error"; message: string };

type ApplyState = { status: "applying" } | { status: "applied" } | { status: "error"; message: string };

function toExisting(row: AdmissionRow & { userName: string }): ExistingAdmission {
    return {
        userId: row.userId,
        userName: row.userName,
        date: row.date,
        record: {
            applicationNumber: row.applicationNumber,
            applicantUserId: row.applicantUserId,
            applicantName: row.applicantName,
            formId: row.formId,
            formName: row.formName,
        },
    };
}

function monthLabel(date: string): string {
    const [y, m] = date.split("-");
    return `${MONTH_NAMES[Number.parseInt(m ?? "", 10) - 1] ?? ""} ${y ?? ""}`;
}

interface DiffTotals {
    added: number;
    changed: number;
    removed: number;
}

function diffTotals(diff: CounsellorDiff): DiffTotals {
    return diff.days.reduce<DiffTotals>(
        (acc, d) => ({
            added: acc.added + d.added.length,
            changed: acc.changed + d.changed.length,
            removed: acc.removed + d.removed.length,
        }),
        { added: 0, changed: 0, removed: 0 },
    );
}

function Chip({ tone, children }: { tone: "success" | "warning" | "destructive" | "muted"; children: ReactNode }) {
    const style = { success: "tag-good", warning: "tag-warn", destructive: "tag-bad", muted: "tag-neutral" }[tone];
    return (
        <span data-component="Chip" className={`tag whitespace-nowrap ${style}`}>
            {children}
        </span>
    );
}

function ProgressBar({ done, total }: { done: number; total: number }) {
    const pct = total === 0 ? 0 : Math.round((done / total) * 100);
    return (
        <div
            data-component="ProgressBar"
            className="meter"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={pct}
        >
            <span style={{ width: `${String(pct)}%` }} />
        </div>
    );
}

/**
 * The Meritto-side errors: one application under two or more counsellors.
 * Nothing is applied for such a row until the operator either fixes Meritto
 * and re-fetches, or picks the counsellor here.
 */
function DuplicateList({
    duplicates,
    counsellorsById,
    resolutions,
    onResolve,
}: {
    duplicates: DuplicateOwnership[];
    counsellorsById: Map<number, UserRow>;
    resolutions: ReadonlyMap<string, number | null>;
    onResolve: (applicationNumber: string, userId: number | null) => void;
}) {
    const unresolved = duplicates.filter((d) => (resolutions.get(d.applicationNumber) ?? null) === null).length;
    return (
        <div data-component="DuplicateList" className="stack gap-3">
            <div className="alert alert-bad">
                <FiAlertOctagon aria-hidden />
                <div>
                    <div className="title">
                        {duplicates.length} application{duplicates.length === 1 ? "" : "s"} credited to more than one
                        counsellor in Meritto
                    </div>
                    <p className="t-xs">
                        Meritto returned each of these under every counsellor listed. Fix the ownership in Meritto and
                        re-fetch, or choose who gets it here.{" "}
                        {unresolved > 0
                            ? `${String(unresolved)} unresolved — those rows are left out of every counsellor's apply.`
                            : "All resolved."}
                    </p>
                </div>
            </div>
            <div className="table-wrap">
                <div className="scroll">
                    <table className="table text-xs">
                        <thead>
                            <tr>
                                {[
                                    "Application no",
                                    "Applicant",
                                    "Applicant ID",
                                    "Form",
                                    "Approved on",
                                    "Saved under",
                                    "Credit to",
                                ].map((h) => (
                                    <th key={h}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {duplicates.map((d) => {
                                const first = d.claims[0];
                                if (!first) return null;
                                const dates = Array.from(new Set(d.claims.map((c) => c.date)));
                                const chosen = resolutions.get(d.applicationNumber) ?? null;
                                return (
                                    <tr key={d.applicationNumber} className="align-top">
                                        <td className="primary">{d.applicationNumber}</td>
                                        <td>{first.record.applicantName}</td>
                                        <td>{first.record.applicantUserId}</td>
                                        <td>
                                            {first.record.formName}
                                            <span className="ink-3 block">Form {first.record.formId}</span>
                                        </td>
                                        <td>{dates.map(formatDay).join(", ")}</td>
                                        <td>
                                            {d.existing ? (
                                                `${d.existing.userName} · ${formatDay(d.existing.date)}`
                                            ) : (
                                                <span className="ink-3">Not saved</span>
                                            )}
                                        </td>
                                        <td>
                                            <div className="flex flex-col gap-1">
                                                {d.claims.map((c) => {
                                                    const counsellor = counsellorsById.get(c.userId);
                                                    return (
                                                        <label
                                                            key={c.userId}
                                                            className="checkbox radio t-xs items-center"
                                                        >
                                                            <input
                                                                type="radio"
                                                                name={`dup-${d.applicationNumber}`}
                                                                checked={chosen === c.userId}
                                                                onChange={() => {
                                                                    onResolve(d.applicationNumber, c.userId);
                                                                }}
                                                            />
                                                            {counsellor?.name ?? `User ${String(c.userId)}`}
                                                            <span className="ink-3">
                                                                (Meritto {String(counsellor?.merittoUserId ?? "?")} ·{" "}
                                                                {formatDay(c.date)})
                                                            </span>
                                                        </label>
                                                    );
                                                })}
                                                <label className="checkbox radio t-xs ink-3 items-center">
                                                    <input
                                                        type="radio"
                                                        name={`dup-${d.applicationNumber}`}
                                                        checked={chosen === null}
                                                        onChange={() => {
                                                            onResolve(d.applicationNumber, null);
                                                        }}
                                                    />
                                                    Leave unresolved
                                                </label>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

function CounsellorCard({
    counsellor,
    fetchState,
    diff,
    applyState,
    expanded,
    counsellorsById,
    onToggle,
    onApply,
}: {
    counsellor: UserRow;
    fetchState: FetchState;
    diff: CounsellorDiff | undefined;
    applyState: ApplyState | undefined;
    expanded: boolean;
    counsellorsById: Map<number, UserRow>;
    onToggle: () => void;
    onApply: () => void;
}) {
    const totals = diff ? diffTotals(diff) : null;
    const hasDiff = diff !== undefined && diff.days.length > 0;
    const applied = applyState?.status === "applied";

    const notes: RowNotes = useMemo(() => {
        const map = new Map<string, string>();
        if (!diff) return map;
        for (const m of diff.movedIn)
            map.set(m.applicationNumber, `moved from ${m.fromUserName} (${formatDay(m.fromDate)})`);
        for (const m of diff.movedOut) {
            map.set(
                m.applicationNumber,
                `moved to ${counsellorsById.get(m.toUserId)?.name ?? `user ${String(m.toUserId)}`}`,
            );
        }
        return map;
    }, [diff, counsellorsById]);

    let status: ReactNode;
    switch (fetchState.status) {
        case "skipped":
            status = <Chip tone="muted">No Meritto id</Chip>;
            break;
        case "pending":
            status = <Chip tone="muted">Queued</Chip>;
            break;
        case "fetching":
            status = <Chip tone="warning">Fetching…</Chip>;
            break;
        case "error":
            status = <Chip tone="destructive">Failed</Chip>;
            break;
        case "done":
            status = (
                <>
                    <span className="t-xs ink-3">{fetchState.rows.length} rows</span>
                    {applied ? (
                        <Chip tone="success">Applied</Chip>
                    ) : totals && hasDiff ? (
                        <>
                            {totals.added > 0 && <Chip tone="success">+{totals.added}</Chip>}
                            {totals.changed > 0 && <Chip tone="warning">~{totals.changed}</Chip>}
                            {totals.removed > 0 && <Chip tone="destructive">−{totals.removed}</Chip>}
                        </>
                    ) : (
                        <Chip tone="muted">Up to date</Chip>
                    )}
                    {diff && diff.movedIn.length > 0 && <Chip tone="warning">{diff.movedIn.length} moved in</Chip>}
                    {diff && diff.movedOut.length > 0 && <Chip tone="warning">{diff.movedOut.length} moved out</Chip>}
                    {diff && diff.conflicts.length > 0 && (
                        <Chip tone="destructive">
                            {diff.conflicts.length} conflict{diff.conflicts.length === 1 ? "" : "s"}
                        </Chip>
                    )}
                </>
            );
            break;
    }

    return (
        <div data-component="CounsellorCard" className="card">
            <div className="flex flex-wrap items-center gap-2 px-3 py-2">
                <button
                    type="button"
                    onClick={onToggle}
                    disabled={fetchState.status !== "done" && fetchState.status !== "error"}
                    aria-expanded={expanded}
                    className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 border-0 bg-transparent p-0 text-left disabled:cursor-default"
                >
                    <span className="ink-3 flex w-4 items-center" aria-hidden>
                        {expanded ? <FiChevronDown /> : <FiChevronRight />}
                    </span>
                    <span className="t-sm truncate font-medium">{counsellor.name}</span>
                    {counsellor.teamName && <span className="t-xs ink-3 truncate">{counsellor.teamName}</span>}
                </button>
                <div className="flex flex-wrap items-center gap-1">{status}</div>
                {hasDiff && !applied && (
                    <button
                        type="button"
                        disabled={applyState?.status === "applying"}
                        onClick={onApply}
                        className={PRIMARY}
                    >
                        {applyState?.status === "applying"
                            ? "Applying…"
                            : `Apply ${String(diff.days.length)} day${diff.days.length === 1 ? "" : "s"}`}
                    </button>
                )}
            </div>
            {applyState?.status === "error" && <p className="error-text px-3 pb-2">{applyState.message}</p>}
            {expanded && fetchState.status === "error" && (
                <p className="error-text border-t border-line-1 px-3 py-2">{fetchState.message}</p>
            )}
            {expanded && diff && (
                <div className="stack gap-3 border-t border-line-1 px-3 py-3">
                    {diff.conflicts.length > 0 && <ConflictList conflicts={diff.conflicts} />}
                    {diff.days.length === 0 ? (
                        <p className="t-xs ink-3">Nothing differs from what is saved.</p>
                    ) : (
                        diff.days.map((d) => <DayDiffSection key={d.date} diff={d} notes={notes} />)
                    )}
                </div>
            )}
        </div>
    );
}

/**
 * Month-wide Meritto fetch for every active counsellor in scope. Counsellors
 * are fetched a few at a time and listed as they land; the diff waits until
 * all are in so applications Meritto credits to two counsellors can be
 * caught (see `findDuplicateOwnership`) and resolved before anything is
 * written. Apply is per counsellor, or all at once, straight to the DB.
 */
export function AllCounsellorsFetchView({
    date,
    counsellors,
    admissions,
}: {
    date: string;
    counsellors: UserRow[];
    admissions: (AdmissionRow & { userName: string })[];
}) {
    const [existing, setExisting] = useState<ExistingAdmission[]>(() => admissions.map(toExisting));
    const [states, setStates] = useState<Map<number, FetchState>>(() => new Map());
    const [phase, setPhase] = useState<"idle" | "fetching" | "done">("idle");
    const [sessionError, setSessionError] = useState<string | null>(null);
    const [chosen, setChosen] = useState<Map<string, number | null>>(() => new Map());
    const [applyStates, setApplyStates] = useState<Map<number, ApplyState>>(() => new Map());
    const [applyingAll, setApplyingAll] = useState(false);
    const [onlyChanges, setOnlyChanges] = useState(true);
    const [expanded, setExpanded] = useState<Set<number>>(() => new Set());

    const counsellorsById = useMemo(() => new Map(counsellors.map((c) => [c.id, c])), [counsellors]);

    const setState = (userId: number, state: FetchState) => {
        setStates((prev) => new Map(prev).set(userId, state));
    };

    const fetchAll = () => {
        setSessionError(null);
        const session = loadNpfSession();
        if (!session) {
            setSessionError("No saved NPF session — capture one on the Curl Parser page first.");
            return;
        }
        const initial = new Map<number, FetchState>(
            counsellors.map((c) => [c.id, c.merittoUserId === null ? { status: "skipped" } : { status: "pending" }]),
        );
        setStates(initial);
        setApplyStates(new Map());
        setChosen(new Map());
        setExpanded(new Set());
        setPhase("fetching");

        const queue = counsellors.filter((c) => c.merittoUserId !== null);
        const worker = async () => {
            for (let c = queue.shift(); c; c = queue.shift()) {
                setState(c.id, { status: "fetching" });
                try {
                    const rows = await fetchCounsellorMonth(session.url, session.headers, c.id, date);
                    setState(c.id, { status: "done", rows });
                } catch (error) {
                    const message = error instanceof Error ? error.message : "Fetch failed";
                    setState(c.id, { status: "error", message: `${message}. Check the saved session is still valid.` });
                }
            }
        };
        void Promise.all(Array.from({ length: CONCURRENCY }, worker)).then(() => {
            setPhase("done");
        });
    };

    const fetchedByUser = useMemo(() => {
        const map = new Map<number, FetchedAdmission[]>();
        if (phase !== "done") return map;
        for (const [userId, state] of states) if (state.status === "done") map.set(userId, state.rows);
        return map;
    }, [phase, states]);

    const duplicates = useMemo(() => findDuplicateOwnership(fetchedByUser, existing), [fetchedByUser, existing]);

    // A duplicate the DB already credits to one of its claimants defaults to
    // that counsellor; anything else starts unresolved.
    const resolutions = useMemo(() => {
        const map = new Map<string, number | null>();
        for (const d of duplicates) {
            const picked = chosen.get(d.applicationNumber);
            if (picked !== undefined) map.set(d.applicationNumber, picked);
            else
                map.set(
                    d.applicationNumber,
                    d.existing && d.claims.some((c) => c.userId === d.existing?.userId) ? d.existing.userId : null,
                );
        }
        return map;
    }, [duplicates, chosen]);

    const diffs = useMemo(
        () => diffCounsellors({ monthDate: date, fetchedByUser, existing, resolutions }),
        [date, fetchedByUser, existing, resolutions],
    );

    const apply = async (userId: number) => {
        const diff = diffs.get(userId);
        const counsellor = counsellorsById.get(userId);
        if (!diff || !counsellor || diff.days.length === 0) return;
        setApplyStates((prev) => new Map(prev).set(userId, { status: "applying" }));
        const days = diff.days.map((d) => ({ date: d.date, records: d.fetched }));
        const reclaim = diff.movedIn.map((m) => m.applicationNumber);
        try {
            await applyFetchedAdmissionsAction({ userId, days, reclaim });
        } catch {
            setApplyStates((prev) =>
                new Map(prev).set(userId, {
                    status: "error",
                    message: "Apply failed. Nothing was written for this counsellor.",
                }),
            );
            return;
        }
        // Mirror what the DB now holds so the diff recomputes to "up to date"
        // and moved rows stop showing under their old counsellor.
        const dates = new Set(days.map((d) => d.date));
        const reclaimed = new Set(reclaim);
        setExisting((prev) => [
            ...prev.filter(
                (e) => !(e.userId === userId && dates.has(e.date)) && !reclaimed.has(e.record.applicationNumber),
            ),
            ...days.flatMap((d) =>
                d.records.map((record) => ({ userId, userName: counsellor.name, date: d.date, record })),
            ),
        ]);
        setApplyStates((prev) => new Map(prev).set(userId, { status: "applied" }));
    };

    const applicable = counsellors.filter((c) => {
        const diff = diffs.get(c.id);
        return diff !== undefined && diff.days.length > 0 && applyStates.get(c.id)?.status !== "applied";
    });

    const applyAll = async () => {
        setApplyingAll(true);
        for (const c of applicable) await apply(c.id);
        setApplyingAll(false);
    };

    const fetchable = counsellors.filter((c) => c.merittoUserId !== null).length;
    const finished = Array.from(states.values()).filter((s) => s.status === "done" || s.status === "error").length;
    const rowsSoFar = Array.from(states.values()).reduce((n, s) => n + (s.status === "done" ? s.rows.length : 0), 0);
    const failed = Array.from(states.values()).filter((s) => s.status === "error").length;

    const totals = Array.from(diffs.values()).reduce(
        (acc, d) => {
            const t = diffTotals(d);
            return {
                added: acc.added + t.added,
                changed: acc.changed + t.changed,
                removed: acc.removed + t.removed,
                moves: acc.moves + d.movedIn.length,
                conflicts: acc.conflicts + d.conflicts.length,
                counsellors: acc.counsellors + (d.days.length > 0 ? 1 : 0),
            };
        },
        { added: 0, changed: 0, removed: 0, moves: 0, conflicts: 0, counsellors: 0 },
    );

    const visible = counsellors.filter((c) => {
        if (!onlyChanges || phase !== "done") return true;
        const state = states.get(c.id);
        if (state?.status === "error") return true;
        const diff = diffs.get(c.id);
        return diff !== undefined && (diff.days.length > 0 || diff.conflicts.length > 0);
    });

    return (
        <div data-component="AllCounsellorsFetchView" className="stack gap-4">
            <div className="flex flex-wrap items-center justify-end gap-2">
                {phase === "done" && applicable.length > 0 && (
                    <button
                        type="button"
                        disabled={applyingAll}
                        onClick={() => {
                            void applyAll();
                        }}
                        className={PRIMARY}
                    >
                        {applyingAll
                            ? "Applying…"
                            : `Apply all (${String(applicable.length)} counsellor${applicable.length === 1 ? "" : "s"})`}
                    </button>
                )}
                <Tooltip
                    content={`Fetch ${monthLabel(date)} for every active counsellor with a Meritto id (${String(fetchable)} of ${String(counsellors.length)})`}
                >
                    <button
                        type="button"
                        disabled={phase === "fetching" || applyingAll}
                        onClick={fetchAll}
                        className={BUTTON}
                    >
                        {phase === "fetching" && <span className="spinner" aria-hidden />}
                        {phase === "fetching"
                            ? "Fetching…"
                            : phase === "done"
                              ? "Re-fetch"
                              : `Fetch ${monthLabel(date)}`}
                    </button>
                </Tooltip>
            </div>
            {sessionError && <p className="error-text">{sessionError}</p>}

            {phase !== "idle" && (
                <div className="card card-pad stack gap-2">
                    <div className="t-xs ink-3 flex flex-wrap items-center justify-between gap-2">
                        <span>
                            {finished} / {fetchable} counsellors · {rowsSoFar} rows
                            {failed > 0 && <span className="text-bad-soft-fg"> · {failed} failed</span>}
                            {fetchable < counsellors.length &&
                                ` · ${String(counsellors.length - fetchable)} skipped (no Meritto id)`}
                        </span>
                        {phase === "done" && (
                            <span>
                                {totals.counsellors === 0
                                    ? "Everything is up to date."
                                    : `${String(totals.counsellors)} counsellor${totals.counsellors === 1 ? "" : "s"} differ: +${String(totals.added)} added, ${String(totals.changed)} changed, −${String(totals.removed)} removed${totals.moves > 0 ? `, ${String(totals.moves)} moved` : ""}${totals.conflicts > 0 ? `, ${String(totals.conflicts)} conflicts` : ""}`}
                            </span>
                        )}
                    </div>
                    <ProgressBar done={finished} total={fetchable} />
                </div>
            )}

            {phase === "done" && duplicates.length > 0 && (
                <DuplicateList
                    duplicates={duplicates}
                    counsellorsById={counsellorsById}
                    resolutions={resolutions}
                    onResolve={(applicationNumber, userId) => {
                        setChosen((prev) => new Map(prev).set(applicationNumber, userId));
                    }}
                />
            )}

            {phase !== "idle" && (
                <div className="stack gap-2">
                    {phase === "done" && (
                        <label className="checkbox t-xs ink-3 items-center">
                            <input
                                type="checkbox"
                                checked={onlyChanges}
                                onChange={(e) => {
                                    setOnlyChanges(e.target.checked);
                                }}
                            />
                            Only counsellors with changes ({visible.length} of {counsellors.length})
                        </label>
                    )}
                    {visible.map((c) => (
                        <CounsellorCard
                            key={c.id}
                            counsellor={c}
                            fetchState={states.get(c.id) ?? { status: "pending" }}
                            diff={diffs.get(c.id)}
                            applyState={applyStates.get(c.id)}
                            expanded={expanded.has(c.id)}
                            counsellorsById={counsellorsById}
                            onToggle={() => {
                                setExpanded((prev) => {
                                    const next = new Set(prev);
                                    if (next.has(c.id)) next.delete(c.id);
                                    else next.add(c.id);
                                    return next;
                                });
                            }}
                            onApply={() => {
                                void apply(c.id);
                            }}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
