"use client";

import { useMemo } from "react";
import type { SyntheticEvent } from "react";
import { FiMinus, FiPlus } from "react-icons/fi";
import type { ImportPlan, RosterUser } from "@/lib/import/plan";
import type { Decision, RowStatus, RowView } from "@/lib/import/decisions";
import type { Flag } from "@/lib/import/assess";
import { formatInt } from "@/lib/format";
import { DataTable } from "@/components/DataTable";
import type { Column, RowState } from "@/components/DataTable";
import { Select } from "@/components/Select";
import { STATUS_STYLES } from "@/components/upload/import/status-styles";

const FLAG_STYLES: Record<Flag["level"], string> = {
    info: "bg-info/15 text-info ring-info/30",
    warn: "bg-warning/15 text-warning ring-warning/30",
};

const SMALL_BUTTON =
    "rounded-md border border-input bg-background px-2 py-1 text-xs font-medium text-foreground hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50";
const SMALL_PRIMARY =
    "rounded-md bg-primary px-2 py-1 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50";
const INPUT = "rounded-md border border-input bg-background px-2 py-1 text-sm text-foreground";

function StatusChip({ status }: { status: RowStatus }) {
    const style = STATUS_STYLES[status];
    return (
        <span
            data-component="StatusChip"
            className={`inline-flex items-center rounded-full px-1.5 py-px text-[11px] font-semibold whitespace-nowrap ring-1 ring-inset ${style.className}`}
        >
            {style.label}
        </span>
    );
}

/** Git-style +/− toggle for the row's detail panel; the whole row is clickable too, this just makes it discoverable. */
function ExpandToggle({ state, label }: { state: RowState; label: string }) {
    const Icon = state.expanded ? FiMinus : FiPlus;
    return (
        <button
            data-component="ExpandToggle"
            type="button"
            aria-expanded={state.expanded}
            aria-label={`${state.expanded ? "Hide" : "Show"} details for ${label}`}
            onClick={(e) => {
                e.stopPropagation();
                state.toggle();
            }}
            className="inline-flex h-6 w-6 items-center justify-center rounded border border-border text-muted-foreground hover:bg-accent hover:text-foreground"
        >
            <Icon className="h-3.5 w-3.5" aria-hidden />
        </button>
    );
}

/** "db → sheet" for a figure, highlighted when the two differ. */
function Figure({
    db,
    sheet,
    differs,
    note,
}: {
    db: number | null | undefined;
    sheet: number | null;
    differs: boolean;
    note?: string;
}) {
    if (db === undefined) return <span data-component="Figure">{formatInt(sheet)}</span>;
    return (
        <span data-component="Figure" className={differs ? "font-medium text-warning" : ""}>
            {formatInt(db)}
            {note && <span className="text-xs text-muted-foreground"> {note}</span>}
            <span className="text-muted-foreground"> → </span>
            {formatInt(sheet)}
        </span>
    );
}

function matchDecision(userId: number, previous: Decision): Decision {
    const keep = previous.kind === "match" && previous.userId === userId ? previous : null;
    return {
        kind: "match",
        userId,
        confirmed: true,
        take: keep?.take ?? null,
        rewriteSnapshot: keep?.rewriteSnapshot ?? false,
        updateRoster: keep?.updateRoster ?? false,
    };
}

function userLabel(user: RosterUser, score?: number): string {
    const team = user.teamName ?? "no team";
    const parts = [user.name, team];
    if (score !== undefined) parts.push(`${String(Math.round(score * 100))}%`);
    if (!user.isActive) parts.push("inactive");
    return parts.join(" · ");
}

