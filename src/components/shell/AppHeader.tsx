"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Fragment } from "react";
import { FiChevronRight, FiGithub, FiMenu } from "react-icons/fi";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import type { SidebarUser } from "@/components/Sidebar";
import { breadcrumbFor } from "@/components/shell/nav";
import { UserMenu } from "@/components/shell/UserMenu";
import { Tooltip } from "@/components/Tooltip";

const REPO_URL = "https://github.com/my-dev-notebook/counsellor-performance-mis";

/** Sticky top bar: breadcrumb for the current route, repo link, theme toggle and the signed-in user's avatar menu. */
export function AppHeader({
    user,
    sidebarCollapsed,
    onToggleNav,
}: {
    user: SidebarUser;
    sidebarCollapsed: boolean;
    onToggleNav: () => void;
}) {
    const pathname = usePathname();
    const crumbs = breadcrumbFor(pathname);
    const current = crumbs[crumbs.length - 1];
    const parents = crumbs.slice(0, -1);

    return (
        <header data-component="AppHeader" className="app-header">
            <Tooltip content={sidebarCollapsed ? "Show sidebar" : "Hide sidebar"}>
                <button
                    type="button"
                    onClick={onToggleNav}
                    aria-label={sidebarCollapsed ? "Show navigation" : "Hide navigation"}
                    aria-expanded={!sidebarCollapsed}
                    aria-controls="app-sidebar"
                    className="btn btn-ghost btn-icon btn-sm"
                >
                    <FiMenu aria-hidden />
                </button>
            </Tooltip>
            <div className="app-header-title">
                <nav aria-label="Breadcrumb" className="breadcrumb">
                    {parents.map((crumb) => (
                        <Fragment key={`${crumb.href}-${crumb.label}`}>
                            <Link href={crumb.href}>{crumb.label}</Link>
                            <FiChevronRight aria-hidden />
                        </Fragment>
                    ))}
                    {current && <span aria-current="page">{current.label}</span>}
                </nav>
            </div>
            <div className="app-header-actions">
                <Tooltip content="Source on GitHub">
                    <a
                        href={REPO_URL}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label="Source on GitHub"
                        className="btn btn-ghost btn-icon btn-sm"
                    >
                        <FiGithub aria-hidden />
                    </a>
                </Tooltip>
                <ThemeToggle />
                <UserMenu user={user} />
            </div>
        </header>
    );
}
