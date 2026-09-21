"use client";

import Link from "next/link";
import { FiCheckCircle } from "react-icons/fi";
import type { ImportResult } from "@/db/queries/imports";
import { formatMonthLabel } from "@/lib/format";

export function ImportResultPanel({ result, date }: { result: ImportResult; date: string }) {
    const line = (n: number, singular: string, plural = `${singular}s`) =>
        `${String(n)} ${n === 1 ? singular : plural}`;
    return (
        <section data-component="ImportResultPanel" className="alert alert-good">
            <FiCheckCircle aria-hidden />
            <div>
                <div className="title">Imported into {formatMonthLabel(date)}</div>
                <ul className="mt-1 flex flex-col gap-0.5">
                    <li>{line(result.inserted, "new monthly entry", "new monthly entries")}</li>
                    <li>{line(result.updated, "existing entry updated", "existing entries updated")}</li>
                    <li>{line(result.usersCreated, "user created")}</li>
                    <li>{line(result.rosterUpdated, "roster assignment updated", "roster assignments updated")}</li>
                    <li>{line(result.skipped, "row skipped or unchanged", "rows skipped or unchanged")}</li>
                </ul>
                <div className="mt-3 flex flex-wrap gap-3">
                    <Link href={`/entry?date=${date}`} className="btn btn-secondary btn-sm">
                        Open monthly entry
                    </Link>
                    <Link href={`/entry/discrepancies?date=${date}`} className="btn btn-secondary btn-sm">
                        Review discrepancies
                    </Link>
                </div>
            </div>
        </section>
    );
}
