"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ThemeToggle } from "@/components/theme/ThemeToggle";

const LINKS = [
    { href: "/", label: "Dashboard" },
    { href: "/roster", label: "Counsellors" },
    { href: "/entry", label: "Monthly Entry" },
    { href: "/agencies", label: "Agencies" },
    { href: "/reports", label: "Reports" },
    { href: "/upload", label: "Upload & Preview" },
];

export function NavBar() {
    const pathname = usePathname();

    return (
        <nav data-component="NavBar" className="border-b border-border bg-card">
            <div className="mx-auto flex max-w-7xl items-center justify-between gap-1 px-4 sm:px-6 lg:px-8">
                <div className="flex gap-1 overflow-x-auto">
                    {LINKS.map((link) => {
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
                <ThemeToggle />
            </div>
        </nav>
    );
}
