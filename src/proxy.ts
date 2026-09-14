import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Optimistic auth gate: a request with no session cookie is bounced to /login
 * before any rendering happens. The cookie is NOT validated here (that would
 * mean a DB hit on every prefetch) — every page and action still goes through
 * `requireUser` in src/lib/auth/session.ts, which is the real check.
 *
 * When a cookie IS present it is re-issued with a fresh 7-day expiry, which
 * is the browser-side half of "sessions slide on activity" (the DB half is
 * `extendSession`, done by `getCurrentUser`). A cookie whose server-side row
 * has expired is harmless: the lookup fails and the user lands on /login.
 */
const SESSION_COOKIE = "session";
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const PUBLIC_PATHS = new Set(["/login"]);

export function proxy(request: NextRequest) {
    const { pathname } = request.nextUrl;
    const sessionId = request.cookies.get(SESSION_COOKIE)?.value;

    if (!sessionId) {
        if (PUBLIC_PATHS.has(pathname)) return NextResponse.next();
        const login = new URL("/login", request.nextUrl);
        if (pathname !== "/") login.searchParams.set("next", pathname);
        return NextResponse.redirect(login);
    }

    const response = NextResponse.next();
    response.cookies.set(SESSION_COOKIE, sessionId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        expires: new Date(Date.now() + SESSION_TTL_MS),
    });
    return response;
}

export const config = {
    // Everything except Next internals, the favicon and static assets.
    matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|ico|css|js|woff2?)$).*)"],
};
