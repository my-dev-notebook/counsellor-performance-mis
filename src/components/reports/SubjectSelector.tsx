"use client";

import { useRouter, useSearchParams } from "next/navigation";
import type { SelectOption } from "@/components/Select";
import { Select } from "@/components/Select";

/**
 * Who the Overview is about — the company, one team or one person. The
 * options are decided server-side from the reader's scope; this only pushes
 * `?subject=` onto the URL, keeping the selected month.
 */
export function SubjectSelector({ options, value }: { options: readonly SelectOption[]; value: string }) {
    const router = useRouter();
    const searchParams = useSearchParams();

    return (
        <div data-component="SubjectSelector" className="flex items-center gap-2">
            <label className="flex items-center gap-1.5 text-sm text-muted-foreground">
                Show
                <Select
                    size="sm"
                    className="min-w-56"
                    value={value}
                    onChange={(subject) => {
                        const params = new URLSearchParams(searchParams);
                        params.set("subject", subject);
                        router.push(`/reports?${params.toString()}`);
                    }}
                    options={options}
                />
            </label>
        </div>
    );
}
