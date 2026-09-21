import type { IconType } from "react-icons";
import {
    FiAlertTriangle,
    FiBarChart2,
    FiBriefcase,
    FiCalendar,
    FiEdit3,
    FiGrid,
    FiHeadphones,
    FiLayers,
    FiLink,
    FiPlusCircle,
    FiUploadCloud,
    FiUsers,
} from "react-icons/fi";
import type { Permissions, RoleName } from "@/lib/auth/permissions";

export type NavLink = {
    href: string;
    label: string;
    icon: IconType;
    requires: keyof Permissions | null;
    /** When set, only these roles see the link (on top of `requires`). */
    roles?: readonly RoleName[];
    /** Sub-pages shown indented under the parent while any of them is open. */
    children?: { href: string; label: string }[];
};

export type NavSection = { title: string; links: NavLink[] };

export const SECTIONS: NavSection[] = [
    {
        title: "Overview",
        links: [
            {
                href: "/",
                label: "Dashboard",
                icon: FiGrid,
                requires: "viewPerformance",
                children: [
                    { href: "/", label: "Monthly" },
                    { href: "/yearly", label: "Yearly" },
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

/** Sections and links the signed-in user may see. */
export function visibleSections(permissions: Permissions, roleName: string): NavSection[] {
    return SECTIONS.map((section) => ({
        ...section,
        links: section.links.filter(
            (link) =>
                (link.requires === null || permissions[link.requires]) &&
                (link.roles === undefined || link.roles.some((role) => role === roleName)),
        ),
    })).filter((section) => section.links.length > 0);
}

/** A parent with children is open for any child's route; a leaf matches exactly. */
export function isLinkActive(link: NavLink, pathname: string): boolean {
    return link.children
        ? link.children.some((child) => pathname === child.href || pathname.startsWith(`${child.href}/`))
        : pathname === link.href;
}

export type Crumb = { href: string; label: string };

/** Routes reachable from inside a page but not listed in the nav. */
const EXTRA_CRUMBS: { prefix: string; crumbs: Crumb[] }[] = [
    {
        prefix: "/entry/fetch",
        crumbs: [
            { href: "/entry/daily", label: "Daily Entry" },
            { href: "/entry/fetch", label: "Auto-fetch all" },
        ],
    },
    {
        prefix: "/quality/",
        crumbs: [
            { href: "/quality", label: "Call Audits" },
            { href: "", label: "Edit audit" },
        ],
    },
];

/**
 * Breadcrumb for the app header: `[section, page]` for nav routes, or the closest known ancestor plus a page label
 * for detail routes. The last crumb is the current page.
 */
export function breadcrumbFor(pathname: string): Crumb[] {
    for (const section of SECTIONS) {
        for (const link of section.links) {
            if (link.children) {
                const child = link.children.find((c) => c.href === pathname);
                if (child) {
                    return [
                        { href: link.href, label: link.label },
                        { href: child.href, label: child.label },
                    ];
                }
            } else if (link.href === pathname) {
                return [
                    { href: link.href, label: section.title },
                    { href: link.href, label: link.label },
                ];
            }
        }
    }
    const extra = EXTRA_CRUMBS.find((e) => pathname.startsWith(e.prefix));
    if (extra) return extra.crumbs.map((c) => (c.href === "" ? { ...c, href: pathname } : c));
    for (const section of SECTIONS) {
        for (const link of section.links) {
            if (link.href !== "/" && pathname.startsWith(`${link.href}/`)) {
                return [
                    { href: link.href, label: section.title },
                    { href: link.href, label: link.label },
                ];
            }
        }
    }
    return [{ href: pathname, label: "Dashboard" }];
}

export function initials(name: string): string {
    return name
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map((part) => part.charAt(0).toUpperCase())
        .join("");
}
