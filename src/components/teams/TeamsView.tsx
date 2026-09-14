"use client";

import { useState, useTransition } from "react";
import type { TeamWithUsage } from "@/db/queries/teams";
import { RowMenu } from "@/components/RowMenu";
import { Select } from "@/components/Select";
import type { MenuItem } from "@/components/RowMenu";
import { DataTable } from "@/components/DataTable";
import type { Column, RowState } from "@/components/DataTable";
import { roleLabel } from "@/lib/auth/permissions";
import { createTeamAction, deleteTeamAction, updateTeamAction } from "@/app/(app)/teams/actions";

/** An active user who could be appointed as a leader. */
export interface LeaderCandidate {
    id: number;
    name: string;
    roleName: string;
    teamId: number | null;
    teamName: string | null;
}

function errorMessage(error: unknown, fallback: string): string {
    return error instanceof Error && error.message !== "" ? error.message : fallback;
}

const inputClass = "rounded-md border border-input bg-background px-2 py-1 text-sm text-foreground";
const primaryButton =
    "rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50";
const ghostButton =
    "rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground";

function AddTeamForm() {
    const [name, setName] = useState("");
    const [pending, startTransition] = useTransition();
    const [error, setError] = useState<string | null>(null);

    const submit = () => {
        if (name.trim() === "") {
            setError("Name is required.");
            return;
        }
        setError(null);
        startTransition(async () => {
            try {
                await createTeamAction(name);
                setName("");
            } catch (e) {
                setError(errorMessage(e, "Failed to add team (name may already exist)."));
            }
        });
    };

    return (
        <form
            data-component="AddTeamForm"
            onSubmit={(e) => {
                e.preventDefault();
                submit();
            }}
            className="flex flex-wrap items-end gap-3 rounded-lg border border-border bg-card p-4"
        >
            <label className="flex flex-col text-xs font-medium text-muted-foreground">
                New team name
                <input
                    value={name}
                    onChange={(e) => {
                        setName(e.target.value);
                    }}
                    className={`mt-1 ${inputClass}`}
                />
            </label>
            <button type="submit" disabled={pending} className={primaryButton}>
                {pending ? "Adding…" : "Add"}
            </button>
            {error && <p className="text-xs text-destructive">{error}</p>}
        </form>
    );
}

const fieldLabel = "flex flex-col gap-1 text-xs font-medium text-muted-foreground";
const panelInput = "w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground";

