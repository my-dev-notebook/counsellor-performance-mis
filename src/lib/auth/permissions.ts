import type { SQL, SQLWrapper } from "drizzle-orm";
import { and, eq, or, sql } from "drizzle-orm";

/**
 * Role-based access, keyed by `roles.name`. A role the DB knows but this map
 * does not gets `NO_PERMISSIONS` and an empty scope -- adding a role means one
 * INSERT into `roles` plus one entry here.
 *
 * "Moderator" is not a role: it is the code-level grouping of team_leader and
 * mis_executive (see `isModerator`).
 */

export const ROLE_NAMES = ["counsellor", "team_leader", "mis_executive", "admin", "quality_analyst"] as const;
export type RoleName = (typeof ROLE_NAMES)[number];

export function isRoleName(name: string): name is RoleName {
    return (ROLE_NAMES as readonly string[]).includes(name);
}

export interface Permissions {
    /** Read rows of every team (otherwise reads are limited to own team, or own rows). */
    readAllTeams: boolean;
    /** Read every counsellor row inside the readable teams (otherwise only own rows + team aggregates). */
    readTeamRows: boolean;
    /** Dashboards and reports (monthly/yearly performance). Off only for the quality analyst. */
    viewPerformance: boolean;
    /** Call audits: the Quality section, create/edit/delete. Quality analysts only. */
    auditCalls: boolean;
    /** Open the Users page (read-only unless manageRoster / manageUsers). */
    viewRoster: boolean;
    /** Monthly targets, daily admissions, finalize. */
    writeEntries: boolean;
    /** Add users, edit profiles, change team/agency. */
    manageRoster: boolean;
    /** Change roles, activate/deactivate, reset passwords, create non-counsellor users. */
    manageUsers: boolean;
    manageAgencies: boolean;
    /** Create, rename and delete teams. Teams define visibility scopes, so admin-only. */
    manageTeams: boolean;
    /** Meritto session tools, upload & preview. */
    useTools: boolean;
}

export const NO_PERMISSIONS: Permissions = {
    readAllTeams: false,
    readTeamRows: false,
    viewPerformance: false,
    auditCalls: false,
    viewRoster: false,
    writeEntries: false,
    manageRoster: false,
    manageUsers: false,
    manageAgencies: false,
    manageTeams: false,
    useTools: false,
};

export const PERMISSIONS: Record<RoleName, Permissions> = {
    // Own rows plus own team's aggregates. Read-only. The dashboards also list
    // teammates' rows on the "My team" tab (`includeTeammates`).
    counsellor: { ...NO_PERMISSIONS, viewPerformance: true },
    // Every row of own team. Read-only.
    team_leader: { ...NO_PERMISSIONS, readTeamRows: true, viewPerformance: true, viewRoster: true },
    // Every team; identical for every MIS executive. Writes entries (monthly,
    // daily, upload) only -- no users, roster, teams or agencies.
    mis_executive: {
        readAllTeams: true,
        readTeamRows: true,
        viewPerformance: true,
        auditCalls: false,
        viewRoster: false,
        writeEntries: true,
        manageRoster: false,
        manageUsers: false,
        manageAgencies: false,
        manageTeams: false,
        useTools: true,
    },
    admin: {
        readAllTeams: true,
        readTeamRows: true,
        viewPerformance: true,
        auditCalls: false,
        viewRoster: true,
        writeEntries: true,
        manageRoster: true,
        manageUsers: true,
        manageAgencies: true,
        manageTeams: true,
        useTools: true,
    },
    // Audits calls across every team and sees nothing else: no dashboards,
    // reports, entries, roster or tools. `readAllTeams` is only so the audit
    // form can list every counsellor.
    quality_analyst: { ...NO_PERMISSIONS, readAllTeams: true, readTeamRows: true, auditCalls: true },
};

/** Where a signed-in user lands: the dashboard, or the Quality section for a role that cannot see it. */
export function homePathFor(permissions: Permissions): string {
    if (permissions.viewPerformance) return "/";
    if (permissions.auditCalls) return "/quality";
    return "/";
}

