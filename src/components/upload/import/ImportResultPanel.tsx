"use client";

import Link from "next/link";
import type { ImportResult } from "@/db/queries/imports";
import { formatMonthLabel } from "@/lib/format";

export function ImportResultPanel({ result, date }: { result: ImportResult; date: string }) {
    const line = (n: number, singular: string, plural = `${singular}s`) => `${String(n)} ${n === 1 ? singular : plural}`;
    return (
        <section data-component="ImportResultPanel" className="rounded-lg border border-success/40 bg-success/10 p-4">
            <h3 className="text-sm font-semibold text-foreground">Imported into {formatMonthLabel(date)}</h3>
            <ul className="mt-2 space-y-1 text-sm text-foreground">
                <li>{line(result.inserted, "new monthly entry", "new monthly entries")}</li>
                <li>{line(result.updated, "existing entry updated", "existing entries updated")}</li>
                <li>{line(result.usersCreated, "user created")}</li>
                <li>{line(result.rosterUpdated, "roster assignment updated", "roster assignments updated")}</li>
                <li>{line(result.skipped, "row skipped or unchanged", "rows skipped or unchanged")}</li>
            </ul>
            <div className="mt-3 flex flex-wrap gap-3 text-sm">
                <Link href={`/entry?date=${date}`} className="font-medium text-primary hover:underline">
                    Open Monthly Entry
                </Link>
                <Link href={`/entry/discrepancies?date=${date}`} className="font-medium text-primary hover:underline">
                    Review discrepancies
                </Link>
            </div>
        </section>
    );
}
