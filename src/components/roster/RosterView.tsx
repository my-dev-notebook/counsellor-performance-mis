"use client";

import { useMemo, useState, useTransition } from "react";
import { FiPlus } from "react-icons/fi";
import { RowMenu } from "@/components/RowMenu";
import { Select } from "@/components/Select";
import { DatePicker } from "@/components/DatePicker";
import type { MenuItem } from "@/components/RowMenu";
import { DataTable } from "@/components/DataTable";
import type { Column, RowState } from "@/components/DataTable";
import type { UserRow, Team, Agency, Role } from "@/db/types";
import type { Permissions } from "@/lib/auth/permissions";
import { roleLabel, roleRequiresMeritto, roleRequiresTeam } from "@/lib/auth/permissions";
import { formatText } from "@/lib/format";
import {
    addUserAction,
    changeAssignmentAction,
    deactivateUserAction,
    editUserAction,
    resetPasswordAction,
} from "@/app/(app)/roster/actions";

function errorMessage(error: unknown, fallback: string): string {
    return error instanceof Error && error.message !== "" ? error.message : fallback;
}

/** "" -> null, otherwise a positive whole number; undefined when the text is not a valid id. */
function parseMerittoId(text: string): number | null | undefined {
    const trimmed = text.trim();
    if (trimmed === "") return null;
    const parsed = Number(trimmed);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
}

const inputClass = "mt-1 rounded-md border border-input bg-background px-2 py-1 text-sm text-foreground";
const primaryButton =
    "rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50";
const ghostButton =
    "rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground";

function AddUserForm({
    roles,
    teams,
    agencies,
    canManageUsers,
}: {
    roles: Role[];
    teams: Team[];
    agencies: Agency[];
    canManageUsers: boolean;
}) {
    const counsellorRole = roles.find((r) => r.name === "counsellor");
    const [open, setOpen] = useState(false);
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [merittoUserId, setMerittoUserId] = useState("");
    const [dateOfJoining, setDateOfJoining] = useState("");
    const [roleId, setRoleId] = useState(counsellorRole?.id ?? roles[0]?.id ?? 0);
    const [teamId, setTeamId] = useState<number | "">(teams[0]?.id ?? "");
    const [agencyId, setAgencyId] = useState<number | "">("");
    const [pending, startTransition] = useTransition();
    const [error, setError] = useState<string | null>(null);

    const roleName = roles.find((r) => r.id === roleId)?.name ?? "counsellor";

    if (!open) {
        return (
            <div data-component="AddUserForm">
                <button
                    type="button"
                    onClick={() => {
                        setOpen(true);
                    }}
                    className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                >
                    <FiPlus className="h-3.5 w-3.5" />
                    {canManageUsers ? "Add User" : "Add Counsellor"}
                </button>
            </div>
        );
    }

    const submit = () => {
        if (name.trim() === "") {
            setError("Name is required.");
            return;
        }
        if (email.trim() === "") {
            setError("Email is required — it is the login.");
            return;
        }
        const parsedMerittoUserId = parseMerittoId(merittoUserId);
        if (parsedMerittoUserId === undefined) {
            setError("Meritto User ID must be a positive whole number.");
            return;
        }
        if (roleRequiresMeritto(roleName) && parsedMerittoUserId === null) {
            setError("A counsellor must have a Meritto User ID.");
            return;
        }
        if (roleRequiresTeam(roleName) && teamId === "") {
            setError(`A ${roleLabel(roleName).toLowerCase()} must belong to a team.`);
            return;
        }
        setError(null);
        startTransition(async () => {
            try {
                await addUserAction({
                    name,
                    email: email.trim(),
                    merittoUserId: parsedMerittoUserId,
                    dateOfJoining: dateOfJoining === "" ? null : dateOfJoining,
                    roleId,
                    teamId: teamId === "" ? null : teamId,
                    agencyId: agencyId === "" ? null : agencyId,
                });
                setName("");
                setEmail("");
                setMerittoUserId("");
                setDateOfJoining("");
                setAgencyId("");
                setOpen(false);
            } catch (e) {
                setError(errorMessage(e, "Failed to add user."));
            }
        });
    };

    return (
        <form
            data-component="AddUserForm"
            onSubmit={(e) => {
                e.preventDefault();
                submit();
            }}
            className="flex flex-wrap items-end gap-3 rounded-lg border border-border bg-card p-4"
        >
            <label className="flex flex-col text-xs font-medium text-muted-foreground">
                Name
                <input
                    value={name}
                    onChange={(e) => {
                        setName(e.target.value);
                    }}
                    className={inputClass}
                />
            </label>
            <label className="flex flex-col text-xs font-medium text-muted-foreground">
                Email (login)
                <input
                    type="email"
                    value={email}
                    onChange={(e) => {
                        setEmail(e.target.value);
                    }}
                    className={inputClass}
                />
            </label>
            <label className="flex flex-col text-xs font-medium text-muted-foreground">
                Meritto User ID{roleRequiresMeritto(roleName) ? "" : " (optional)"}
                <input
                    inputMode="numeric"
                    value={merittoUserId}
                    onChange={(e) => {
                        setMerittoUserId(e.target.value);
                    }}
                    placeholder="16098382"
                    className={inputClass}
                />
            </label>
            <label className="flex flex-col text-xs font-medium text-muted-foreground">
                Date of joining (optional)
                <DatePicker
                    size="sm"
                    className="mt-1"
                    value={dateOfJoining}
                    onChange={setDateOfJoining}
                    aria-label="Date of joining"
                />
            </label>
            {canManageUsers && (
                <label className="flex flex-col text-xs font-medium text-muted-foreground">
                    Role
                    <Select
                        size="sm"
                        className="mt-1"
                        value={String(roleId)}
                        onChange={(value) => {
                            setRoleId(Number(value));
                        }}
                        options={roles.map((r) => ({ value: String(r.id), label: roleLabel(r.name) }))}
                    />
                </label>
            )}
            <label className="flex flex-col text-xs font-medium text-muted-foreground">
                {roleName === "team_leader" ? "Leads team" : "Team"}
                <Select
                    size="sm"
                    className="mt-1"
                    value={String(teamId)}
                    onChange={(value) => {
                        setTeamId(value === "" ? "" : Number(value));
                    }}
                    options={[
                        ...(roleRequiresTeam(roleName) ? [] : [{ value: "", label: "—" }]),
                        ...teams.map((t) => ({ value: String(t.id), label: t.name })),
                    ]}
                />
            </label>
            <label className="flex flex-col text-xs font-medium text-muted-foreground">
                Agency
                <Select
                    size="sm"
                    className="mt-1"
                    value={String(agencyId)}
                    onChange={(value) => {
                        setAgencyId(value === "" ? "" : Number(value));
                    }}
                    options={[
                        { value: "", label: "—" },
                        ...agencies.map((a) => ({ value: String(a.id), label: a.name })),
                    ]}
                />
            </label>
            <button type="submit" disabled={pending} className={primaryButton}>
                {pending ? "Saving…" : "Save"}
            </button>
            <button
                type="button"
                onClick={() => {
                    setOpen(false);
                }}
                className={ghostButton}
            >
                Cancel
            </button>
            <p className="w-full text-xs text-muted-foreground">
                New users sign in with the default password and are asked to change it on first login.
            </p>
            {error && <p className="w-full text-xs text-destructive">{error}</p>}
        </form>
    );
}

