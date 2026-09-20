"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { AdmissionRecord, AdmissionRow, UserRow } from "@/db/types";
import { MONTH_NAMES } from "@/lib/format";
import { cellTone } from "@/lib/admissions/calendar-tone";
import { Select } from "@/components/Select";
import { Tooltip } from "@/components/Tooltip";
import {
    saveDailyAdmissionAction,
    fetchAdmissionDiffAction,
    applyFetchedAdmissionsAction,
} from "@/app/(app)/entry/actions";
import type { AdmissionFetchDiff, FetchWindow } from "@/app/(app)/entry/actions";
import { loadNpfSession } from "@/lib/nopaperformsSession";
import { AdmissionDiffPanel } from "@/components/entry/AdmissionDiffPanel";
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
    { key: "name", header: "Counsellor", className: "font-medium text-foreground", render: (c) => c.name },
    { key: "team", header: "Team", className: "text-muted-foreground", render: (c) => c.teamName ?? "—" },
    { key: "agency", header: "Agency", className: "text-muted-foreground", render: (c) => c.agencyName ?? "—" },
];

function parseMonthDate(date: string): { year: number; month: number } {
    const [yearStr, monthStr] = date.split("-");
    return { year: Number.parseInt(yearStr ?? "", 10), month: Number.parseInt(monthStr ?? "", 10) };
}

function toMonthDate(year: number, month: number): string {
    return `${String(year)}-${String(month).padStart(2, "0")}`;
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
        <div data-component="CounsellorPicker" className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <input
                    placeholder="Search by name, team, agency…"
                    value={search}
                    onChange={(e) => {
                        setSearch(e.target.value);
                    }}
                    className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm text-foreground sm:w-80"
                />
                <Tooltip content="Fetch this month from Meritto for every counsellor listed here and compare with what is saved">
                    <button
                        type="button"
                        onClick={() => {
                            router.push(`/entry/fetch?date=${date}`);
                        }}
                        className="rounded-md border border-input px-2 py-1 text-xs font-medium text-muted-foreground hover:bg-accent"
                    >
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
            />
        </div>
    );
}

