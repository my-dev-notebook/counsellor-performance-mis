"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FiX } from "react-icons/fi";
import { isLinkActive, visibleSections } from "@/components/shell/nav";
import type { NavLink } from "@/components/shell/nav";
import type { Permissions } from "@/lib/auth/permissions";

export type SidebarUser = { name: string; roleName: string; teamName: string | null };

function SidebarLink({ link, pathname }: { link: NavLink; pathname: string }) {
    const Icon = link.icon;
    const active = isLinkActive(link, pathname);

    return (
        <div data-component="SidebarLink">
            <Link
                href={link.href}
                aria-current={active && !link.children ? "page" : undefined}
                className={`nav-link ${active && link.children ? "parent-open" : ""}`}
            >
                <Icon aria-hidden />
                <span className="truncate">{link.label}</span>
            </Link>
            {link.children && active && (
                <div className="nav-children">
                    {link.children.map((child) => (
                        <Link
                            key={child.href}
                            href={child.href}
                            aria-current={pathname === child.href ? "page" : undefined}
                            className="nav-link"
                        >
                            {child.label}
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
}

/**
 * The navigation column. Rendered once as the desktop sidebar and again inside the mobile drawer (see `AppShell`);
 * `onClose` is only passed by the drawer, which shows a close button in the brand row. The user's role decides which
 * sections show; the user menu itself lives in `AppHeader`.
 */
export function Sidebar({
    user,
    permissions,
    onClose,
}: {
    user: SidebarUser;
    permissions: Permissions;
    onClose?: () => void;
}) {
    const pathname = usePathname();
    const sections = visibleSections(permissions, user.roleName);

    return (
        <aside data-component="Sidebar" className="sidebar" id={onClose ? "app-drawer" : "app-sidebar"}>
            <div className="brand">
                <Link href="/" className="mark" aria-label="Dashboard">
                    CP
                </Link>
                <div className="min-w-0">
                    <div className="name truncate">Counsellor Performance</div>
                    <div className="sub">Advanced MIS</div>
                </div>
                {onClose && (
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Close navigation"
                        className="btn btn-ghost btn-icon btn-sm ml-auto"
                    >
                        <FiX aria-hidden />
                    </button>
                )}
            </div>

            <nav className="nav">
                {sections.map((section) => (
                    <div key={section.title}>
                        <div className="nav-section-title">{section.title}</div>
                        <div className="flex flex-col gap-px">
                            {section.links.map((link) => (
                                <SidebarLink key={link.href} link={link} pathname={pathname} />
                            ))}
                        </div>
                    </div>
                ))}
            </nav>
        </aside>
    );
}
