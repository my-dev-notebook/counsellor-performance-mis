"use client";

import { useState, useTransition } from "react";
import type { ProgressRow } from "@/db/types";
import { formatDate, formatText } from "@/lib/format";
import { saveEntryAction, getPrefillAction } from "@/app/entry/actions";

type AckValue = "yes" | "no" | "unset";

function ackToValue(ack: boolean | null): AckValue {
  if (ack === true) return "yes";
  if (ack === false) return "no";
  return "unset";
}

function valueToAck(v: AckValue): boolean | null {
  if (v === "yes") return true;
  if (v === "no") return false;
  return null;
}

export function EntryRow({
  row,
  year,
  month,
}: {
  row: ProgressRow;
  year: number;
  month: number;
}) {
  const { counsellor, entry } = row;
  const [open, setOpen] = useState(false);
  const [loadingPrefill, setLoadingPrefill] = useState(false);
  const [overall, setOverall] = useState<string>(entry?.overall?.toString() ?? "");
  const [nonNegotiable, setNonNegotiable] = useState<string>(entry?.nonNegotiable?.toString() ?? "");
  const [achieved, setAchieved] = useState<string>(entry?.achieved?.toString() ?? "");
  const [achievedFlagged, setAchievedFlagged] = useState(entry?.achievedFlagged ?? false);
  const [acknowledgment, setAcknowledgment] = useState<AckValue>(ackToValue(entry?.acknowledgment ?? null));
  const [feedback, setFeedback] = useState(entry?.feedback ?? "");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const toggleOpen = () => {
    const next = !open;
    setOpen(next);
    if (next && entry === null) {
      setLoadingPrefill(true);
      void getPrefillAction(counsellor.id, year, month)
        .then((prefill) => {
          if (prefill) {
            setOverall((cur) => (cur === "" ? (prefill.overall?.toString() ?? "") : cur));
            setNonNegotiable((cur) => (cur === "" ? (prefill.nonNegotiable?.toString() ?? "") : cur));
          }
        })
        .finally(() => {
          setLoadingPrefill(false);
        });
    }
  };

  const parseNumberField = (value: string): number | null => {
    if (value.trim() === "") return null;
    const n = Number.parseInt(value, 10);
    return Number.isFinite(n) ? n : null;
  };

  const save = () => {
    setError(null);
    startTransition(async () => {
      try {
        await saveEntryAction({
          userId: counsellor.id,
          year,
          month,
          overall: parseNumberField(overall),
          nonNegotiable: parseNumberField(nonNegotiable),
          achieved: parseNumberField(achieved),
          achievedFlagged,
          acknowledgment: valueToAck(acknowledgment),
          feedback: feedback.trim() === "" ? null : feedback,
        });
      } catch {
        setError("Failed to save. Check the values and try again.");
      }
    });
  };

  const status = entry === null ? "Pending" : "Filled";
  const flagged = entry?.achievedFlagged ?? false;

  return (
    <>
      <tr
        data-component="EntryRow"
        onClick={toggleOpen}
        aria-expanded={open}
        className={`cursor-pointer hover:bg-zinc-50 ${open ? "bg-zinc-50" : ""} ${counsellor.isActive ? "" : "opacity-50"}`}
      >
        <td className="px-3 py-2 font-medium text-zinc-900">{counsellor.name}</td>
        <td className="px-3 py-2 text-zinc-600">{counsellor.teamName}</td>
        <td className="px-3 py-2 text-zinc-600">{formatText(counsellor.agencyName)}</td>
        <td className="px-3 py-2">
          <div className="flex items-center gap-1.5">
            <span
              className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${
                status === "Filled" ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20" : "bg-zinc-100 text-zinc-600 ring-1 ring-zinc-500/20"
              }`}
            >
              {status}
            </span>
            {flagged && (
              <span className="inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700 ring-1 ring-amber-600/20">
                Flagged
              </span>
            )}
          </div>
        </td>
      </tr>
      {open && (
        <tr data-component="EntryRow" className="bg-zinc-50">
          <td colSpan={4} className="px-4 py-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="text-sm text-zinc-600">
                <p className="text-xs font-semibold tracking-wide text-zinc-400 uppercase">Email</p>
                <p>{formatText(counsellor.email)}</p>
              </div>
              <div className="text-sm text-zinc-600">
                <p className="text-xs font-semibold tracking-wide text-zinc-400 uppercase">DOJ</p>
                <p>{counsellor.doj ? formatDate(new Date(counsellor.doj)) : "—"}</p>
              </div>
              <div className="text-sm text-zinc-600">
                <p className="text-xs font-semibold tracking-wide text-zinc-400 uppercase">Team</p>
                <p>{counsellor.teamName}</p>
              </div>
              <div className="text-sm text-zinc-600">
                <p className="text-xs font-semibold tracking-wide text-zinc-400 uppercase">Agency</p>
                <p>{formatText(counsellor.agencyName)}</p>
              </div>
            </div>

            {loadingPrefill && <p className="mt-3 text-xs text-zinc-400">Loading last month&apos;s figures…</p>}

            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <label className="flex flex-col text-xs font-medium text-zinc-600">
                Overall / Target
                <input
                  type="number"
                  min={0}
                  value={overall}
                  onChange={(e) => {
                    setOverall(e.target.value);
                  }}
                  className="mt-1 rounded-md border border-zinc-300 px-2 py-1 text-sm"
                />
              </label>
              <label className="flex flex-col text-xs font-medium text-zinc-600">
                Non-Negotiable
                <input
                  type="number"
                  min={0}
                  value={nonNegotiable}
                  onChange={(e) => {
                    setNonNegotiable(e.target.value);
                  }}
                  className="mt-1 rounded-md border border-zinc-300 px-2 py-1 text-sm"
                />
              </label>
              <label className="flex flex-col text-xs font-medium text-zinc-600">
                Achieved
                <input
                  type="number"
                  min={0}
                  value={achieved}
                  onChange={(e) => {
                    setAchieved(e.target.value);
                  }}
                  className="mt-1 rounded-md border border-zinc-300 px-2 py-1 text-sm"
                />
                <span className="mt-1 flex items-center gap-1.5 text-xs font-normal text-zinc-500">
                  <input
                    type="checkbox"
                    checked={achievedFlagged}
                    onChange={(e) => {
                      setAchievedFlagged(e.target.checked);
                    }}
                  />
                  Flag as questionable
                </span>
              </label>
              <label className="flex flex-col text-xs font-medium text-zinc-600">
                Acknowledgment
                <select
                  value={acknowledgment}
                  onChange={(e) => {
                    setAcknowledgment(e.target.value as AckValue);
                  }}
                  className="mt-1 rounded-md border border-zinc-300 px-2 py-1 text-sm"
                >
                  <option value="unset">Unset</option>
                  <option value="yes">Yes</option>
                  <option value="no">No</option>
                </select>
              </label>
            </div>

            <label className="mt-4 flex flex-col text-xs font-medium text-zinc-600">
              Feedback
              <textarea
                value={feedback}
                onChange={(e) => {
                  setFeedback(e.target.value);
                }}
                rows={2}
                className="mt-1 rounded-md border border-zinc-300 px-2 py-1 text-sm"
              />
            </label>

            <div className="mt-4 flex items-center gap-3">
              <button
                type="button"
                disabled={pending}
                onClick={save}
                className="rounded-md bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50"
              >
                {pending ? "Saving…" : "Save"}
              </button>
              {error && <p className="text-xs text-red-600">{error}</p>}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