function MonthNav({ date, userId }: { date: string; userId: number }) {
    const router = useRouter();
    const { year, month } = parseMonthDate(date);

    const navigate = (y: number, m: number) => {
        router.push(`/entry/daily?userId=${String(userId)}&date=${toMonthDate(y, m)}`);
    };

    return (
        <div data-component="MonthNav" className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-1.5 text-sm text-muted-foreground">
                Month
                <Select
                    size="sm"
                    value={String(month)}
                    onChange={(value) => {
                        navigate(year, Number(value));
                    }}
                    options={MONTH_NAMES.map((name, i) => ({ value: String(i + 1), label: name }))}
                />
            </label>
            <label className="flex items-center gap-1.5 text-sm text-muted-foreground">
                Year
                <input
                    type="number"
                    value={year}
                    onChange={(e) => {
                        const y = Number.parseInt(e.target.value, 10);
                        if (Number.isFinite(y)) navigate(y, month);
                    }}
                    className="w-24 rounded-md border border-input bg-background px-2 py-1 text-sm text-foreground"
                />
            </label>
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

    return (
        <div data-component="CalendarGrid" className="w-fit rounded-lg border border-border bg-card p-3">
            <div className="grid grid-cols-7 gap-1.5">
                {WEEKDAY_LABELS.map((w) => (
                    <div key={w} className="w-12 pb-1 text-center text-[11px] font-semibold text-muted-foreground">
                        {w}
                    </div>
                ))}
                {leadingBlanks.map((i) => (
                    <div key={`blank-${String(i)}`} />
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
                            aria-pressed={selected}
                            aria-label={`${dDate}: ${String(count)} applications`}
                            className={`flex h-12 w-12 flex-col items-center justify-center rounded-md border text-sm leading-none transition-colors hover:border-primary/60 ${
                                selected ? "border-primary ring-1 ring-primary" : "border-border"
                            } ${cellTone(count, maxCount)}`}
                        >
                            <span className="text-xs">{day}</span>
                            {count > 0 && <span className="mt-1 text-base font-semibold">{count}</span>}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}

/**
 * The grid's in-progress mirror of `AdmissionRecord`, with every field a string.
 * `AdmissionRecord` types the two ids as numbers (they're integer columns), but
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

function toDraft(r: AdmissionRecord): DraftRecord {
    return {
        applicationNumber: r.applicationNumber,
        applicantUserId: String(r.applicantUserId),
        applicantName: r.applicantName,
        formId: String(r.formId),
        formName: r.formName,
    };
}

/**
 * Every `admissions` column is notNull, so a row is either complete or it isn't
 * saved — returns null for an incomplete draft rather than writing a partial
 * record the DB would reject anyway.
 */
function toRecord(d: DraftRecord): AdmissionRecord | null {
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
function useAdmissionFetch(userId: number, onApplied: (days: { date: string; records: AdmissionRecord[] }[]) => void) {
    const [diff, setDiff] = useState<AdmissionFetchDiff | null>(null);
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
        void fetchAdmissionDiffAction(session.url, session.headers, userId, range)
            .then(setDiff)
            .catch(() => {
                setError("Auto-fetch failed. Check the saved session is still valid and the counsellor has a Meritto id.");
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
        void applyFetchedAdmissionsAction({ userId, days })
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
    initialRecords: AdmissionRecord[];
    onSaved: (dDate: string, records: AdmissionRecord[]) => void;
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
    const autoFetch = useAdmissionFetch(userId, (days) => {
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
        const valid = toSave as AdmissionRecord[];
        startTransition(async () => {
            try {
                await saveDailyAdmissionAction(userId, date, valid);
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
        <div data-component="DayEditor" className="rounded-lg border border-border bg-card px-4 py-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold text-foreground">
                    Day {day} — {filledCount} admission{filledCount === 1 ? "" : "s"}
                </p>
                <div className="flex items-center gap-1">
                    <Tooltip content="Fetch this day's online-paid applicants from Meritto and compare with what is saved">
                        <button
                            type="button"
                            disabled={autoFetch.fetching || autoFetch.applying}
                            onClick={() => {
                                autoFetch.fetchDiff({ day: date });
                            }}
                            className="rounded-md border border-input px-2 py-1 text-xs font-medium text-muted-foreground hover:bg-accent disabled:opacity-40"
                        >
                            {autoFetch.fetching ? "Fetching…" : "Auto-fetch"}
                        </button>
                    </Tooltip>
                    <Tooltip content="Undo (Ctrl+Z)">
                        <button
                            type="button"
                            disabled={past.length === 0}
                            onClick={undo}
                            className="rounded-md border border-input px-2 py-1 text-xs font-medium text-muted-foreground hover:bg-accent disabled:opacity-40"
                        >
                            Undo
                        </button>
                    </Tooltip>
                    <Tooltip content="Redo (Ctrl+Y)">
                        <button
                            type="button"
                            disabled={future.length === 0}
                            onClick={redo}
                            className="rounded-md border border-input px-2 py-1 text-xs font-medium text-muted-foreground hover:bg-accent disabled:opacity-40"
                        >
                            Redo
                        </button>
                    </Tooltip>
                    <Tooltip content="Close day editor">
                        <button
                            type="button"
                            onClick={onClose}
                            aria-label="Close day editor"
                            className="rounded-md border border-input px-2 py-1 text-xs font-medium text-muted-foreground hover:bg-accent"
                        >
                            ✕
                        </button>
                    </Tooltip>
                </div>
            </div>
            {autoFetch.error && !autoFetch.diff && <p className="mt-2 text-xs text-destructive">{autoFetch.error}</p>}
            {autoFetch.diff && (
                <div className="mt-3">
                    <AdmissionDiffPanel
                        title={`Meritto vs saved — day ${String(day)}`}
                        diff={autoFetch.diff}
                        applying={autoFetch.applying}
                        error={autoFetch.error}
                        onApply={autoFetch.apply}
                        onDiscard={autoFetch.discard}
                    />
                </div>
            )}
            <div className="mt-3 overflow-x-auto">
                <table className="min-w-full divide-y divide-border text-sm">
                    <thead>
                        <tr>
                            {["Application no", "Applicant ID", "Applicant name", "Form ID", "Form name", ""].map(
                                (h) => (
                                    <th
                                        key={h}
                                        className="px-2 py-1.5 text-left text-xs font-semibold tracking-wide text-muted-foreground uppercase"
                                    >
                                        {h}
                                    </th>
                                ),
                            )}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                        {records.map((record, index) => {
                            const blank = isEmptyDraft(record);
                            const isSentinel = blank && index === records.length - 1;
                            return (
                                <tr key={index}>
                                    <td className="px-2 py-1">
                                        <input
                                            value={record.applicationNumber}
                                            placeholder="Application no"
                                            onChange={(e) => {
                                                updateRecord(index, "applicationNumber", e.target.value);
                                            }}
                                            className="w-full rounded-md border border-input bg-background px-2 py-1 text-sm text-foreground"
                                        />
                                    </td>
                                    <td className="px-2 py-1">
                                        <input
                                            value={record.applicantUserId}
                                            inputMode="numeric"
                                            placeholder="Applicant ID"
                                            onChange={(e) => {
                                                updateRecord(index, "applicantUserId", e.target.value);
                                            }}
                                            className="w-full rounded-md border border-input bg-background px-2 py-1 text-sm text-foreground"
                                        />
                                    </td>
                                    <td className="px-2 py-1">
                                        <input
                                            value={record.applicantName}
                                            placeholder="Applicant name"
                                            onChange={(e) => {
                                                updateRecord(index, "applicantName", e.target.value);
                                            }}
                                            className="w-full rounded-md border border-input bg-background px-2 py-1 text-sm text-foreground"
                                        />
                                    </td>
                                    <td className="px-2 py-1">
                                        <input
                                            value={record.formId}
                                            inputMode="numeric"
                                            placeholder="Form ID"
                                            onChange={(e) => {
                                                updateRecord(index, "formId", e.target.value);
                                            }}
                                            className="w-full rounded-md border border-input bg-background px-2 py-1 text-sm text-foreground"
                                        />
                                    </td>
                                    <td className="px-2 py-1">
                                        <input
                                            value={record.formName}
                                            placeholder="Form name"
                                            onChange={(e) => {
                                                updateRecord(index, "formName", e.target.value);
                                            }}
                                            className="w-full rounded-md border border-input bg-background px-2 py-1 text-sm text-foreground"
                                        />
                                    </td>
                                    <td className="px-2 py-1">
                                        {!isSentinel && (
                                            <Tooltip content="Delete row">
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        removeRecord(index);
                                                    }}
                                                    className="rounded-md border border-input px-2 py-1 text-xs font-medium text-muted-foreground hover:bg-accent"
                                                >
                                                    Delete
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
            <div className="mt-3 flex flex-wrap items-center gap-3">
                <button
                    type="button"
                    disabled={pending}
                    onClick={save}
                    className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                >
                    {pending ? "Saving…" : "Save day"}
                </button>
                {!saved && !pending && <span className="text-xs text-muted-foreground">Unsaved changes</span>}
                {error && <p className="text-xs text-destructive">{error}</p>}
            </div>
        </div>
    );
}

export function DailyEntryView({
    date,
    counsellors,
    selectedUserId,
    counsellorName,
    admissions,
}: {
    date: string;
    counsellors: UserRow[];
    selectedUserId: number | null;
    counsellorName: string | null;
    admissions: AdmissionRow[];
}) {
    const router = useRouter();
    const [selectedDate, setSelectedDate] = useState<string | null>(null);
    // Bumped when a month apply rewrites days behind the open editor, so it
    // remounts from the new rows instead of keeping a stale draft.
    const [editorVersion, setEditorVersion] = useState(0);
    // `admissions` arrives as one row per admission; the calendar grid and the
    // day editor both work per-day, so group once on mount.
    const [recordsByDate, setRecordsByDate] = useState<Map<string, AdmissionRecord[]>>(() => {
        const byDate = new Map<string, AdmissionRecord[]>();
        for (const row of admissions) {
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

    const monthFetch = useAdmissionFetch(selectedUserId ?? 0, (days) => {
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

    const handleSaved = (dDate: string, records: AdmissionRecord[]) => {
        setRecordsByDate((prev) => new Map(prev).set(dDate, records));
    };

    return (
        <div data-component="DailyEntryView" className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <button
                        type="button"
                        onClick={() => {
                            router.push(`/entry/daily?date=${date}`);
                        }}
                        className="text-xs font-medium text-muted-foreground hover:text-foreground"
                    >
                        ← Back to counsellor list
                    </button>
                    <h2 className="mt-1 text-base font-semibold text-foreground">{counsellorName}</h2>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    <MonthNav date={date} userId={selectedUserId} />
                    <Tooltip content="Fetch the whole month's online-paid applicants from Meritto and compare with what is saved">
                        <button
                            type="button"
                            disabled={monthFetch.fetching || monthFetch.applying}
                            onClick={() => {
                                monthFetch.fetchDiff({ month: date });
                            }}
                            className="rounded-md border border-input px-2 py-1 text-xs font-medium text-muted-foreground hover:bg-accent disabled:opacity-40"
                        >
                            {monthFetch.fetching ? "Fetching month…" : "Auto-fetch month"}
                        </button>
                    </Tooltip>
                </div>
            </div>
            <CalendarGrid date={date} counts={counts} selectedDate={selectedDate} onSelect={setSelectedDate} />
            {monthFetch.error && !monthFetch.diff && <p className="text-xs text-destructive">{monthFetch.error}</p>}
            {monthFetch.diff && (
                <AdmissionDiffPanel
                    title={`Meritto vs saved — ${MONTH_NAMES[parseMonthDate(date).month - 1] ?? ""} ${String(parseMonthDate(date).year)}`}
                    diff={monthFetch.diff}
                    applying={monthFetch.applying}
                    error={monthFetch.error}
                    onApply={monthFetch.apply}
                    onDiscard={monthFetch.discard}
                />
            )}
            {selectedDate && (
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
            )}
        </div>
    );
}