export function ImportRowsTable({
    plan,
    views,
    locked,
    onDecision,
}: {
    plan: ImportPlan;
    views: RowView[];
    locked: boolean;
    onDecision: (rowId: string, decision: Decision) => void;
}) {
    const rosterById = useMemo(() => new Map(plan.context.roster.map((user) => [user.id, user])), [plan]);
    const rosterOptions = useMemo(
        () =>
            [...plan.context.roster]
                .sort((a, b) => a.name.localeCompare(b.name))
                .map((user) => ({ value: String(user.id), label: userLabel(user) })),
        [plan],
    );

    const columns: Column<RowView>[] = [
        {
            key: "expand",
            header: "",
            srLabel: "Details",
            className: "w-8 pr-0",
            render: (v, state) => <ExpandToggle state={state} label={v.row.input.name} />,
        },
        {
            key: "name",
            header: "Name in sheet",
            render: (v) => (
                <div className="min-w-0">
                    <span className="font-medium text-foreground">{v.row.input.name}</span>
                    <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
                        <StatusChip status={v.status} />
                        <span className="whitespace-nowrap">
                            {v.row.input.sheet} · r{String(v.row.input.row)}
                        </span>
                        {v.row.input.email && <span className="break-all">{v.row.input.email}</span>}
                    </div>
                </div>
            ),
        },
        {
            key: "match",
            header: "Roster user",
            render: (v) => {
                const candidateIds = new Set(v.row.match.candidates.map((c) => c.userId));
                const options = [
                    { value: "__create", label: "Create new user" },
                    { value: "__skip", label: "Skip this row" },
                    ...v.row.match.candidates.flatMap((c) => {
                        const user = rosterById.get(c.userId);
                        return user ? [{ value: String(user.id), label: `★ ${userLabel(user, c.score)}` }] : [];
                    }),
                    ...rosterOptions.filter((option) => !candidateIds.has(Number(option.value))),
                ];
                const value =
                    v.decision.kind === "match"
                        ? String(v.decision.userId)
                        : v.decision.kind === "create"
                          ? "__create"
                          : v.decision.kind === "skip"
                            ? "__skip"
                            : "";
                return (
                    <div
                        onClick={(e) => {
                            e.stopPropagation();
                        }}
                    >
                        <Select
                            size="sm"
                            aria-label={`Roster user for ${v.row.input.name}`}
                            placeholder="Choose…"
                            disabled={locked}
                            value={value}
                            onChange={(next) => {
                                if (next === "__create")
                                    onDecision(v.row.rowId, { kind: "create", email: v.row.input.email ?? "" });
                                else if (next === "__skip") onDecision(v.row.rowId, { kind: "skip" });
                                else if (next !== "") onDecision(v.row.rowId, matchDecision(Number(next), v.decision));
                            }}
                            options={options}
                        />
                    </div>
                );
            },
        },
        {
            key: "overall",
            header: "Overall",
            className: "text-right whitespace-nowrap",
            render: (v) => (
                <Figure
                    db={v.assessment?.existing ? v.assessment.existing.overall : undefined}
                    sheet={
                        v.assessment?.sheet.overall ??
                        (v.row.input.target === null ? null : Math.round(v.row.input.target))
                    }
                    differs={
                        v.assessment?.existing ? v.assessment.existing.overall !== v.assessment.sheet.overall : false
                    }
                />
            ),
        },
        {
            key: "nonNegotiable",
            header: "Non-neg.",
            className: "text-right whitespace-nowrap",
            render: (v) => (
                <Figure
                    db={v.assessment?.existing ? v.assessment.existing.nonNegotiable : undefined}
                    sheet={
                        v.assessment?.sheet.nonNegotiable ??
                        (v.row.input.nonNegotiable === null ? null : Math.round(v.row.input.nonNegotiable))
                    }
                    differs={
                        v.assessment?.existing
                            ? v.assessment.existing.nonNegotiable !== v.assessment.sheet.nonNegotiable
                            : false
                    }
                />
            ),
        },
        {
            key: "achieved",
            header: "Achieved",
            className: "text-right whitespace-nowrap",
            render: (v) => (
                <Figure
                    db={v.assessment?.existing ? v.assessment.dbAchieved : undefined}
                    sheet={
                        v.assessment?.sheet.achieved ??
                        (v.row.input.achieved === null ? null : Math.round(v.row.input.achieved))
                    }
                    differs={v.assessment?.differs.achieved ?? false}
                    note={v.assessment?.existing && v.assessment.existing.achieved === null ? "(live)" : undefined}
                />
            ),
        },
        {
            key: "action",
            header: "",
            srLabel: "Resolve",
            render: (v) => <RowAction view={v} locked={locked} onDecision={onDecision} />,
        },
    ];

    return (
        <div data-component="ImportRowsTable">
            <DataTable
                columns={columns}
                rows={views}
                rowKey={(v) => v.row.rowId}
                emptyMessage="No rows match the current filter."
                renderExpanded={(v) => (
                    <RowDetails view={v} locked={locked} rosterById={rosterById} onDecision={onDecision} />
                )}
                rowClassName={(v) => (v.needsAttention ? "bg-warning/5" : "")}
                panelClassName="px-4 py-4 sm:px-6"
            />
        </div>
    );
}