const fieldLabel = "flex flex-col gap-1 text-xs font-medium text-muted-foreground";
const panelInput = "w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground";

/** The full-width edit form shown under a clicked row. Mounted fresh each time a row opens, so its state starts from the row. */
function UserEditPanel({
    user,
    roles,
    teams,
    agencies,
    canChangeRole,
    onClose,
}: {
    user: UserRow;
    roles: Role[];
    teams: Team[];
    agencies: Agency[];
    canChangeRole: boolean;
    onClose: () => void;
}) {
    const [name, setName] = useState(user.name);
    const [email, setEmail] = useState(user.email);
    const [merittoUserId, setMerittoUserId] = useState(user.merittoUserId === null ? "" : String(user.merittoUserId));
    const [dateOfJoining, setDateOfJoining] = useState(user.dateOfJoining ?? "");
    const [roleId, setRoleId] = useState(user.roleId);
    const [teamId, setTeamId] = useState<number | "">(user.teamId ?? "");
    const [agencyId, setAgencyId] = useState<number | "">(user.agencyId ?? "");
    const [error, setError] = useState<string | null>(null);
    const [pending, startTransition] = useTransition();
    const draftRoleName = roles.find((r) => r.id === roleId)?.name ?? user.roleName;

    const save = () => {
        const parsedMerittoUserId = parseMerittoId(merittoUserId);
        if (parsedMerittoUserId === undefined) {
            setError("Meritto User ID must be a positive whole number.");
            return;
        }
        if (roleRequiresMeritto(draftRoleName) && parsedMerittoUserId === null) {
            setError("A counsellor must have a Meritto User ID.");
            return;
        }
        if (roleRequiresTeam(draftRoleName) && teamId === "") {
            setError(`A ${roleLabel(draftRoleName).toLowerCase()} must belong to a team.`);
            return;
        }
        if (email.trim() === "") {
            setError("Email is required.");
            return;
        }
        setError(null);
        startTransition(async () => {
            try {
                await editUserAction(user.id, {
                    name,
                    email: email.trim(),
                    merittoUserId: parsedMerittoUserId,
                    dateOfJoining: dateOfJoining === "" ? null : dateOfJoining,
                    ...(canChangeRole ? { roleId } : {}),
                    teamId: teamId === "" ? null : teamId,
                    agencyId: agencyId === "" ? null : agencyId,
                });
                onClose();
            } catch (e) {
                setError(errorMessage(e, "Failed to save."));
            }
        });
    };

    return (
        <form
            data-component="UserEditPanel"
            onSubmit={(e) => {
                e.preventDefault();
                save();
            }}
            onKeyDown={(e) => {
                if (e.key === "Escape") onClose();
            }}
            className="space-y-5"
        >
            <p className="text-sm font-semibold text-foreground">Edit {user.name}</p>
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
                    Email
                    <input
                        type="email"
                        value={email}
                        onChange={(e) => {
                            setEmail(e.target.value);
                        }}
                        className={panelInput}
                    />
                </label>
                <label className={fieldLabel}>
                    Meritto User ID
                    <input
                        inputMode="numeric"
                        value={merittoUserId}
                        onChange={(e) => {
                            setMerittoUserId(e.target.value);
                        }}
                        placeholder="16098382"
                        className={panelInput}
                    />
                </label>
                <label className={fieldLabel}>
                    Date of joining
                    <DatePicker className="w-full" value={dateOfJoining} onChange={setDateOfJoining} aria-label="Date of joining" />
                </label>
                <label className={fieldLabel}>
                    Role
                    {canChangeRole ? (
                        <Select
                            className="w-full"
                            value={String(roleId)}
                            onChange={(value) => {
                                setRoleId(Number(value));
                            }}
                            options={roles.map((r) => ({ value: String(r.id), label: roleLabel(r.name) }))}
                        />
                    ) : (
                        <span className={`${panelInput} border-transparent bg-transparent px-0`}>
                            {roleLabel(user.roleName)}
                        </span>
                    )}
                </label>
                <label className={fieldLabel}>
                    {draftRoleName === "team_leader" ? "Leads team" : "Team"}
                    <Select
                        className="w-full"
                        value={String(teamId)}
                        onChange={(value) => {
                            setTeamId(value === "" ? "" : Number(value));
                        }}
                        options={[
                            ...(roleRequiresTeam(draftRoleName) ? [] : [{ value: "", label: "—" }]),
                            ...teams.map((t) => ({ value: String(t.id), label: t.name })),
                        ]}
                    />
                </label>
                <label className={fieldLabel}>
                    Agency
                    <Select
                        className="w-full"
                        value={String(agencyId)}
                        onChange={(value) => {
                            setAgencyId(value === "" ? "" : Number(value));
                        }}
                        options={[
                            { value: "", label: "—" },
                            ...agencies.map((a) => ({ value: String(a.id), label: a.name })),
                        ]}
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

/** The ⋯ menu in a user's actions cell. */
function RosterActions({
    user,
    isSelf,
    permissions,
    state,
}: {
    user: UserRow;
    isSelf: boolean;
    permissions: Permissions;
    state: RowState;
}) {
    const [pending, startTransition] = useTransition();
    const canManageUsers = permissions.manageUsers;
    const editable = permissions.manageRoster && user.isActive;

    const run = (action: () => Promise<unknown>, fallback: string) => {
        startTransition(async () => {
            try {
                await action();
            } catch (e) {
                alert(errorMessage(e, fallback));
            }
        });
    };

    const menuItems: MenuItem[] = [];
    if (editable) menuItems.push({ label: state.expanded ? "Close" : "Edit", onSelect: state.toggle });
    if (canManageUsers && user.isActive) {
        menuItems.push({
            label: "Reset password",
            disabled: pending,
            onSelect: () => {
                if (!confirm(`Reset ${user.name}'s password to the default? They will be signed out.`)) return;
                run(() => resetPasswordAction(user.id), "Failed to reset password.");
            },
        });
    }
    if (canManageUsers && !isSelf) {
        if (user.isActive) {
            menuItems.push({
                label: "Deactivate",
                destructive: true,
                disabled: pending,
                onSelect: () => {
                    if (!confirm(`Deactivate ${user.name}?`)) return;
                    run(() => deactivateUserAction(user.id), "Failed to deactivate.");
                },
            });
        } else {
            menuItems.push({
                label: "Reactivate",
                disabled: pending,
                onSelect: () => {
                    if (!confirm(`Reactivate ${user.name}? They will be able to sign in again.`)) return;
                    run(() => changeAssignmentAction(user.id, { isActive: true }), "Failed to reactivate.");
                },
            });
        }
    }

    if (menuItems.length === 0) return null;
    return (
        <div data-component="RosterActions" className="text-right">
            <RowMenu items={menuItems} label={`Actions for ${user.name}`} />
        </div>
    );
}

export function RosterView({
    users,
    roles,
    teams,
    agencies,
    currentUserId,
    permissions,
}: {
    users: UserRow[];
    roles: Role[];
    teams: Team[];
    agencies: Agency[];
    currentUserId: number;
    permissions: Permissions;
}) {
    const [search, setSearch] = useState("");
    const [roleFilter, setRoleFilter] = useState<number | "">("");
    const [teamFilter, setTeamFilter] = useState<number | "">("");
    const [agencyFilter, setAgencyFilter] = useState<number | "">("");
    const [showInactive, setShowInactive] = useState(false);

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        return users.filter((u) => {
            if (!showInactive && !u.isActive) return false;
            if (q !== "" && !u.name.toLowerCase().includes(q) && !u.email.toLowerCase().includes(q)) return false;
            if (roleFilter !== "" && u.roleId !== roleFilter) return false;
            if (teamFilter !== "" && u.teamId !== teamFilter) return false;
            if (agencyFilter !== "" && u.agencyId !== agencyFilter) return false;
            return true;
        });
    }, [users, search, roleFilter, teamFilter, agencyFilter, showInactive]);

    const columns: Column<UserRow>[] = [
        {
            key: "name",
            header: "Name",
            className: "font-medium text-foreground",
            render: (u) => (
                <>
                    {u.name}
                    {u.id === currentUserId && <span className="ml-1 text-xs text-muted-foreground">(you)</span>}
                </>
            ),
        },
        { key: "role", header: "Role", className: "text-muted-foreground", render: (u) => roleLabel(u.roleName) },
        { key: "team", header: "Team", className: "text-muted-foreground", render: (u) => formatText(u.teamName) },
        {
            key: "agency",
            header: "Agency",
            className: "text-muted-foreground",
            render: (u) => formatText(u.agencyName),
        },
        { key: "email", header: "Email", className: "text-muted-foreground", render: (u) => u.email },
        {
            key: "meritto",
            header: "Meritto ID",
            className: "text-muted-foreground",
            render: (u) => u.merittoUserId ?? "—",
        },
        {
            key: "status",
            header: "Status",
            className: "text-muted-foreground",
            render: (u) => (u.isActive ? "Active" : "Inactive"),
        },
        {
            key: "actions",
            header: "",
            srLabel: "Actions",
            render: (u, state) => (
                <RosterActions user={u} isSelf={u.id === currentUserId} permissions={permissions} state={state} />
            ),
        },
    ];

    return (
        <div data-component="RosterView" className="space-y-4">
            {permissions.manageRoster && (
                <AddUserForm roles={roles} teams={teams} agencies={agencies} canManageUsers={permissions.manageUsers} />
            )}

            <div className="flex flex-wrap items-center gap-3">
                <input
                    placeholder="Search by name or email…"
                    value={search}
                    onChange={(e) => {
                        setSearch(e.target.value);
                    }}
                    className="rounded-md border border-input bg-background px-2 py-1 text-sm text-foreground"
                />
                <Select
                    size="sm"
                    aria-label="Filter by role"
                    value={String(roleFilter)}
                    onChange={(value) => {
                        setRoleFilter(value === "" ? "" : Number(value));
                    }}
                    options={[
                        { value: "", label: "All roles" },
                        ...roles.map((r) => ({ value: String(r.id), label: roleLabel(r.name) })),
                    ]}
                />
                <Select
                    size="sm"
                    aria-label="Filter by team"
                    value={String(teamFilter)}
                    onChange={(value) => {
                        setTeamFilter(value === "" ? "" : Number(value));
                    }}
                    options={[
                        { value: "", label: "All teams" },
                        ...teams.map((t) => ({ value: String(t.id), label: t.name })),
                    ]}
                />
                <Select
                    size="sm"
                    aria-label="Filter by agency"
                    value={String(agencyFilter)}
                    onChange={(value) => {
                        setAgencyFilter(value === "" ? "" : Number(value));
                    }}
                    options={[
                        { value: "", label: "All agencies" },
                        ...agencies.map((a) => ({ value: String(a.id), label: a.name })),
                    ]}
                />
                <label className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <input
                        type="checkbox"
                        checked={showInactive}
                        onChange={(e) => {
                            setShowInactive(e.target.checked);
                        }}
                    />
                    Show inactive
                </label>
            </div>

            <DataTable
                columns={columns}
                rows={filtered}
                rowKey={(u) => u.id}
                emptyMessage="No users match the current filters."
                rowClassName={(u) => (u.isActive ? "" : "opacity-50")}
                expandable={(u) => permissions.manageRoster && u.isActive}
                renderExpanded={(u, state) => (
                    <UserEditPanel
                        user={u}
                        roles={roles}
                        teams={teams}
                        agencies={agencies}
                        canChangeRole={permissions.manageUsers && u.id !== currentUserId}
                        onClose={state.close}
                    />
                )}
            />
        </div>
    );
}
