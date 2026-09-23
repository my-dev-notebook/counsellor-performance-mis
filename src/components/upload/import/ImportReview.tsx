"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { commitImportAction, planImportAction } from "@/app/(app)/upload/actions";
import type { CommitOutcome } from "@/db/queries/imports";
import type { ImportPlan } from "@/lib/import/plan";
import {
    buildCommit,
    countByStatus,
    defaultChoices,
    defaultCounsellorEmail,
    deriveRows,
    isCommittable,
    mergeChoices,
} from "@/lib/import/decisions";
import type { Decision, ReviewChoices, RowView } from "@/lib/import/decisions";
import { MONTH_NAMES } from "@/lib/format";
import type { ParsedWorkbook } from "@/schemas/parser";
import type { AgencyChoice, ImportRowInput } from "@/schemas/import";
import { Select } from "@/components/Select";
import { ImportMappings } from "@/components/upload/import/ImportMappings";
import { ImportFilterBar, DEFAULT_ROW_FILTER, applyRowFilter } from "@/components/upload/import/ImportFilterBar";
import type { BulkActions, RowFilter } from "@/components/upload/import/ImportFilterBar";
import { ImportRowsTable } from "@/components/upload/import/ImportRowsTable";
import { ImportSummary } from "@/components/upload/import/ImportSummary";
import { ImportResultPanel } from "@/components/upload/import/ImportResultPanel";

