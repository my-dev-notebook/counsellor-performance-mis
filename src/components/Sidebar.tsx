"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { IconType } from "react-icons";
import {
    FiAlertTriangle,
    FiBarChart2,
    FiBriefcase,
    FiCalendar,
    FiEdit3,
    FiGrid,
    FiHeadphones,
    FiKey,
    FiLayers,
    FiLink,
    FiLogOut,
    FiMenu,
    FiPlusCircle,
    FiUploadCloud,
    FiUsers,
    FiX,
} from "react-icons/fi";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { logoutAction } from "@/app/(auth)/actions";
import type { Permissions, RoleName } from "@/lib/auth/permissions";
import { roleLabel } from "@/lib/auth/permissions";

type NavLink = {
    href: string;
    label: string;
    icon: IconType;
    requires: keyof Permissions | null;
    /** When set, only these roles see the link (on top of `requires`). */
    roles?: readonly RoleName[];
    /** Sub-pages shown indented under the parent while any of them is open. */
    children?: { href: string; label: string }[];
};

type NavSection = { title: string; links: NavLink[] };

const SECTIONS: NavSection[] = [
    {
        title: "Overview",
        links: [
            {
                href: "/",
                label: "Dashboard",
                icon: FiGrid,
                requires: "viewPerformance",
                children: [
                    { href: "/yearly", label: "Yearly" },
                    { href: "/", label: "Monthly" },
                ],
            },
            {
                href: "/reports",
                label: "Reports",
                icon: FiBarChart2,
                requires: "viewPerformance",
                children: [
                    { href: "/reports", label: "Overview" },
                    { href: "/reports/teams", label: "Team Performance" },
                ],
            },
        ],
    },
    {
        title: "Data Entry",
        links: [
            { href: "/entry", label: "Monthly Entry", icon: FiEdit3, requires: "writeEntries" },
            { href: "/entry/daily", label: "Daily Entry", icon: FiCalendar, requires: "writeEntries" },
            { href: "/entry/discrepancies", label: "Discrepancies", icon: FiAlertTriangle, requires: "writeEntries" },
        ],
    },
    {
        title: "Quality",
        links: [
            { href: "/quality", label: "Call Audits", icon: FiHeadphones, requires: "auditCalls" },
            { href: "/quality/new", label: "New Audit", icon: FiPlusCircle, requires: "auditCalls" },
            { href: "/quality/mine", label: "My Audits", icon: FiHeadphones, requires: null, roles: ["counsellor"] },
        ],
    },
    {
        title: "Manage",
        links: [
            { href: "/roster", label: "Users", icon: FiUsers, requires: "viewRoster" },
            { href: "/teams", label: "Teams", icon: FiLayers, requires: "manageTeams" },
            { href: "/agencies", label: "Agencies", icon: FiBriefcase, requires: "manageAgencies" },
        ],
    },
    {
        title: "Tools",
        links: [
            { href: "/upload", label: "Upload & Import", icon: FiUploadCloud, requires: "useTools" },
            { href: "/tools/meritto-auth", label: "Meritto Auth", icon: FiLink, requires: "useTools" },
        ],
    },
];

const ACTIVE = "bg-primary text-primary-foreground";
const INACTIVE = "text-muted-foreground hover:bg-accent hover:text-accent-foreground";