/** The one control a row most needs, inline; everything else is in the expanded panel. */
function RowAction({
    view,
    locked,
    onDecision,
}: {
    view: RowView;
    locked: boolean;
    onDecision: (rowId: string, decision: Decision) => void;
}) {
    const { decision, status } = view;
    const stop = (e: SyntheticEvent) => {
        e.stopPropagation();
    };
    if (decision.kind === "create") {
        return (
            <div data-component="RowAction" onClick={stop}>
                <input
                    type="email"
                    placeholder="Login email (required)"
                    value={decision.email}
                    disabled={locked}
                    onChange={(e) => {
                        onDecision(view.row.rowId, { kind: "create", email: e.target.value });
                    }}
                    className={`${INPUT} w-48`}
                />
            </div>
        );
    }
    if (decision.kind === "match" && status === "confirm") {
        return (
            <div data-component="RowAction" onClick={stop}>
                <button
                    type="button"
                    disabled={locked}
                    onClick={() => {
                        onDecision(view.row.rowId, { ...decision, confirmed: true });
                    }}
                    className={SMALL_PRIMARY}
                >
                    Confirm
                </button>
            </div>
        );
    }
    if (
        decision.kind === "match" &&
        (status === "conflict" || status === "update" || (status === "no-change" && decision.take !== null))
    ) {
        const choose = (take: "sheet" | "keep") => {
            onDecision(view.row.rowId, {
                ...decision,
                take,
                rewriteSnapshot: take === "sheet" && (view.assessment?.differs.snapshot ?? false),
            });
        };
        return (
            <div data-component="RowAction" className="flex items-center gap-1" onClick={stop}>
                <button
                    type="button"
                    disabled={locked}
                    onClick={() => {
                        choose("keep");
                    }}
                    className={decision.take === "keep" ? SMALL_PRIMARY : SMALL_BUTTON}
                >
                    Keep DB
                </button>
                <button
                    type="button"
                    disabled={locked}
                    onClick={() => {
                        choose("sheet");
                    }}
                    className={decision.take === "sheet" ? SMALL_PRIMARY : SMALL_BUTTON}
                >
                    Take sheet
                </button>
            </div>
        );
    }
    return <span data-component="RowAction" className="text-xs text-muted-foreground" />;
}

