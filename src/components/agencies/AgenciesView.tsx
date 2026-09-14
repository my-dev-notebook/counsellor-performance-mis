"use client";

import { useState, useTransition } from "react";
import type { AgencyWithUsage } from "@/db/queries/agencies";
import { RowMenu } from "@/components/RowMenu";
import type { MenuItem } from "@/components/RowMenu";
import { DataTable } from "@/components/DataTable";
import type { Column, RowState } from "@/components/DataTable";
import { createAgencyAction, deleteAgencyAction, renameAgencyAction } from "@/app/(app)/agencies/actions";

function errorMessage(error: unknown, fallback: string): string {
    return error instanceof Error && error.message !== "" ? error.message : fallback;
}

const inputClass = "rounded-md border border-input bg-background px-2 py-1 text-sm text-foreground";
const primaryButton =
    "rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50";
const ghostButton =
    "rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground";
const panelInput = "w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground";

function AddAgencyForm() {
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
                await createAgencyAction(name);
                setName("");
            } catch (e) {
                setError(errorMessage(e, "Failed to add agency (name may already exist)."));
            }
        });
    };

    return (
        <form
            data-component="AddAgencyForm"
            onSubmit={(e) => {
                e.preventDefault();
                submit();
            }}
            className="flex flex-wrap items-end gap-3 rounded-lg border border-border bg-card p-4"
        >
            <label className="flex flex-col text-xs font-medium text-muted-foreground">
                New agency name
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

/** The full-width edit form shown under a clicked row. Mounted fresh each time a row opens. */
function AgencyEditPanel({ agency, onClose }: { agency: AgencyWithUsage; onClose: () => void }) {
    const [name, setName] = useState(agency.name);
    const [pending, startTransition] = useTransition();
    const [error, setError] = useState<string | null>(null);

    const save = () => {
        if (name.trim() === "") {
            setError("Name is required.");
            return;
        }
        setError(null);
        startTransition(async () => {
            try {
                await renameAgencyAction(agency.id, name);
                onClose();
            } catch (e) {
                setError(errorMessage(e, "Failed to rename agency (name may already exist)."));
            }
        });
    };

    return (
        <form
            data-component="AgencyEditPanel"
            onSubmit={(e) => {
                e.preventDefault();
                save();
            }}
            onKeyDown={(e) => {
                if (e.key === "Escape") onClose();
            }}
            className="space-y-5"
        >
            <p className="text-sm font-semibold text-foreground">Edit {agency.name}</p>
            <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
                <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
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
            </div>
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

/** The ⋯ menu in an agency's actions cell. */
function AgencyActions({ agency, state }: { agency: AgencyWithUsage; state: RowState }) {
    const [pending, startTransition] = useTransition();
    const deletable = agency.memberCount === 0 && agency.historyCount === 0;

    const menuItems: MenuItem[] = [
        { label: state.expanded ? "Close" : "Edit", onSelect: state.toggle },
        {
            label: deletable ? "Delete" : agency.memberCount > 0 ? "Delete (has users)" : "Delete (has history)",
            destructive: true,
            disabled: pending || !deletable,
            onSelect: () => {
                if (!confirm(`Delete agency "${agency.name}"? This cannot be undone.`)) return;
                startTransition(async () => {
                    try {
                        await deleteAgencyAction(agency.id);
                    } catch (e) {
                        alert(errorMessage(e, "Failed to delete agency."));
                    }
                });
            },
        },
    ];

    return (
        <div data-component="AgencyActions" className="text-right">
            <RowMenu items={menuItems} label={`Actions for ${agency.name}`} />
        </div>
    );
}

const COLUMNS: Column<AgencyWithUsage>[] = [
    { key: "name", header: "Agency", className: "font-medium text-foreground", render: (a) => a.name },
    { key: "users", header: "Users", className: "text-muted-foreground", render: (a) => a.memberCount },
    {
        key: "actions",
        header: "",
        srLabel: "Actions",
        render: (a, state) => <AgencyActions agency={a} state={state} />,
    },
];

export function AgenciesView({ agencies }: { agencies: AgencyWithUsage[] }) {
    return (
        <div data-component="AgenciesView" className="space-y-4">
            <AddAgencyForm />
            <DataTable
                columns={COLUMNS}
                rows={agencies}
                rowKey={(a) => a.id}
                emptyMessage="No agencies yet."
                renderExpanded={(a, state) => <AgencyEditPanel agency={a} onClose={state.close} />}
            />
        </div>
    );
}
