import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createSession, deleteSession, extendSession, getSession } from "@/db/queries/sessions";
import { getPasswordState, getUserById } from "@/db/queries/users";
import type { UserRow } from "@/db/types";
import type { Permissions, Scope } from "@/lib/auth/permissions";
import { homePathFor, permissionsFor, scopeFor } from "@/lib/auth/permissions";

/**
 * Data-access layer for "who is making this request".
 *
 * The cookie carries only the opaque session id; every request looks the
 * `sessions` row up and joins the live `users` row, so a deactivated user or a
 * deleted session is refused on the very next request. Nothing about the
 * user is trusted from the cookie.
 */

export const SESSION_COOKIE = "session";
export const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;
/** Slide the DB expiry forward only when this much of the window has been used, to keep writes rare. */
const REFRESH_AFTER_MS = 24 * 60 * 60 * 1000;

export interface CurrentUser extends UserRow {
    permissions: Permissions;
    scope: Scope;
    mustChangePassword: boolean;
    sessionId: string;
}

function newSessionId(): string {
    const bytes = crypto.getRandomValues(new Uint8Array(32));
    let binary = "";
    for (const byte of bytes) binary += String.fromCharCode(byte);
    return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function cookieOptions(expires: Date) {
    return {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax" as const,
        path: "/",
        expires,
    };
}

/** Server Actions / Route Handlers only — cookies cannot be set during rendering. */
export async function startSession(userId: number): Promise<void> {
    const id = newSessionId();
    const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
    await createSession(id, userId, expiresAt);
    (await cookies()).set(SESSION_COOKIE, id, cookieOptions(expiresAt));
}

export async function endSession(): Promise<void> {
    const store = await cookies();
    const id = store.get(SESSION_COOKIE)?.value;
    if (id) await deleteSession(id);
    store.delete(SESSION_COOKIE);
}

/**
 * The signed-in user, or null. Memoised per render pass with React `cache`
 * so a layout and its page share one lookup. Also slides the session expiry
 * forward on activity (at most once a day per session).
 */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
    const id = (await cookies()).get(SESSION_COOKIE)?.value;
    if (!id) return null;

    const session = await getSession(id);
    if (!session) return null;

    const now = Date.now();
    const expiresAt = Date.parse(session.expiresAt);
    if (Number.isNaN(expiresAt) || expiresAt <= now) {
        await deleteSession(id);
        return null;
    }

    const user = await getUserById(session.userId);
    if (!user?.isActive) return null;

    if (expiresAt - now < SESSION_TTL_MS - REFRESH_AFTER_MS) {
        await extendSession(id, new Date(now + SESSION_TTL_MS));
    }

    const password = await getPasswordState(user.id);

    return {
        ...user,
        permissions: permissionsFor(user.roleName),
        scope: scopeFor(user),
        mustChangePassword: password?.passwordChangedAt === null,
        sessionId: id,
    };
});

/**
 * For every protected page and action: redirects to /login when signed out
 * and to the password-change page while the seeded default password is still
 * in place. Pass `allowPasswordChange` only from that page itself.
 */
export async function requireUser(options?: { allowPasswordChange?: boolean }): Promise<CurrentUser> {
    const user = await getCurrentUser();
    if (!user) redirect("/login");
    if (user.mustChangePassword && !options?.allowPasswordChange) redirect("/account/password");
    return user;
}

/** `requireUser` plus one permission flag; sends the user home when they lack it. */
export async function requirePermission(permission: keyof Permissions): Promise<CurrentUser> {
    const user = await requireUser();
    if (!user.permissions[permission]) redirect(homePathFor(user.permissions));
    return user;
}

/** Action-layer variant: throws instead of redirecting, so a client can show the failure. */
export async function assertPermission(permission: keyof Permissions): Promise<CurrentUser> {
    const user = await getCurrentUser();
    if (!user) throw new Error("Not signed in");
    if (user.mustChangePassword) throw new Error("Password change required");
    if (!user.permissions[permission]) throw new Error("Not allowed");
    return user;
}
