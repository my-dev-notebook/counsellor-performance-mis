import Link from "next/link";

const LINKS = [
  { href: "/", label: "Dashboard" },
  { href: "/roster", label: "Counsellors" },
  { href: "/entry", label: "Monthly Entry" },
  { href: "/agencies", label: "Agencies" },
  { href: "/reports", label: "Reports" },
  { href: "/upload", label: "Upload & Preview" },
];

export function NavBar() {
  return (
    <nav data-component="NavBar" className="border-b border-zinc-200 bg-zinc-900">
      <div className="mx-auto flex max-w-7xl gap-1 px-4 sm:px-6 lg:px-8">
        {LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="px-3 py-2.5 text-sm font-medium text-zinc-300 hover:bg-zinc-800 hover:text-white"
          >
            {link.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