function SidebarLink({ link, pathname }: { link: NavLink; pathname: string }) {
    const Icon = link.icon;
    // A parent with children is "open" for any of its children's routes (a
    // prefix test on the parent alone would make "/" match everything); leaf
    // links match exactly.
    const active = link.children
        ? link.children.some((child) => pathname === child.href || pathname.startsWith(`${child.href}/`))
        : pathname === link.href;

    return (
        <div data-component="SidebarLink">
            <Link
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={`flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm font-medium ${
                    active && !link.children ? ACTIVE : active ? "text-foreground" : INACTIVE
                }`}
            >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="truncate">{link.label}</span>
            </Link>
            {link.children && active && (
                <div className="mt-0.5 ml-4.5 space-y-0.5 border-l border-border pl-2.5">
                    {link.children.map((child) => {
                        const childActive = pathname === child.href;
                        return (
                            <Link
                                key={child.href}
                                href={child.href}
                                aria-current={childActive ? "page" : undefined}
                                className={`block rounded-md px-2.5 py-1 text-sm ${childActive ? ACTIVE : INACTIVE}`}
                            >
                                {child.label}
                            </Link>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

function UserMenu({ user }: { user: { name: string; roleName: string; teamName: string | null } }) {
    const role = roleLabel(user.roleName);
    const row = `flex w-full items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm font-medium whitespace-nowrap ${INACTIVE}`;
    return (
        <div data-component="UserMenu" className="border-t border-border p-3">
            <div className="flex items-center justify-between gap-2 px-2.5 pb-2">
                <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">{user.name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                        {user.teamName ? `${role} · ${user.teamName}` : role}
                    </p>
                </div>
                <ThemeToggle />
            </div>
            <div className="space-y-0.5">
                <Link href="/account/password" className={row}>
                    <FiKey className="h-4 w-4 shrink-0" />
                    Change password
                </Link>
                <form action={logoutAction}>
                    <button type="submit" className={row}>
                        <FiLogOut className="h-4 w-4 shrink-0" />
                        Sign out
                    </button>
                </form>
            </div>
        </div>
    );
}

export function Sidebar({
    user,
    permissions,
}: {
    user: { name: string; roleName: string; teamName: string | null };
    permissions: Permissions;
}) {
    const pathname = usePathname();
    const [open, setOpen] = useState(false);

    // Close the mobile drawer after navigating.
    useEffect(() => {
        setOpen(false);
    }, [pathname]);

    const sections = SECTIONS.map((section) => ({
        ...section,
        links: section.links.filter(
            (link) =>
                (link.requires === null || permissions[link.requires]) &&
                (link.roles === undefined || link.roles.some((role) => role === user.roleName)),
        ),
    })).filter((section) => section.links.length > 0);

    return (
        <div data-component="Sidebar" className="contents">
            {/* Mobile top bar — only the hamburger and brand; the drawer holds everything else. */}
            <div className="flex items-center gap-3 border-b border-border bg-card px-4 py-2.5 lg:hidden">
                <button
                    type="button"
                    onClick={() => setOpen(true)}
                    aria-label="Open navigation"
                    aria-expanded={open}
                    aria-controls="app-sidebar"
                    className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                >
                    <FiMenu className="h-5 w-5" />
                </button>
                <span className="text-sm font-semibold tracking-tight text-foreground">Counsellor Performance MIS</span>
            </div>

            {open && (
                <button
                    type="button"
                    aria-label="Close navigation"
                    onClick={() => setOpen(false)}
                    className="fixed inset-0 z-30 bg-black/40 lg:hidden"
                />
            )}

            <aside
                id="app-sidebar"
                className={`fixed inset-y-0 left-0 z-40 flex w-64 shrink-0 flex-col border-r border-border bg-card transition-transform duration-200 lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 ${
                    open ? "translate-x-0" : "-translate-x-full"
                }`}
            >
                <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-4">
                    <Link href="/" className="min-w-0">
                        <p className="truncate text-sm font-semibold tracking-tight text-foreground">
                            Counsellor Performance
                        </p>
                        <p className="text-xs tracking-wide text-muted-foreground uppercase">Advanced MIS</p>
                    </Link>
                    <button
                        type="button"
                        onClick={() => setOpen(false)}
                        aria-label="Close navigation"
                        className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground lg:hidden"
                    >
                        <FiX className="h-5 w-5" />
                    </button>
                </div>

                <nav className="flex-1 space-y-5 overflow-y-auto p-3">
                    {sections.map((section) => (
                        <div key={section.title}>
                            <p className="px-2.5 pb-1.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                                {section.title}
                            </p>
                            <div className="space-y-0.5">
                                {section.links.map((link) => (
                                    <SidebarLink key={link.href} link={link} pathname={pathname} />
                                ))}
                            </div>
                        </div>
                    ))}
                </nav>

                <UserMenu user={user} />
            </aside>
        </div>
    );
}
