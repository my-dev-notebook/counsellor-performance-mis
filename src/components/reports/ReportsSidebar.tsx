"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/reports", label: "Overview" },
  { href: "/reports/teams", label: "Team Performance" },
  { href: "/reports/counsellor", label: "Counsellor History" },
];

export function ReportsSidebar() {
  const pathname = usePathname();

  return (
    <nav data-component="ReportsSidebar" className="w-56 shrink-0 border-r border-zinc-200 bg-white p-3">
      <p className="px-2 pb-2 text-xs font-semibold tracking-wide text-zinc-400 uppercase">Reports</p>
      <div className="space-y-0.5">
        {LINKS.map((link) => {
          const active = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`block rounded-md px-2.5 py-1.5 text-sm font-medium ${
                active ? "bg-zinc-900 text-white" : "text-zinc-600 hover:bg-zinc-100"
              }`}
            >
              {link.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
