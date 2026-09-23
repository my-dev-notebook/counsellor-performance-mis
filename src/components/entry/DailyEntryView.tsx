"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
    FiAlertCircle,
    FiArrowLeft,
    FiDownloadCloud,
    FiRotateCcw,
    FiRotateCw,
    FiSearch,
    FiTrash2,
    FiX,
} from "react-icons/fi";
import type { SuccessfulApplicationRecord, SuccessfulApplicationRow, UserRow } from "@/db/types";
import { MONTH_NAMES } from "@/lib/format";
import { cellTone } from "@/lib/successful-applications/calendar-tone";
import { MonthPicker } from "@/components/MonthPicker";
import { Select } from "@/components/Select";
import { Tooltip } from "@/components/Tooltip";
import {
    saveDailySuccessfulApplicationAction,
    fetchSuccessfulApplicationDiffAction,
    applyFetchedSuccessfulApplicationsAction,
} from "@/app/(app)/entry/actions";
import type { SuccessfulApplicationFetchDiff, FetchWindow } from "@/app/(app)/entry/actions";
import { loadNpfSession } from "@/lib/nopaperformsSession";
import { SuccessfulApplicationDiffPanel } from "@/components/entry/SuccessfulApplicationDiffPanel";
import { DataTable } from "@/components/DataTable";
import type { Column } from "@/components/DataTable";

/** Days in the "YYYY-MM" month, via vanilla Date (day 0 of next month = last day of this month). */
function daysInMonth(date: string): number {
    const [yearStr, monthStr] = date.split("-");
    const year = Number.parseInt(yearStr ?? "", 10);
    const month = Number.parseInt(monthStr ?? "", 10);
    return new Date(year, month, 0).getDate();
}

function dayDate(monthDate: string, day: number): string {
    return `${monthDate}-${String(day).padStart(2, "0")}`;
}

/** 0 (Sun) .. 6 (Sat) for the 1st of the "YYYY-MM" month — leading blanks in the calendar grid. */
function firstWeekday(date: string): number {
    const [yearStr, monthStr] = date.split("-");
    const year = Number.parseInt(yearStr ?? "", 10);
    const month = Number.parseInt(monthStr ?? "", 10);
    return new Date(year, month - 1, 1).getDay();
}

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const PICKER_COLUMNS: Column<UserRow>[] = [
    { key: "name", header: "Counsellor", className: "primary", render: (c) => c.name },
    { key: "team", header: "Team", className: "muted", render: (c) => c.teamName ?? "—" },
    { key: "agency", header: "Agency", className: "muted", render: (c) => c.agencyName ?? "—" },
];

function parseMonthDate(date: string): { year: number; month: number } {
    const [yearStr, monthStr] = date.split("-");
    return { year: Number.parseInt(yearStr ?? "", 10), month: Number.parseInt(monthStr ?? "", 10) };
}