/** The full-width edit form shown under a clicked row. Mounted fresh each time a row opens. */
function TeamEditPanel({
    team,
    candidates,
    onClose,
}: {
    team: TeamWithUsage;
    candidates: LeaderCandidate[];
    onClose: () => void;
}) {
    const [name, setName] = useState(team.name);
    const [leaderId, setLeaderId] = useState<number | "">(team.leaders[0]?.id ?? "");
    const [pending, startTransition] = useTransition();
    const [error, setError] = useState<string | null>(null);

    // Current leaders first so the select can show them, then everyone else eligible.
    const leaderOptions = [
        ...team.leaders.map((l) => ({ id: l.id, name: l.name, note: "" })),
        ...candidates
            .filter((c) => !team.leaders.some((l) => l.id === c.id))
            .map((c) => ({
                id: c.id,
                name: c.name,
                note: `${roleLabel(c.roleName)}${c.teamId !== null && c.teamId !== team.id ? ` · ${c.teamName ?? "other team"}` : ""}`,
            })),
    ];

    const save = () => {
        if (name.trim() === "") {
            setError("Name is required.");
            return;
        }
        const newLeaderId = leaderId === "" ? null : leaderId;
        const leaderChanged =
            newLeaderId === null ? team.leaders.length > 0 : !team.leaders.some((l) => l.id === newLeaderId);
        if (leaderChanged) {
            const previous = team.leaders.map((l) => l.name).join(", ");
            const next = leaderOptions.find((o) => o.id === newLeaderId)?.name;
            const message =
                next === undefined
                    ? `Remove ${previous} as leader of ${team.name}? They become a counsellor on the team.`
                    : previous === ""
                      ? `Appoint ${next} as leader of ${team.name}?`
                      : `Replace ${previous} with ${next} as leader of ${team.name}? ${previous} becomes a counsellor on the team.`;
            if (!confirm(message)) return;
        }
        setError(null);
        startTransition(async () => {
            try {
                await updateTeamAction(team.id, { name, leaderId: newLeaderId });
                onClose();
            } catch (e) {
                setError(errorMessage(e, "Failed to save team."));
            }
        });
    };

    return (
        <form
            data-component="TeamEditPanel"
            onSubmit={(e) => {
                e.preventDefault();
                save();
            }}
            onKeyDown={(e) => {
                if (e.key === "Escape") onClose();
            }}
            className="space-y-5"
        >
            <p className="text-sm font-semibold text-foreground">Edit {team.name}</p>
            <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
                <label className={fieldLabel}>
                    Name
                    <input
                        autoFocus
                        value={name}
                        onChange={(e) => {
                            setName(e.target.value);
                        }}
                        className={panelInput}
                    />
                </label>
                <label className={fieldLabel}>
                    Leader
                    <Select
                        className="w-full"
                        value={String(leaderId)}
                        onChange={(value) => {
                            setLeaderId(value === "" ? "" : Number(value));
                        }}
                        options={[
                            { value: "", label: "No leader" },
                            ...leaderOptions.map((o) => ({
                                value: String(o.id),
                                label: o.note === "" ? o.name : `${o.name} (${o.note})`,
                            })),
                        ]}
                    />
                </label>
            </div>
            {team.leaders.length > 1 && (
                <p className="text-xs text-muted-foreground">
                    This team has {team.leaders.length} leaders; saving keeps only the one selected.
                </p>
            )}
            {error && <p className="text-xs text-destructive">{error}</p>}
            <div className="flex items-center gap-3 border-t border-border pt-4">
                <button type="submit" disabled={pending} className={primaryButton}>
                    {pending ? "Saving…" : "Save changes"}
                </button>
                <button type="button" onClick={onClose} className={ghostButton}>
                    Cancel
                </button>
            </div>
        </form>
    );
}

/** The ⋯ menu in a team's actions cell. */
function TeamActions({ team, state }: { team: TeamWithUsage; state: RowState }) {
    const [pending, startTransition] = useTransition();
    const deletable = team.memberCount === 0 && team.historyCount === 0;

    const menuItems: MenuItem[] = [
        { label: state.expanded ? "Close" : "Edit", onSelect: state.toggle },
        {
            label: deletable ? "Delete" : team.memberCount > 0 ? "Delete (has members)" : "Delete (has history)",
            destructive: true,
            disabled: pending || !deletable,
            onSelect: () => {
                if (!confirm(`Delete team "${team.name}"? This cannot be undone.`)) return;
                startTransition(async () => {
                    try {
                        await deleteTeamAction(team.id);
                    } catch (e) {
                        alert(errorMessage(e, "Failed to delete team."));
                    }
                });
            },
        },
    ];

    return (
        <div data-component="TeamActions" className="text-right">
            <RowMenu items={menuItems} label={`Actions for ${team.name}`} />
        </div>
    );
}

const COLUMNS: Column<TeamWithUsage>[] = [
    { key: "name", header: "Team", className: "font-medium text-foreground", render: (t) => t.name },
    {
        key: "leader",
        header: "Leader",
        className: "text-muted-foreground",
        render: (t) => (t.leaders.length === 0 ? "—" : t.leaders.map((l) => l.name).join(", ")),
    },
    {
        key: "members",
        header: "Members (active / total)",
        className: "text-muted-foreground",
        render: (t) => `${String(t.activeMemberCount)} / ${String(t.memberCount)}`,
    },
    { key: "actions", header: "", srLabel: "Actions", render: (t, state) => <TeamActions team={t} state={state} /> },
];

export function TeamsView({ teams, candidates }: { teams: TeamWithUsage[]; candidates: LeaderCandidate[] }) {
    return (
        <div data-component="TeamsView" className="space-y-4">
            <AddTeamForm />
            <DataTable
                columns={COLUMNS}
                rows={teams}
                rowKey={(t) => t.id}
                emptyMessage="No teams yet."
                renderExpanded={(t, state) => <TeamEditPanel team={t} candidates={candidates} onClose={state.close} />}
            />
        </div>
    );
}