/**
 * Human label for any `roles.name`, known to the code or not: "mis_executive"
 * -> "MIS Executive", "quality_analyst" -> "Quality Analyst". Roles are read
 * from the DB wherever they are chosen, so a new role must get a sensible
 * label without a code change; only acronyms need an override.
 */
const ROLE_WORD_OVERRIDES: Record<string, string> = { mis: "MIS" };

export function roleLabel(roleName: string): string {
    return roleName
        .split("_")
        .filter((word) => word !== "")
        .map((word) => ROLE_WORD_OVERRIDES[word] ?? word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");
}

export function permissionsFor(roleName: string): Permissions {
    return isRoleName(roleName) ? PERMISSIONS[roleName] : NO_PERMISSIONS;
}

export function isModerator(roleName: string): boolean {
    return roleName === "team_leader" || roleName === "mis_executive";
}

/**
 * What a user may read. Every query over users / admissions /
 * counsellor_perf_monthly takes one of these and filters through
 * `scopeRowCondition` / `scopeTeamCondition` -- there is no unscoped read path.
 *
 *   all  -> every row
 *   team -> every row whose (snapshot) team is `teamId`
 *   self -> own rows only; team aggregates for `teamId` are still visible
 *   none -> nothing (unknown role, or a role that needs a team but has none)
 */
export type Scope =
    | { kind: "all" }
    | { kind: "team"; teamId: number }
    | { kind: "self"; userId: number; teamId: number | null }
    | { kind: "none" };

export function scopeFor(user: { id: number; roleName: string; teamId: number | null }): Scope {
    const permissions = permissionsFor(user.roleName);
    if (!isRoleName(user.roleName)) return { kind: "none" };
    if (permissions.readAllTeams) return { kind: "all" };
    if (permissions.readTeamRows) {
        return user.teamId === null ? { kind: "none" } : { kind: "team", teamId: user.teamId };
    }
    return { kind: "self", userId: user.id, teamId: user.teamId };
}

/** Roles that must always carry a team. */
export function roleRequiresTeam(roleName: string): boolean {
    return roleName === "counsellor" || roleName === "team_leader";
}

export function roleRequiresMeritto(roleName: string): boolean {
    return roleName === "counsellor";
}

const FALSE = sql`0 = 1`;

/**
 * Row-level filter: which individual rows the scope may see. `teamCol` is the
 * row's own (snapshot) team column, or for tables without a snapshot the
 * user's current team.
 */
export function scopeRowCondition(scope: Scope, userCol: SQLWrapper, teamCol: SQLWrapper): SQL | undefined {
    switch (scope.kind) {
        case "all":
            return undefined;
        case "team":
            return eq(teamCol, scope.teamId);
        case "self":
            return eq(userCol, scope.userId);
        case "none":
            return FALSE;
    }
}

/**
 * Team-level filter: which rows may feed aggregates the scope is allowed to
 * see. Wider than `scopeRowCondition` only for "self", where the whole team
 * contributes to the team totals but only own rows may be shown individually.
 */
export function scopeTeamCondition(scope: Scope, userCol: SQLWrapper, teamCol: SQLWrapper): SQL | undefined {
    switch (scope.kind) {
        case "all":
            return undefined;
        case "team":
            return eq(teamCol, scope.teamId);
        case "self":
            return scope.teamId === null
                ? eq(userCol, scope.userId)
                : (or(eq(userCol, scope.userId), eq(teamCol, scope.teamId)) ?? FALSE);
        case "none":
            return FALSE;
    }
}

/** In-memory counterpart of `scopeRowCondition`, for rows already loaded under `scopeTeamCondition`. */
export function rowVisible(scope: Scope, row: { userId: number; teamId: number | null }): boolean {
    switch (scope.kind) {
        case "all":
            return true;
        case "team":
            return row.teamId === scope.teamId;
        case "self":
            return row.userId === scope.userId;
        case "none":
            return false;
    }
}

/** Whether the scope may read a given user's individual rows at all. */
export function userInScope(scope: Scope, user: { id: number; teamId: number | null }): boolean {
    return rowVisible(scope, { userId: user.id, teamId: user.teamId });
}

export function combine(...conditions: (SQL | undefined)[]): SQL | undefined {
    const present = conditions.filter((c): c is SQL => c !== undefined);
    return present.length === 0 ? undefined : and(...present);
}