/** "August 2026" → "2026-08"; falls back to the current month when the label is unknown. */
function monthLabelToDate(label: string): string {
    const [monthName, yearStr] = label.split(" ");
    const month = MONTH_NAMES.indexOf(monthName ?? "");
    const year = Number.parseInt(yearStr ?? "", 10);
    if (month === -1 || !Number.isFinite(year)) {
        const now = new Date();
        return `${String(now.getFullYear())}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    }
    return `${String(year)}-${String(month + 1).padStart(2, "0")}`;
}

function rowsFromWorkbook(workbook: ParsedWorkbook): ImportRowInput[] {
    return workbook.counsellors.map((c) => ({
        rowId: `${c.source.sheet}:${String(c.source.row)}`,
        name: c.name,
        team: c.team,
        agency: c.agency,
        email: c.email,
        target: c.target,
        nonNegotiable: c.nonNegotiable,
        // A blank Achieved cell is "no figure", never 0 (the parser degrades it for the preview only).
        achieved: c.achievedBlank ? null : c.achieved,
        sheet: c.source.sheet,
        row: c.source.row,
    }));
}

export function ImportReview({
    workbook,
    teamNames,
    sheetOverrides,
    onMapSheet,
}: {
    workbook: ParsedWorkbook;
    teamNames: string[];
    sheetOverrides: Record<string, string | null>;
    onMapSheet: (sheet: string, team: string | null) => void;
}) {
    const [date, setDate] = useState(() => monthLabelToDate(workbook.monthLabel));
    const [plan, setPlan] = useState<ImportPlan | null>(null);
    const [planning, setPlanning] = useState(false);
    const [planError, setPlanError] = useState<string | null>(null);
    const [choices, setChoices] = useState<ReviewChoices>({ teamChoices: {}, agencyChoices: {}, decisions: {} });
    const [filter, setFilterState] = useState<RowFilter>(DEFAULT_ROW_FILTER);
    // Rows edited under the current status filter; they stay visible until the filter changes.
    const [pinned, setPinned] = useState<ReadonlySet<string>>(() => new Set());
    const [committing, setCommitting] = useState(false);
    const [outcome, setOutcome] = useState<CommitOutcome | null>(null);
    const requestId = useRef(0);

    const rows = useMemo(() => rowsFromWorkbook(workbook), [workbook]);

    // Re-plan whenever the rows (a sheet mapping changed) or the month change.
    // Decisions already taken survive; rows new to the plan get defaults.
    useEffect(() => {
        if (rows.length === 0) return;
        const id = ++requestId.current;
        setPlanning(true);
        setPlanError(null);
        setOutcome(null);
        planImportAction({ date, rows })
            .then((next) => {
                if (id !== requestId.current) return;
                setPlan(next);
                setChoices((previous) =>
                    Object.keys(previous.decisions).length === 0 ? defaultChoices(next) : mergeChoices(previous, next),
                );
            })
            .catch(() => {
                if (id === requestId.current) setPlanError("Could not match the rows against the roster. Try again.");
            })
            .finally(() => {
                if (id === requestId.current) setPlanning(false);
            });
    }, [rows, date]);

    const views = useMemo(() => (plan ? deriveRows(plan, choices) : []), [plan, choices]);
    const counts = useMemo(() => countByStatus(views), [views]);
    const shownViews = useMemo(() => applyRowFilter(views, filter, pinned), [views, filter, pinned]);
    const committable = isCommittable(views) && !planning && !committing && outcome?.ok !== true;

    const setFilter = useCallback(
        (next: RowFilter) => {
            if (next.status !== filter.status) setPinned(new Set());
            setFilterState(next);
        },
        [filter.status],
    );
    const setDecision = useCallback((rowId: string, decision: Decision) => {
        setChoices((previous) => ({ ...previous, decisions: { ...previous.decisions, [rowId]: decision } }));
        setPinned((previous) => (previous.has(rowId) ? previous : new Set(previous).add(rowId)));
    }, []);
    const setTeamChoice = useCallback((sheetTeam: string, teamId: number) => {
        setChoices((previous) => ({ ...previous, teamChoices: { ...previous.teamChoices, [sheetTeam]: teamId } }));
    }, []);
    const setAgencyChoice = useCallback((text: string, choice: AgencyChoice) => {
        setChoices((previous) => ({ ...previous, agencyChoices: { ...previous.agencyChoices, [text]: choice } }));
    }, []);

    /** Apply `patch` to every row it returns a decision for, and pin those rows so they stay visible. */
    const bulkDecide = useCallback(
        (patch: (view: RowView) => Decision | null) => {
            const changed: [string, Decision][] = [];
            for (const view of views) {
                const next = patch(view);
                if (next) changed.push([view.row.rowId, next]);
            }
            if (changed.length === 0) return;
            setChoices((previous) => ({
                ...previous,
                decisions: { ...previous.decisions, ...Object.fromEntries(changed) },
            }));
            setPinned((previous) => {
                const next = new Set(previous);
                for (const [rowId] of changed) next.add(rowId);
                return next;
            });
        },
        [views],
    );
    const bulk: BulkActions = {
        confirmLikely: () => {
            bulkDecide((view) =>
                view.status === "confirm" && view.decision.kind === "match"
                    ? { ...view.decision, confirmed: true }
                    : null,
            );
        },
        resolveConflicts: (take, includeSnapshots) => {
            bulkDecide((view) =>
                view.status === "conflict" && view.decision.kind === "match"
                    ? {
                          ...view.decision,
                          take,
                          rewriteSnapshot:
                              take === "sheet" && includeSnapshots && (view.assessment?.differs.snapshot ?? false),
                      }
                    : null,
            );
        },
        fillDefaultEmails: () => {
            bulkDecide((view) => {
                if (view.decision.kind !== "create" || view.decision.email !== "") return null;
                const email = defaultCounsellorEmail(view.row.input.name);
                return email === "" ? null : { kind: "create", email };
            });
        },
    };

    const commit = () => {
        if (!committable) return;
        setCommitting(true);
        setOutcome(null);
        commitImportAction(buildCommit(views, date, workbook.sourceFileName))
            .then((result) => {
                setOutcome(result);
                // The month moved under us: fetch it again so the row snapshots are current.
                if (!result.ok && result.kind === "stale") {
                    setPlan(null);
                    setChoices((previous) => ({ ...previous, decisions: {} }));
                    void planImportAction({ date, rows }).then((next) => {
                        setPlan(next);
                        setChoices(defaultChoices(next));
                    });
                }
            })
            .catch(() => {
                setOutcome({
                    ok: false,
                    kind: "invalid",
                    message: "The import failed. Nothing may have been written; check the month and try again.",
                });
            })
            .finally(() => {
                setCommitting(false);
            });
    };

    const { year, month } = { year: Number(date.slice(0, 4)), month: Number(date.slice(5, 7)) };

    return (
        <section data-component="ImportReview" className="stack gap-5">
            <div className="card card-pad flex flex-wrap items-end justify-between gap-4">
                <div className="max-w-prose">
                    <h2 className="card-title">Import {workbook.sourceFileName}</h2>
                    <p className="card-meta mt-1">
                        Confirm the month, map anything the file could not place, resolve each flagged row, then commit.
                        The workbook&apos;s monthly total becomes the figure of record for the month, even where the
                        daily successful applications add up differently.
                    </p>
                </div>
                <div className="flex flex-wrap items-end gap-3">
                    <label className="field w-36">
                        <span className="label">Month</span>
                        <Select
                            size="sm"
                            value={String(month)}
                            disabled={outcome?.ok === true}
                            onChange={(value) => {
                                setDate(`${String(year)}-${value.padStart(2, "0")}`);
                            }}
                            options={MONTH_NAMES.map((name, i) => ({ value: String(i + 1), label: name }))}
                        />
                    </label>
                    <label className="field w-24">
                        <span className="label">Year</span>
                        <input
                            type="number"
                            value={year}
                            disabled={outcome?.ok === true}
                            onChange={(e) => {
                                const y = Number.parseInt(e.target.value, 10);
                                if (Number.isFinite(y) && y >= 2000 && y <= 2100) {
                                    setDate(`${String(y)}-${String(month).padStart(2, "0")}`);
                                }
                            }}
                            className="input input-sm input-num"
                        />
                    </label>
                </div>
            </div>

            {planError && <p className="error-text">{planError}</p>}

            <ImportMappings
                workbook={workbook}
                plan={plan}
                teamNames={teamNames}
                sheetOverrides={sheetOverrides}
                choices={choices}
                onMapSheet={onMapSheet}
                onTeamChoice={setTeamChoice}
                onAgencyChoice={setAgencyChoice}
            />

            {outcome?.ok === true ? (
                <ImportResultPanel result={outcome.result} date={date} />
            ) : (
                <ImportSummary
                    counts={counts}
                    total={views.length}
                    planning={planning}
                    committing={committing}
                    committable={committable}
                    bulk={bulk}
                    onCommit={commit}
                    date={date}
                    error={outcome && !outcome.ok ? outcome : null}
                />
            )}

            {plan && (
                <ImportFilterBar
                    counts={counts}
                    total={views.length}
                    shown={shownViews.length}
                    filter={filter}
                    onChange={setFilter}
                    bulk={bulk}
                    locked={outcome?.ok === true || committing}
                />
            )}
            {plan && (
                <ImportRowsTable
                    plan={plan}
                    views={shownViews}
                    locked={outcome?.ok === true || committing}
                    onDecision={setDecision}
                />
            )}
        </section>
    );
}
