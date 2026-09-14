"use client";

import { useMemo, useState, useTransition } from "react";
import { FiPlus } from "react-icons/fi";
import type { UserRow, Team, Agency, Role } from "@/db/types";
import type { Permissions } from "@/lib/auth/permissions";
import { roleRequiresMeritto, roleRequiresTeam } from "@/lib/auth/permissions";
import { formatText } from "@/lib/format";
import {
    addUserAction,
    updateProfileAction,
    changeAssignmentAction,
    deactivateUserAction,
    resetPasswordAction,
} from "@/app/(app)/roster/actions";

const ROLE_LABELS: Record<string, string> = {
    counsellor: "Counsellor",
    team_leader: "Team Leader",
    mis_executive: "MIS Executive",
    admin: "Admin",
};

function roleLabel(name: string): string {
    return ROLE_LABELS[name] ?? name;
}

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
const cellInputClass = "w-full rounded-md border border-input bg-background px-2 py-1 text-sm text-foreground";
const primaryButton =
    "rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50";
const smallPrimaryButton =
    "rounded-md bg-primary px-2 py-1 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50";
const ghostButton = "rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground";
const smallGhostButton = "rounded-md px-2 py-1 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground";
const linkButton = "text-xs font-medium text-muted-foreground hover:text-foreground hover:underline disabled:opacity-50";

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
                    roleId,
                    teamId: teamId === "" ? null : teamId,
                    agencyId: agencyId === "" ? null : agencyId,
                });
                setName("");
                setEmail("");
                setMerittoUserId("");
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
            {canManageUsers && (
                <label className="flex flex-col text-xs font-medium text-muted-foreground">
                    Role
                    <select
                        value={roleId}
                        onChange={(e) => {
                            setRoleId(Number(e.target.value));
                        }}
                        className={inputClass}
                    >
                        {roles.map((r) => (
                            <option key={r.id} value={r.id}>
                                {roleLabel(r.name)}
                            </option>
                        ))}
                    </select>
                </label>
            )}
            <label className="flex flex-col text-xs font-medium text-muted-foreground">
                Team
                <select
                    value={teamId}
                    onChange={(e) => {
                        setTeamId(e.target.value === "" ? "" : Number(e.target.value));
                    }}
                    className={inputClass}
                >
                    {!roleRequiresTeam(roleName) && <option value="">—</option>}
                    {teams.map((t) => (
                        <option key={t.id} value={t.id}>
                            {t.name}
                        </option>
                    ))}
                </select>
            </label>
            <label className="flex flex-col text-xs font-medium text-muted-foreground">
                Agency
                <select
                    value={agencyId}
                    onChange={(e) => {
                        setAgencyId(e.target.value === "" ? "" : Number(e.target.value));
                    }}
                    className={inputClass}
                >
                    <option value="">—</option>
                    {agencies.map((a) => (
                        <option key={a.id} value={a.id}>
                            {a.name}
                        </option>
                    ))}
                </select>
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