function RowDetails({
    view,
    locked,
    rosterById,
    onDecision,
}: {
    view: RowView;
    locked: boolean;
    rosterById: Map<number, RosterUser>;
    onDecision: (rowId: string, decision: Decision) => void;
}) {
    const { decision, assessment, row } = view;
    const rosterDiffers =
        assessment?.flags.some((f) => f.code === "ROSTER_TEAM_DIFFERS" || f.code === "ROSTER_AGENCY_DIFFERS") ?? false;
    const ambiguousReason = row.match.kind === "ambiguous" ? row.match.reason : null;

    return (
        <div data-component="RowDetails" className="grid gap-4 text-sm md:grid-cols-2">
            <div className="space-y-3">
                {ambiguousReason && <p className="text-destructive">{ambiguousReason}</p>}
                {assessment && assessment.flags.length > 0 && (
                    <ul className="space-y-1.5">
                        {assessment.flags.map((flag) => (
                            <li key={flag.code} className="flex items-start gap-2">
                                <span
                                    className={`mt-0.5 inline-flex shrink-0 items-center rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase ring-1 ring-inset ${FLAG_STYLES[flag.level]}`}
                                >
                                    {flag.level}
                                </span>
                                <span className="text-foreground">{flag.message}</span>
                            </li>
                        ))}
                    </ul>
                )}
                {assessment && assessment.flags.length === 0 && decision.kind === "match" && (
                    <p className="text-muted-foreground">Name, team and agency all agree with the roster.</p>
                )}
                {row.match.candidates.length > 0 && (
                    <div>
                        <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                            Similar roster users
                        </p>
                        <ul className="mt-1 space-y-1">
                            {row.match.candidates.map((c) => {
                                const user = rosterById.get(c.userId);
                                if (!user) return null;
                                const selected = decision.kind === "match" && decision.userId === user.id;
                                return (
                                    <li key={c.userId} className="flex items-center justify-between gap-2">
                                        <span className={selected ? "font-medium text-foreground" : "text-foreground"}>
                                            {userLabel(user, c.score)}
                                        </span>
                                        {!selected && (
                                            <button
                                                type="button"
                                                disabled={locked}
                                                onClick={() => {
                                                    onDecision(row.rowId, matchDecision(user.id, decision));
                                                }}
                                                className={SMALL_BUTTON}
                                            >
                                                Use this user
                                            </button>
                                        )}
                                    </li>
                                );
                            })}
                        </ul>
                    </div>
                )}
                {decision.kind === "create" && (
                    <p className="text-muted-foreground">
                        A counsellor account will be created with the default password and no Meritto id. Add the
                        Meritto id on the Users page before using daily auto-fetch.
                    </p>
                )}
            </div>

            {decision.kind === "match" && assessment && (
                <div className="space-y-3">
                    {assessment.existing && (
                        <p className="text-muted-foreground">
                            This month is already recorded for {assessment.user.name}
                            {assessment.existing.achievedSource === "import" &&
                                " (achieved came from an earlier import)"}
                            {assessment.existing.achievedSource === "manual" && " (achieved was set by hand)"}.
                        </p>
                    )}
                    {assessment.differs.snapshot && assessment.existing && (
                        <label className="flex items-start gap-2 text-foreground">
                            <input
                                type="checkbox"
                                className="mt-0.5"
                                disabled={locked || decision.take !== "sheet"}
                                checked={decision.take === "sheet" && decision.rewriteSnapshot}
                                onChange={(e) => {
                                    onDecision(row.rowId, { ...decision, rewriteSnapshot: e.target.checked });
                                }}
                            />
                            <span>
                                Rewrite the month&apos;s team/agency snapshot to the sheet&apos;s
                                {decision.take !== "sheet" && (
                                    <span className="text-muted-foreground">
                                        {" "}
                                        (choose &quot;Take sheet&quot; first)
                                    </span>
                                )}
                            </span>
                        </label>
                    )}
                    {rosterDiffers && (
                        <label className="flex items-start gap-2 text-foreground">
                            <input
                                type="checkbox"
                                className="mt-0.5"
                                disabled={locked}
                                checked={decision.updateRoster}
                                onChange={(e) => {
                                    onDecision(row.rowId, { ...decision, updateRoster: e.target.checked });
                                }}
                            />
                            <span>
                                Also update the roster: move {assessment.user.name} to the sheet&apos;s team/agency
                            </span>
                        </label>
                    )}
                    {!assessment.existing && (
                        <p className="text-muted-foreground">
                            No entry exists for this month yet; the sheet&apos;s figures will be recorded as-is.
                        </p>
                    )}
                </div>
            )}
        </div>
    );
}
