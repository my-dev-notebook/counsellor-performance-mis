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
        <div data-component="SubjectSelector" className="card card-pad flex flex-wrap items-end gap-3">
            <label className="field w-64">
                <span className="label">Show</span>
                <Select
                    size="sm"
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
