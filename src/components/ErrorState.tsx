import { describeParseError } from "@/lib/parser/errors";
import type { ParseError } from "@/lib/parser/errors";

/** §7 "Zero team sheets matched" — full-page empty state listing every sheet found and why each was rejected. */
export function ErrorState({ error, fileName }: { error: ParseError; fileName: string }) {
  return (
    <div
      data-component="ErrorState"
      className="mx-auto max-w-2xl rounded-xl border border-destructive/30 bg-destructive/10 p-8"
    >
      <h2 className="text-base font-semibold text-destructive">
        Couldn&apos;t build a report from {fileName}
      </h2>
      <p className="mt-2 text-sm text-destructive/90">{describeParseError(error)}</p>
      {error.kind === "NoTeamSheetsFound" && (
        <div className="mt-4 space-y-1 text-sm text-destructive/90">
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
  );
}