function todayDayDate(): string {
    const now = new Date();
    return `${String(now.getFullYear())}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

function CounsellorPicker({ counsellors, date }: { counsellors: UserRow[]; date: string }) {
    const router = useRouter();
    const [search, setSearch] = useState("");

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (q === "") return counsellors;
        return counsellors.filter(
            (c) =>
                c.name.toLowerCase().includes(q) ||
                (c.teamName?.toLowerCase().includes(q) ?? false) ||
                (c.agencyName?.toLowerCase().includes(q) ?? false),
        );
    }, [counsellors, search]);

    return (
        <div data-component="CounsellorPicker" className="stack">
            <div className="card card-pad flex flex-wrap items-center justify-between gap-3">
                <div className="input-wrap w-full sm:w-80">
                    <FiSearch className="lead" aria-hidden />
                    <input
                        type="search"
                        placeholder="Search by name, team, agency…"
                        aria-label="Search counsellors"
                        value={search}
                        onChange={(e) => {
                            setSearch(e.target.value);
                        }}
                        className="input"
                    />
                </div>
                <Tooltip content="Fetch this month from Meritto for every counsellor listed here and compare with what is saved">
                    <button
                        type="button"
                        onClick={() => {
                            router.push(`/entry/fetch?date=${date}`);
                        }}
                        className="btn btn-secondary"
                    >
                        <FiDownloadCloud aria-hidden />
                        Auto-fetch all counsellors
                    </button>
                </Tooltip>
            </div>
            <DataTable
                columns={PICKER_COLUMNS}
                rows={filtered}
                rowKey={(c) => c.id}
                emptyMessage="No counsellors match the search."
                onRowClick={(c) => {
                    router.push(`/entry/daily?userId=${String(c.id)}&date=${date}`);
                }}
                footer={<span>Click a counsellor to open their month</span>}
            />
        </div>
    );
}

/** Which counsellor and which month — both navigate via the URL so the page re-fetches the successful applications. */
function ScopeCard({ counsellors, userId, date }: { counsellors: UserRow[]; userId: number; date: string }) {
    const router = useRouter();
    return (
        <div data-component="ScopeCard" className="card card-pad stack gap-3">
            <div className="field">
                <span className="label">Counsellor</span>
                <Select
                    aria-label="Counsellor"
                    value={String(userId)}
                    onChange={(value) => {
                        router.push(`/entry/daily?userId=${value}&date=${date}`);
                    }}
                    options={counsellors.map((c) => ({
                        value: String(c.id),
                        label: c.teamName ? `${c.name} · ${c.teamName}` : c.name,
                    }))}
                />
            </div>
            <div className="field">
                <span className="label">Month</span>
                <MonthPicker date={date} existingMonths={[]} basePath="/entry/daily" />
            </div>
        </div>
    );
}

function CalendarGrid({
    date,
    counts,
    selectedDate,
    onSelect,
}: {
    date: string;
    counts: Map<string, number>;
    selectedDate: string | null;
    onSelect: (dDate: string | null) => void;
}) {
    const days = Array.from({ length: daysInMonth(date) }, (_, i) => i + 1);
    const leadingBlanks = Array.from({ length: firstWeekday(date) }, (_, i) => i);
    const maxCount = Math.max(0, ...counts.values());
    const today = todayDayDate();
    const total = Array.from(counts.values()).reduce((sum, n) => sum + n, 0);

    return (
        <div data-component="CalendarGrid" className="card">
            <div className="card-head">
                <h3 className="card-title">Days</h3>
                <span className="card-meta">{total} in month</span>
            </div>
            <div className="card-pad">
                <div className="cal compact">
                    {WEEKDAY_LABELS.map((w) => (
                        <div key={w} className="dow">
                            {w.slice(0, 2)}
                        </div>
                    ))}
                    {leadingBlanks.map((i) => (
                        <div key={`blank-${String(i)}`} className="day blank" />
                    ))}
                    {days.map((day) => {
                        const dDate = dayDate(date, day);
                        const count = counts.get(dDate) ?? 0;
                        const selected = dDate === selectedDate;
                        return (
                            <button
                                key={dDate}
                                type="button"
                                onClick={() => {
                                    onSelect(selected ? null : dDate);
                                }}
                                aria-selected={selected}
                                aria-label={`${dDate}: ${String(count)} applications`}
                                className={`day ${cellTone(count, maxCount)} ${dDate === today ? "today" : ""} ${dDate > today ? "future" : ""}`}
                            >
                                <span className="n">{day}</span>
                                {count > 0 && <span className="c">{count}</span>}
                            </button>
                        );
                    })}
                </div>
                {today.startsWith(date) && (
                    <button
                        type="button"
                        className="btn btn-link mt-3"
                        onClick={() => {
                            onSelect(today);
                        }}
                    >
                        Jump to today
                    </button>
                )}
            </div>
        </div>
    );
}

/**
 * The grid's in-progress mirror of `SuccessfulApplicationRecord`, with every field a string.
 * `SuccessfulApplicationRecord` types the two ids as numbers (they're integer columns), but
 * a half-typed id is neither a valid number nor meaningfully "0" — so editing
 * happens on strings and `toRecord` converts once, on save.
 */
interface DraftRecord {
    applicationNumber: string;
    applicantUserId: string;
    applicantName: string;
    formId: string;
    formName: string;
}

const BLANK_DRAFT: DraftRecord = {
    applicationNumber: "",
    applicantUserId: "",
    applicantName: "",
    formId: "",
    formName: "",
};

function isEmptyDraft(d: DraftRecord): boolean {
    return (
        d.applicationNumber === "" &&
        d.applicantUserId === "" &&
        d.applicantName === "" &&
        d.formId === "" &&
        d.formName === ""
    );
}

function toDraft(r: SuccessfulApplicationRecord): DraftRecord {
    return {
        applicationNumber: r.applicationNumber,
        applicantUserId: String(r.applicantUserId),
        applicantName: r.applicantName,
        formId: String(r.formId),
        formName: r.formName,
    };
}

/**
 * Every `successful_applications` column is notNull, so a row is either complete or it isn't
 * saved — returns null for an incomplete draft rather than writing a partial
 * record the DB would reject anyway.
 */
function toRecord(d: DraftRecord): SuccessfulApplicationRecord | null {
    const applicantUserId = Number(d.applicantUserId.trim());
    const formId = Number(d.formId.trim());
    if (
        d.applicationNumber.trim() === "" ||
        d.applicantName.trim() === "" ||
        d.formName.trim() === "" ||
        !Number.isInteger(applicantUserId) ||
        applicantUserId <= 0 ||
        !Number.isInteger(formId) ||
        formId <= 0
    ) {
        return null;
    }
    return {
        applicationNumber: d.applicationNumber.trim(),
        applicantUserId,
        applicantName: d.applicantName.trim(),
        formId,
        formName: d.formName.trim(),
    };
}

/**
 * Drops any run of trailing blank rows and appends exactly one back, so
 * typing into the last row grows the table and clearing it back out shrinks
 * the table — instead of leaving stray blank rows behind.
 */
function normalizeDrafts(drafts: DraftRecord[]): DraftRecord[] {
    let end = drafts.length;
    while (end > 0 && isEmptyDraft(drafts[end - 1] ?? BLANK_DRAFT)) end--;
    return [...drafts.slice(0, end), { ...BLANK_DRAFT }];
}

/**
 * The two-step auto-fetch shared by the day editor and the month button:
 * fetch a diff against the DB, show it, then (on apply) write every differing
 * day and hand the written rows to `onApplied` so the caller can refresh its
 * own state. Nothing touches the DB until apply.
 */
function useSuccessfulApplicationFetch(userId: number, onApplied: (days: { date: string; records: SuccessfulApplicationRecord[] }[]) => void) {
    const [diff, setDiff] = useState<SuccessfulApplicationFetchDiff | null>(null);
    const [fetching, setFetching] = useState(false);
    const [applying, setApplying] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchDiff = (range: FetchWindow) => {
        setError(null);
        const session = loadNpfSession();
        if (!session) {
            setError("No saved NPF session — capture one on the Curl Parser page first.");
            return;
        }
        setFetching(true);
        void fetchSuccessfulApplicationDiffAction(session.url, session.headers, userId, range)
            .then(setDiff)
            .catch(() => {
                setError(
                    "Auto-fetch failed. Check the saved session is still valid and the counsellor has a Meritto id.",
                );
            })
            .finally(() => {
                setFetching(false);
            });
    };

    const apply = () => {
        if (!diff || diff.days.length === 0) return;
        setError(null);
        setApplying(true);
        const days = diff.days.map((d) => ({ date: d.date, records: d.fetched }));
        void applyFetchedSuccessfulApplicationsAction({ userId, days })
            .then(() => {
                setDiff(null);
                onApplied(days);
            })
            .catch(() => {
                setError("Apply failed. Nothing was written — check the rows and try again.");
            })
            .finally(() => {
                setApplying(false);
            });
    };

    const discard = () => {
        setDiff(null);
        setError(null);
    };

    return { diff, fetching, applying, error, fetchDiff, apply, discard };
}

function DayEditor({
    userId,
    date,
    initialRecords,
    onSaved,
    onClose,
}: {
    userId: number;
    date: string;
    initialRecords: SuccessfulApplicationRecord[];
    onSaved: (dDate: string, records: SuccessfulApplicationRecord[]) => void;
    onClose: () => void;
}) {
    const [records, setRecords] = useState<DraftRecord[]>(() => normalizeDrafts(initialRecords.map(toDraft)));
    const [past, setPast] = useState<DraftRecord[][]>([]);
    const [future, setFuture] = useState<DraftRecord[][]>([]);
    const [pending, startTransition] = useTransition();
    const [error, setError] = useState<string | null>(null);
    const [saved, setSaved] = useState(true);
    // Apply writes straight to the DB, so the grid is reset to what was
    // written: the draft (and its undo history) no longer describes anything.
    const autoFetch = useSuccessfulApplicationFetch(userId, (days) => {
        const applied = days.find((d) => d.date === date)?.records ?? [];
        setRecords(normalizeDrafts(applied.map(toDraft)));
        setPast([]);
        setFuture([]);
        setSaved(true);
        onSaved(date, applied);
    });

    const commit = (next: DraftRecord[]) => {
        setPast((p) => [...p, records]);
        setFuture([]);
        setRecords(next);
        setSaved(false);
    };

    const undo = () => {
        if (past.length === 0) return;
        const previous = past[past.length - 1];
        if (!previous) return;
        setPast((p) => p.slice(0, -1));
        setFuture((f) => [records, ...f]);
        setRecords(previous);
        setSaved(false);
    };

    const redo = () => {
        if (future.length === 0) return;
        const next = future[0];
        if (!next) return;
        setFuture((f) => f.slice(1));
        setPast((p) => [...p, records]);
        setRecords(next);
        setSaved(false);
    };

    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (!(e.ctrlKey || e.metaKey)) return;
            if (e.key === "z" && !e.shiftKey) {
                e.preventDefault();
                undo();
            } else if (e.key === "y" || (e.key === "z" && e.shiftKey)) {
                e.preventDefault();
                redo();
            }
        };
        window.addEventListener("keydown", handler);
        return () => {
            window.removeEventListener("keydown", handler);
        };
    }, [records, past, future]);

    const updateRecord = (index: number, field: keyof DraftRecord, value: string) => {
        const next = normalizeDrafts(records.map((r, i) => (i === index ? { ...r, [field]: value } : r)));
        commit(next);
    };

    const removeRecord = (index: number) => {
        commit(normalizeDrafts(records.filter((_, i) => i !== index)));
    };

    const save = () => {
        setError(null);
        const drafts = records.filter((r) => !isEmptyDraft(r));
        const toSave = drafts.map(toRecord);
        const firstInvalid = toSave.indexOf(null);
        if (firstInvalid !== -1) {
            setError(
                `Row ${String(firstInvalid + 1)} is incomplete — all five fields are required, and Applicant ID / Form ID must be positive whole numbers.`,
            );
            return;
        }
        const valid = toSave as SuccessfulApplicationRecord[];
        startTransition(async () => {
            try {
                await saveDailySuccessfulApplicationAction(userId, date, valid);
                setSaved(true);
                onSaved(date, valid);
            } catch {
                setError("Failed to save. Check the values and try again.");
            }
        });
    };

    const day = Number.parseInt(date.split("-")[2] ?? "0", 10);
    const filledCount = records.filter((r) => !isEmptyDraft(r)).length;

    return (
        <div data-component="DayEditor" className="card">
            <div className="card-head items-center">
                <h3 className="card-title">
                    Day {day} · {filledCount} successful application{filledCount === 1 ? "" : "s"}
                </h3>
                <div className="row gap-1">
                    <Tooltip content="Fetch this day's online-paid applicants from Meritto and compare with what is saved">
                        <button
                            type="button"
                            disabled={autoFetch.fetching || autoFetch.applying}
                            onClick={() => {
                                autoFetch.fetchDiff({ day: date });
                            }}
                            className="btn btn-secondary btn-sm"
                        >
                            {autoFetch.fetching ? (
                                <span className="spinner" aria-hidden />
                            ) : (
                                <FiDownloadCloud aria-hidden />
                            )}
                            {autoFetch.fetching ? "Fetching…" : "Auto-fetch"}
                        </button>
                    </Tooltip>
                    <Tooltip content="Undo (Ctrl+Z)">
                        <button
                            type="button"
                            disabled={past.length === 0}
                            onClick={undo}
                            aria-label="Undo"
                            className="btn btn-ghost btn-icon btn-sm"
                        >
                            <FiRotateCcw aria-hidden />
                        </button>
                    </Tooltip>
                    <Tooltip content="Redo (Ctrl+Y)">
                        <button
                            type="button"
                            disabled={future.length === 0}
                            onClick={redo}
                            aria-label="Redo"
                            className="btn btn-ghost btn-icon btn-sm"
                        >
                            <FiRotateCw aria-hidden />
                        </button>
                    </Tooltip>
                    <Tooltip content="Close day editor">
                        <button
                            type="button"
                            onClick={onClose}
                            aria-label="Close day editor"
                            className="btn btn-ghost btn-icon btn-sm"
                        >
                            <FiX aria-hidden />
                        </button>
                    </Tooltip>
                </div>
            </div>
            {autoFetch.error && !autoFetch.diff && (
                <p className="error-text px-4 pt-3">
                    <FiAlertCircle aria-hidden />
                    {autoFetch.error}
                </p>
            )}
            {autoFetch.diff && (
                <div className="px-4 pt-3">
                    <SuccessfulApplicationDiffPanel
                        title={`Meritto vs saved — day ${String(day)}`}
                        diff={autoFetch.diff}
                        applying={autoFetch.applying}
                        error={autoFetch.error}
                        onApply={autoFetch.apply}
                        onDiscard={autoFetch.discard}
                    />
                </div>
            )}
            <div className="scroll mt-3 border-t border-line-1">
                <table className="table">
                    <thead>
                        <tr>
                            {["Application no", "Applicant ID", "Applicant name", "Form ID", "Form name"].map((h) => (
                                <th key={h}>{h}</th>
                            ))}
                            <th>
                                <span className="sr-only">Remove</span>
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {records.map((record, index) => {
                            const blank = isEmptyDraft(record);
                            const isSentinel = blank && index === records.length - 1;
                            return (
                                <tr key={index}>
                                    <td className="px-2 py-1.5">
                                        <input
                                            value={record.applicationNumber}
                                            placeholder="Application no"
                                            onChange={(e) => {
                                                updateRecord(index, "applicationNumber", e.target.value);
                                            }}
                                            className="input input-sm"
                                        />
                                    </td>
                                    <td className="px-2 py-1.5">
                                        <input
                                            value={record.applicantUserId}
                                            inputMode="numeric"
                                            placeholder="Applicant ID"
                                            onChange={(e) => {
                                                updateRecord(index, "applicantUserId", e.target.value);
                                            }}
                                            className="input input-sm"
                                        />
                                    </td>
                                    <td className="px-2 py-1.5">
                                        <input
                                            value={record.applicantName}
                                            placeholder="Applicant name"
                                            onChange={(e) => {
                                                updateRecord(index, "applicantName", e.target.value);
                                            }}
                                            className="input input-sm"
                                        />
                                    </td>
                                    <td className="px-2 py-1.5">
                                        <input
                                            value={record.formId}
                                            inputMode="numeric"
                                            placeholder="Form ID"
                                            onChange={(e) => {
                                                updateRecord(index, "formId", e.target.value);
                                            }}
                                            className="input input-sm"
                                        />
                                    </td>
                                    <td className="px-2 py-1.5">
                                        <input
                                            value={record.formName}
                                            placeholder="Form name"
                                            onChange={(e) => {
                                                updateRecord(index, "formName", e.target.value);
                                            }}
                                            className="input input-sm"
                                        />
                                    </td>
                                    <td className="px-2 py-1.5">
                                        {!isSentinel && (
                                            <Tooltip content="Delete row">
                                                <button
                                                    type="button"
                                                    aria-label="Delete row"
                                                    onClick={() => {
                                                        removeRecord(index);
                                                    }}
                                                    className="btn btn-danger btn-icon btn-sm"
                                                >
                                                    <FiTrash2 aria-hidden />
                                                </button>
                                            </Tooltip>
                                        )}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
            <div className="row border-t border-line-1 px-4 py-3">
                <button type="button" disabled={pending} onClick={save} className="btn btn-primary">
                    {pending && <span className="spinner" aria-hidden />}
                    {pending ? "Saving…" : "Save day"}
                </button>
                {!saved && !pending && <span className="unsaved">Unsaved changes</span>}
                {error && (
                    <p className="error-text">
                        <FiAlertCircle aria-hidden />
                        {error}
                    </p>
                )}
            </div>
        </div>
    );
}

export function DailyEntryView({
    date,
    counsellors,
    selectedUserId,
    counsellorName,
    successfulApplications,
}: {
    date: string;
    counsellors: UserRow[];
    selectedUserId: number | null;
    counsellorName: string | null;
    successfulApplications: SuccessfulApplicationRow[];
}) {
    const router = useRouter();
    const [selectedDate, setSelectedDate] = useState<string | null>(null);
    // Bumped when a month apply rewrites days behind the open editor, so it
    // remounts from the new rows instead of keeping a stale draft.
    const [editorVersion, setEditorVersion] = useState(0);
    // `successfulApplications` arrives as one row per successful application; the calendar grid and the
    // day editor both work per-day, so group once on mount.
    const [recordsByDate, setRecordsByDate] = useState<Map<string, SuccessfulApplicationRecord[]>>(() => {
        const byDate = new Map<string, SuccessfulApplicationRecord[]>();
        for (const row of successfulApplications) {
            const records = byDate.get(row.date) ?? [];
            records.push({
                applicationNumber: row.applicationNumber,
                applicantUserId: row.applicantUserId,
                applicantName: row.applicantName,
                formId: row.formId,
                formName: row.formName,
            });
            byDate.set(row.date, records);
        }

        return byDate;
    });

    const monthFetch = useSuccessfulApplicationFetch(selectedUserId ?? 0, (days) => {
        setRecordsByDate((prev) => {
            const next = new Map(prev);
            for (const d of days) {
                if (d.records.length === 0) next.delete(d.date);
                else next.set(d.date, d.records);
            }
            return next;
        });
        setEditorVersion((v) => v + 1);
    });

    if (selectedUserId === null) {
        return <CounsellorPicker counsellors={counsellors} date={date} />;
    }

    const counts = new Map(Array.from(recordsByDate.entries()).map(([d, records]) => [d, records.length]));

    const handleSaved = (dDate: string, records: SuccessfulApplicationRecord[]) => {
        setRecordsByDate((prev) => new Map(prev).set(dDate, records));
    };

    return (
        <div data-component="DailyEntryView" className="stack">
            <div className="row justify-between">
                <button
                    type="button"
                    onClick={() => {
                        router.push(`/entry/daily?date=${date}`);
                    }}
                    className="btn btn-ghost btn-sm"
                >
                    <FiArrowLeft aria-hidden />
                    Back to counsellor list
                </button>
                <Tooltip content="Fetch the whole month's online-paid applicants from Meritto and compare with what is saved">
                    <button
                        type="button"
                        disabled={monthFetch.fetching || monthFetch.applying}
                        onClick={() => {
                            monthFetch.fetchDiff({ month: date });
                        }}
                        className="btn btn-secondary"
                    >
                        {monthFetch.fetching ? (
                            <span className="spinner" aria-hidden />
                        ) : (
                            <FiDownloadCloud aria-hidden />
                        )}
                        {monthFetch.fetching ? "Fetching month…" : "Auto-fetch month"}
                    </button>
                </Tooltip>
            </div>
            <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[320px_1fr]">
                <div className="stack">
                    <ScopeCard counsellors={counsellors} userId={selectedUserId} date={date} />
                    <CalendarGrid date={date} counts={counts} selectedDate={selectedDate} onSelect={setSelectedDate} />
                </div>
                <div className="stack">
                    {monthFetch.error && !monthFetch.diff && (
                        <p className="error-text">
                            <FiAlertCircle aria-hidden />
                            {monthFetch.error}
                        </p>
                    )}
                    {monthFetch.diff && (
                        <SuccessfulApplicationDiffPanel
                            title={`Meritto vs saved — ${MONTH_NAMES[parseMonthDate(date).month - 1] ?? ""} ${String(parseMonthDate(date).year)}`}
                            diff={monthFetch.diff}
                            applying={monthFetch.applying}
                            error={monthFetch.error}
                            onApply={monthFetch.apply}
                            onDiscard={monthFetch.discard}
                        />
                    )}
                    {selectedDate ? (
                        <DayEditor
                            key={`${selectedDate}-${String(editorVersion)}`}
                            userId={selectedUserId}
                            date={selectedDate}
                            initialRecords={recordsByDate.get(selectedDate) ?? []}
                            onSaved={handleSaved}
                            onClose={() => {
                                setSelectedDate(null);
                            }}
                        />
                    ) : (
                        <div className="card">
                            <div className="empty">
                                <div className="title">{counsellorName}</div>
                                <p>Pick a day on the calendar to record or review its successful applications.</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
