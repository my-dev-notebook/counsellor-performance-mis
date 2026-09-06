"use client";

import { useRouter } from "next/navigation";
import type { PersonOption } from "@/db/queries/reports";

export function CounsellorSelector({
  people,
  selectedPersonId,
}: {
  people: PersonOption[];
  selectedPersonId: number | undefined;
}) {
  const router = useRouter();

  return (
    <div data-component="CounsellorSelector" className="flex items-center gap-2">
      <label className="flex items-center gap-1.5 text-sm text-zinc-600">
        Counsellor
        <select
          value={selectedPersonId ?? ""}
          onChange={(e) => {
            router.push(`/reports/counsellor?personId=${e.target.value}`);
          }}
          className="min-w-56 rounded-md border border-zinc-300 px-2 py-1 text-sm"
        >
          {people.map((p) => (
            <option key={p.personId} value={p.personId}>
              {p.name}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
