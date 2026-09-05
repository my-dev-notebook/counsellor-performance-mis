import type { Status } from "@/lib/parser/schemas";

const STYLES: Record<Status, string> = {
  Green: "bg-emerald-100 text-emerald-800 ring-emerald-600/20",
  Yellow: "bg-amber-100 text-amber-800 ring-amber-600/20",
  Red: "bg-red-100 text-red-800 ring-red-600/20",
  Unknown: "bg-zinc-100 text-zinc-600 ring-zinc-500/20",
};

export function StatusPill({ status }: { status: Status }) {
  return (
    <span
      data-component="StatusPill"
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${STYLES[status]}`}
    >
      {status}
    </span>
  );
}
