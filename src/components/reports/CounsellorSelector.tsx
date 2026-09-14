"use client";

import { useRouter } from "next/navigation";
import type { PersonOption } from "@/db/queries/reports";
import { Select } from "@/components/Select";

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
                <Select
                    size="sm"
                    className="min-w-56"
                    placeholder="Select counsellor"
                    value={selectedUserId === undefined ? "" : String(selectedUserId)}
                    onChange={(userId) => {
                        router.push(`/reports/counsellor?userId=${userId}`);
                    }}
                    options={people.map((p) => ({ value: String(p.userId), label: p.name }))}
                />
            </label>
        </div>
    );
}
