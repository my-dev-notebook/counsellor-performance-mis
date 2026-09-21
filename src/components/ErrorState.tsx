import { FiAlertCircle } from "react-icons/fi";
import { describeParseError } from "@/lib/parser/errors";
import type { ParseError } from "@/lib/parser/errors";

/** §7 "Zero team sheets matched" — full-page empty state listing every sheet found and why each was rejected. */
export function ErrorState({ error, fileName }: { error: ParseError; fileName: string }) {
    return (
        <div data-component="ErrorState" className="alert alert-bad mx-auto w-full max-w-2xl">
            <FiAlertCircle aria-hidden />
            <div className="min-w-0">
                <div className="title">Couldn&apos;t build a report from {fileName}</div>
                <p>{describeParseError(error)}</p>
                {error.kind === "NoTeamSheetsFound" && (
                    <div className="mt-3 flex flex-col gap-1">
                        {error.warnings
                            .filter((w) => w.code === "SHEET_IGNORED")
                            .map((w, i) => (
                                <p key={i}>
                                    <span className="font-medium">{w.sheet}</span> — {w.message}
                                </p>
                            ))}
                    </div>
                )}
            </div>
        </div>
    );
}
