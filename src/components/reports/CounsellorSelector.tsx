"use client";

import { useRouter } from "next/navigation";
import type { PersonOption } from "@/db/queries/reports";

export function CounsellorSelector({
    people,
    selectedUserId,
}: {
    people: PersonOption[];
    selectedUserId: number | undefined;
}) {
    const router = useRouter();

    return (
        <div data-component="CounsellorSelector" className="flex items-center gap-2">
            <label className="flex items-center gap-1.5 text-sm text-muted-foreground">
                Counsellor
                <select
                    value={selectedUserId ?? ""}
                    onChange={(e) => {
                        router.push(`/reports/counsellor?userId=${e.target.value}`);
                    }}
                    className="min-w-56 rounded-md border border-input bg-background px-2 py-1 text-sm text-foreground"
                >
                    {people.map((p) => (
                        <option key={p.userId} value={p.userId}>
                            {p.name}
                        </option>
                    ))}
                </select>
            </label>
        </div>
    );
}
