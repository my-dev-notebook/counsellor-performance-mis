"use client";

import { useState, useTransition } from "react";
import { FiAlertCircle } from "react-icons/fi";
import type { AgencyWithUsage } from "@/db/queries/agencies";
import { RowMenu } from "@/components/RowMenu";
import type { MenuItem } from "@/components/RowMenu";
import { DataTable } from "@/components/DataTable";
import type { Column, RowState } from "@/components/DataTable";
import { createAgencyAction, deleteAgencyAction, renameAgencyAction } from "@/app/(app)/agencies/actions";

function errorMessage(error: unknown, fallback: string): string {
    return error instanceof Error && error.message !== "" ? error.message : fallback;
}

const inputClass = "input input-sm";
const primaryButton = "btn btn-primary";
const ghostButton = "btn btn-ghost";
const fieldLabel = "field";
const panelInput = "input";

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
            className="card card-pad flex flex-wrap items-end gap-x-4 gap-y-3"
        >
            <label className="field w-64">
                <span className="label">New agency name</span>
                <input
                    value={name}
                    onChange={(e) => {
                        setName(e.target.value);
                    }}
                    className={inputClass}
                />
            </label>
            <button type="submit" disabled={pending} className="btn btn-primary btn-sm">
                {pending && <span className="spinner" aria-hidden />}
                {pending ? "Adding…" : "Add"}
            </button>
            {error && (
                <p className="error-text w-full">
                    <FiAlertCircle aria-hidden />
                    {error}
                </p>
            )}
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
            className="stack gap-4"
        >
            <p className="t-h3">Edit {agency.name}</p>
            <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
                <label className={fieldLabel}>
                    <span className="label">Name</span>
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
            {error && (
                <p className="error-text">
                    <FiAlertCircle aria-hidden />
                    {error}
                </p>
            )}
            <div className="flex items-center gap-3 border-t border-line-1 pt-4">
                <button type="submit" disabled={pending} className={primaryButton}>
                    {pending && <span className="spinner" aria-hidden />}
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
    // const [pending, startTransition] = useTransition();
    // const deletable = agency.memberCount === 0 && agency.historyCount === 0;

    const menuItems: MenuItem[] = [
        { label: state.expanded ? "Close" : "Edit", onSelect: state.toggle },
        /* {
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
        }, */
    ];

    return (
        <div data-component="AgencyActions" className="text-right">
            <RowMenu items={menuItems} label={`Actions for ${agency.name}`} />
        </div>
    );
}

const COLUMNS: Column<AgencyWithUsage>[] = [
    { key: "name", header: "Agency", className: "primary", render: (a) => a.name },
    { key: "users", header: "Active users", className: "num", render: (a) => a.memberCount },
    {
        key: "actions",
        header: "",
        srLabel: "Actions",
        render: (a, state) => <AgencyActions agency={a} state={state} />,
    },
];

export function AgenciesView({ agencies }: { agencies: AgencyWithUsage[] }) {
    return (
        <div data-component="AgenciesView" className="stack gap-4">
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