function RosterRow({
    user,
    roles,
    teams,
    agencies,
    isSelf,
    permissions,
}: {
    user: UserRow;
    roles: Role[];
    teams: Team[];
    agencies: Agency[];
    isSelf: boolean;
    permissions: Permissions;
}) {
    const [mode, setMode] = useState<"view" | "edit-profile" | "change-assignment">("view");
    const [name, setName] = useState(user.name);
    const [email, setEmail] = useState(user.email);
    const [merittoUserId, setMerittoUserId] = useState(user.merittoUserId === null ? "" : String(user.merittoUserId));
    const [roleId, setRoleId] = useState(user.roleId);
    const [teamId, setTeamId] = useState<number | "">(user.teamId ?? "");
    const [agencyId, setAgencyId] = useState<number | "">(user.agencyId ?? "");
    const [error, setError] = useState<string | null>(null);
    const [pending, startTransition] = useTransition();

    const canManage = permissions.manageRoster;
    const canManageUsers = permissions.manageUsers;
    const draftRoleName = roles.find((r) => r.id === roleId)?.name ?? user.roleName;

    const resetProfileFields = () => {
        setName(user.name);
        setEmail(user.email);
        setMerittoUserId(user.merittoUserId === null ? "" : String(user.merittoUserId));
        setError(null);
    };

    const resetAssignmentFields = () => {
        setRoleId(user.roleId);
        setTeamId(user.teamId ?? "");
        setAgencyId(user.agencyId ?? "");
        setError(null);
    };

    const statusCell = <td className="px-3 py-2 text-muted-foreground">{user.isActive ? "Active" : "Inactive"}</td>;

    if (mode === "edit-profile") {
        return (
            <tr data-component="RosterRow" className="bg-warning/10">
                <td className="px-3 py-2">
                    <input
                        value={name}
                        onChange={(e) => {
                            setName(e.target.value);
                        }}
                        className={cellInputClass}
                    />
                </td>
                <td className="px-3 py-2 text-muted-foreground">{roleLabel(user.roleName)}</td>
                <td className="px-3 py-2 text-muted-foreground">{formatText(user.teamName)}</td>
                <td className="px-3 py-2 text-muted-foreground">{formatText(user.agencyName)}</td>
                <td className="px-3 py-2">
                    <input
                        type="email"
                        value={email}
                        onChange={(e) => {
                            setEmail(e.target.value);
                        }}
                        placeholder="email"
                        className={cellInputClass}
                    />
                </td>
                <td className="px-3 py-2">
                    <input
                        inputMode="numeric"
                        value={merittoUserId}
                        onChange={(e) => {
                            setMerittoUserId(e.target.value);
                        }}
                        placeholder="Meritto User ID"
                        className={cellInputClass}
                    />
                    {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
                </td>
                {statusCell}
                <td className="px-3 py-2">
                    <div className="flex gap-2">
                        <button
                            disabled={pending}
                            onClick={() => {
                                const parsedMerittoUserId = parseMerittoId(merittoUserId);
                                if (parsedMerittoUserId === undefined) {
                                    setError("Meritto User ID must be a positive whole number.");
                                    return;
                                }
                                if (roleRequiresMeritto(user.roleName) && parsedMerittoUserId === null) {
                                    setError("A counsellor must have a Meritto User ID.");
                                    return;
                                }
                                if (email.trim() === "") {
                                    setError("Email is required.");
                                    return;
                                }
                                setError(null);
                                startTransition(async () => {
                                    try {
                                        await updateProfileAction(user.id, {
                                            name,
                                            email: email.trim(),
                                            merittoUserId: parsedMerittoUserId,
                                        });
                                        setMode("view");
                                    } catch (e) {
                                        setError(errorMessage(e, "Failed to save profile."));
                                    }
                                });
                            }}
                            className={smallPrimaryButton}
                        >
                            Save
                        </button>
                        <button
                            onClick={() => {
                                resetProfileFields();
                                setMode("view");
                            }}
                            className={smallGhostButton}
                        >
                            Cancel
                        </button>
                    </div>
                </td>
            </tr>
        );
    }

    if (mode === "change-assignment") {
        return (
            <tr data-component="RosterRow" className="bg-info/10">
                <td className="px-3 py-2 font-medium text-foreground">{user.name}</td>
                <td className="px-3 py-2">
                    {canManageUsers ? (
                        <select
                            value={roleId}
                            onChange={(e) => {
                                setRoleId(Number(e.target.value));
                            }}
                            className={cellInputClass}
                        >
                            {roles.map((r) => (
                                <option key={r.id} value={r.id}>
                                    {roleLabel(r.name)}
                                </option>
                            ))}
                        </select>
                    ) : (
                        <span className="text-muted-foreground">{roleLabel(user.roleName)}</span>
                    )}
                </td>
                <td className="px-3 py-2">
                    <select
                        value={teamId}
                        onChange={(e) => {
                            setTeamId(e.target.value === "" ? "" : Number(e.target.value));
                        }}
                        className={cellInputClass}
                    >
                        {!roleRequiresTeam(draftRoleName) && <option value="">—</option>}
                        {teams.map((t) => (
                            <option key={t.id} value={t.id}>
                                {t.name}
                            </option>
                        ))}
                    </select>
                </td>
                <td className="px-3 py-2">
                    <select
                        value={agencyId}
                        onChange={(e) => {
                            setAgencyId(e.target.value === "" ? "" : Number(e.target.value));
                        }}
                        className={cellInputClass}
                    >
                        <option value="">—</option>
                        {agencies.map((a) => (
                            <option key={a.id} value={a.id}>
                                {a.name}
                            </option>
                        ))}
                    </select>
                    {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
                </td>
                <td className="px-3 py-2 text-muted-foreground">{user.email}</td>
                <td className="px-3 py-2 text-muted-foreground">{user.merittoUserId ?? "—"}</td>
                {statusCell}
                <td className="px-3 py-2">
                    <div className="flex gap-2">
                        <button
                            disabled={pending}
                            onClick={() => {
                                if (roleRequiresTeam(draftRoleName) && teamId === "") {
                                    setError(`A ${roleLabel(draftRoleName).toLowerCase()} must belong to a team.`);
                                    return;
                                }
                                if (roleRequiresMeritto(draftRoleName) && user.merittoUserId === null) {
                                    setError("Set a Meritto User ID (Edit profile) before making this user a counsellor.");
                                    return;
                                }
                                setError(null);
                                startTransition(async () => {
                                    try {
                                        await changeAssignmentAction(user.id, {
                                            ...(canManageUsers ? { roleId } : {}),
                                            teamId: teamId === "" ? null : teamId,
                                            agencyId: agencyId === "" ? null : agencyId,
                                        });
                                        setMode("view");
                                    } catch (e) {
                                        setError(errorMessage(e, "Failed to save assignment."));
                                    }
                                });
                            }}
                            className={smallPrimaryButton}
                        >
                            Save
                        </button>
                        <button
                            onClick={() => {
                                resetAssignmentFields();
                                setMode("view");
                            }}
                            className={smallGhostButton}
                        >
                            Cancel
                        </button>
                    </div>
                </td>
            </tr>
        );
    }

    return (
        <tr data-component="RosterRow" className={user.isActive ? "" : "opacity-50"}>
            <td className="px-3 py-2 font-medium text-foreground">
                {user.name}
                {isSelf && <span className="ml-1 text-xs text-muted-foreground">(you)</span>}
            </td>
            <td className="px-3 py-2 text-muted-foreground">{roleLabel(user.roleName)}</td>
            <td className="px-3 py-2 text-muted-foreground">{formatText(user.teamName)}</td>
            <td className="px-3 py-2 text-muted-foreground">{formatText(user.agencyName)}</td>
            <td className="px-3 py-2 text-muted-foreground">{user.email}</td>
            <td className="px-3 py-2 text-muted-foreground">{user.merittoUserId ?? "—"}</td>
            {statusCell}
            <td className="px-3 py-2">
                {canManage && user.isActive && (
                    <div className="flex flex-wrap gap-2">
                        <button
                            onClick={() => {
                                setMode("edit-profile");
                            }}
                            className={linkButton}
                        >
                            Edit profile
                        </button>
                        <button
                            onClick={() => {
                                setMode("change-assignment");
                            }}
                            className={linkButton}
                        >
                            {canManageUsers ? "Change role/team/agency" : "Change team/agency"}
                        </button>
                        {canManageUsers && (
                            <button
                                disabled={pending}
                                onClick={() => {
                                    if (!confirm(`Reset ${user.name}'s password to the default? They will be signed out.`)) return;
                                    startTransition(async () => {
                                        try {
                                            await resetPasswordAction(user.id);
                                        } catch (e) {
                                            alert(errorMessage(e, "Failed to reset password."));
                                        }
                                    });
                                }}
                                className={linkButton}
                            >
                                Reset password
                            </button>
                        )}
                        {canManageUsers && !isSelf && (
                            <button
                                disabled={pending}
                                onClick={() => {
                                    if (!confirm(`Deactivate ${user.name}?`)) return;
                                    startTransition(async () => {
                                        try {
                                            await deactivateUserAction(user.id);
                                        } catch (e) {
                                            alert(errorMessage(e, "Failed to deactivate."));
                                        }
                                    });
                                }}
                                className="text-xs font-medium text-destructive hover:underline disabled:opacity-50"
                            >
                                Deactivate
                            </button>
                        )}
                    </div>
                )}
            </td>
        </tr>
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
                    className="rounded-md border border-input bg-background px-2 py-1.5 text-sm text-foreground"
                />
                <select
                    value={roleFilter}
                    onChange={(e) => {
                        setRoleFilter(e.target.value === "" ? "" : Number(e.target.value));
                    }}
                    className="rounded-md border border-input bg-background px-2 py-1.5 text-sm text-foreground"
                >
                    <option value="">All roles</option>
                    {roles.map((r) => (
                        <option key={r.id} value={r.id}>
                            {roleLabel(r.name)}
                        </option>
                    ))}
                </select>
                <select
                    value={teamFilter}
                    onChange={(e) => {
                        setTeamFilter(e.target.value === "" ? "" : Number(e.target.value));
                    }}
                    className="rounded-md border border-input bg-background px-2 py-1.5 text-sm text-foreground"
                >
                    <option value="">All teams</option>
                    {teams.map((t) => (
                        <option key={t.id} value={t.id}>
                            {t.name}
                        </option>
                    ))}
                </select>
                <select
                    value={agencyFilter}
                    onChange={(e) => {
                        setAgencyFilter(e.target.value === "" ? "" : Number(e.target.value));
                    }}
                    className="rounded-md border border-input bg-background px-2 py-1.5 text-sm text-foreground"
                >
                    <option value="">All agencies</option>
                    {agencies.map((a) => (
                        <option key={a.id} value={a.id}>
                            {a.name}
                        </option>
                    ))}
                </select>
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

            {filtered.length === 0 ? (
                <p data-component="RosterView" className="py-8 text-center text-sm text-muted-foreground">
                    No users match the current filters.
                </p>
            ) : (
                <div className="overflow-x-auto rounded-lg border border-border bg-card">
                    <table className="min-w-full divide-y divide-border text-sm">
                        <thead className="bg-muted/50">
                            <tr>
                                {["Name", "Role", "Team", "Agency", "Email", "Meritto ID", "Status", "Actions"].map((h) => (
                                    <th
                                        key={h}
                                        className="px-3 py-2 text-left text-xs font-semibold tracking-wide text-muted-foreground uppercase"
                                    >
                                        {h}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {filtered.map((u) => (
                                <RosterRow
                                    key={u.id}
                                    user={u}
                                    roles={roles}
                                    teams={teams}
                                    agencies={agencies}
                                    isSelf={u.id === currentUserId}
                                    permissions={permissions}
                                />
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
