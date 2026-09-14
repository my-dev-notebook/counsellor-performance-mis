"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { logoutAction } from "@/app/(auth)/actions";
import type { Permissions } from "@/lib/auth/permissions";

const LINKS: { href: string; label: string; requires: keyof Permissions | null }[] = [
    { href: "/", label: "Dashboard", requires: null },
    { href: "/roster", label: "Counsellors", requires: "readTeamRows" },
    { href: "/entry", label: "Monthly Entry", requires: "writeEntries" },
    { href: "/entry/daily", label: "Daily Entry", requires: "writeEntries" },
    { href: "/agencies", label: "Agencies", requires: "manageAgencies" },
    { href: "/reports", label: "Reports", requires: null },
    { href: "/upload", label: "Upload & Preview", requires: "useTools" },
    { href: "/tools/meritto-auth", label: "Meritto Auth", requires: "useTools" },
];

const ROLE_LABELS: Record<string, string> = {
    counsellor: "Counsellor",
    team_leader: "Team Leader",
    mis_executive: "MIS Executive",
    admin: "Admin",
};

function UserMenu({ user }: { user: { name: string; roleName: string; teamName: string | null } }) {
    const role = ROLE_LABELS[user.roleName] ?? user.roleName;
    return (
        <div data-component="UserMenu" className="flex items-center gap-3 whitespace-nowrap">
            <div className="hidden text-right sm:block">
                <p className="text-sm font-medium text-foreground">{user.name}</p>
                <p className="text-xs text-muted-foreground">{user.teamName ? `${role} · ${user.teamName}` : role}</p>
            </div>
            <Link
                href="/account/password"
                className="text-xs font-medium text-muted-foreground hover:text-foreground hover:underline"
            >
                Password
            </Link>
            <form action={logoutAction}>
                <button
                    type="submit"
                    className="text-xs font-medium text-muted-foreground hover:text-foreground hover:underline"
                >
                    Sign out
                </button>
            </form>
        </div>
    );
}

export function NavBar({
    user,
    permissions,
}: {
    user: { name: string; roleName: string; teamName: string | null };
    permissions: Permissions;
}) {
    const pathname = usePathname();
    const links = LINKS.filter((link) => link.requires === null || permissions[link.requires]);

    return (
        <nav data-component="NavBar" className="border-b border-border bg-card">
            <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
                <div className="flex gap-1 overflow-x-auto">
                    {links.map((link) => {
                        const active = pathname === link.href;
                        return (
                            <Link
                                key={link.href}
                                href={link.href}
                                className={`px-3 py-2.5 text-sm font-medium whitespace-nowrap ${
                                    active
                                        ? "text-foreground"
                                        : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                                }`}
                            >
                                {link.label}
                            </Link>
                        );
                    })}
                </div>
                <div className="flex items-center gap-3">
                    <UserMenu user={user} />
                    <ThemeToggle />
                </div>
            </div>
        </nav>
    );
}
