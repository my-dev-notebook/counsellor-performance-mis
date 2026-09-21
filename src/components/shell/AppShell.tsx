"use client";

import { useEffect, useLayoutEffect, useState } from "react";
import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/Sidebar";
import type { SidebarUser } from "@/components/Sidebar";
import { AppHeader } from "@/components/shell/AppHeader";
import type { Permissions } from "@/lib/auth/permissions";

const SIDEBAR_KEY = "sidebar";
const DESKTOP_QUERY = "(min-width: 1024px)";

function applyCollapsed(collapsed: boolean) {
    if (collapsed) document.documentElement.setAttribute("data-sidebar", "collapsed");
    else document.documentElement.removeAttribute("data-sidebar");
    try {
        if (collapsed) window.localStorage.setItem(SIDEBAR_KEY, "collapsed");
        else window.localStorage.removeItem(SIDEBAR_KEY);
    } catch {
        // Storage may be unavailable (private mode); the choice then lasts for the page only.
    }
}

/**
 * Signed-in page frame: sidebar + main column (sticky app header, page content, footer). On desktop the header's
 * menu button collapses the sidebar; the choice is kept in `localStorage` and restored before first paint by the
 * root layout's inline script (via `html[data-sidebar]`), so React's state only mirrors it after mount. Below the
 * desktop breakpoint the sidebar is hidden by the stylesheet and the same button opens it as a drawer.
 */
export function AppShell({
    user,
    permissions,
    children,
}: {
    user: SidebarUser;
    permissions: Permissions;
    children: ReactNode;
}) {
    const pathname = usePathname();
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [collapsed, setCollapsed] = useState(false);

    useLayoutEffect(() => {
        setCollapsed(document.documentElement.getAttribute("data-sidebar") === "collapsed");
    }, []);

    const toggleNav = () => {
        if (window.matchMedia(DESKTOP_QUERY).matches) {
            const next = !collapsed;
            setCollapsed(next);
            applyCollapsed(next);
        } else {
            setDrawerOpen(true);
        }
    };

    // Close the drawer after navigating.
    useEffect(() => {
        setDrawerOpen(false);
    }, [pathname]);

    useEffect(() => {
        if (!drawerOpen) return;
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") setDrawerOpen(false);
        };
        document.addEventListener("keydown", onKeyDown);
        return () => {
            document.removeEventListener("keydown", onKeyDown);
        };
    }, [drawerOpen]);

    return (
        <div data-component="AppShell" className="shell flex-1">
            <Sidebar user={user} permissions={permissions} />
            <div className="shell-main">
                <AppHeader user={user} sidebarCollapsed={collapsed} onToggleNav={toggleNav} />
                <div className="shell-content">{children}</div>
                <footer className="shell-foot">
                    <span>Counsellor Performance MIS</span>
                    <span>Signed in as {user.name}</span>
                </footer>
            </div>
            {drawerOpen && (
                <div className="drawer lg:hidden" role="dialog" aria-modal="true" aria-label="Navigation">
                    <button
                        type="button"
                        className="scrim"
                        aria-label="Close navigation"
                        onClick={() => {
                            setDrawerOpen(false);
                        }}
                    />
                    <Sidebar
                        user={user}
                        permissions={permissions}
                        onClose={() => {
                            setDrawerOpen(false);
                        }}
                    />
                </div>
            )}
        </div>
    );
}
