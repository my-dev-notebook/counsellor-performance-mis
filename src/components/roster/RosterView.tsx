"use client";

import { useMemo, useState, useTransition } from "react";
import type { CounsellorRow, Team, Agency } from "@/db/types";
import { formatText } from "@/lib/format";
import {
  addCounsellorAction,
  updateProfileAction,
  changeAssignmentAction,
  deactivateCounsellorAction,
} from "@/app/roster/actions";

function AddCounsellorForm({ teams, agencies }: { teams: Team[]; agencies: Agency[] }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [doj, setDoj] = useState("");
  const [teamId, setTeamId] = useState(teams[0]?.id ?? 0);
  const [agencyId, setAgencyId] = useState<number | "">("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (!open) {
    return (
      <div data-component="AddCounsellorForm">
        <button
          type="button"
          onClick={() => {
            setOpen(true);
          }}
          className="rounded-md bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-700"
        >
          + Add Counsellor
        </button>
      </div>
    );
  }

  const submit = () => {
    if (name.trim() === "") {
      setError("Name is required.");
      return;
    }
    setError(null);
    startTransition(async () => {
      try {
        await addCounsellorAction({
          name,
          email: email.trim() === "" ? null : email.trim(),
          doj: doj.trim() === "" ? null : doj.trim(),
          teamId,
          agencyId: agencyId === "" ? null : agencyId,
        });
        setName("");
        setEmail("");
        setDoj("");
        setAgencyId("");
        setOpen(false);
      } catch {
        setError("Failed to add counsellor.");
      }
    });
  };

  return (
    <form
      data-component="AddCounsellorForm"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      className="flex flex-wrap items-end gap-3 rounded-lg border border-zinc-200 bg-white p-4"
    >
      <label className="flex flex-col text-xs font-medium text-zinc-600">
        Name
        <input
          value={name}
          onChange={(e) => {
            setName(e.target.value);
          }}
          className="mt-1 rounded-md border border-zinc-300 px-2 py-1 text-sm"
        />
      </label>
      <label className="flex flex-col text-xs font-medium text-zinc-600">
        Email
        <input
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
          }}
          className="mt-1 rounded-md border border-zinc-300 px-2 py-1 text-sm"
        />
      </label>
      <label className="flex flex-col text-xs font-medium text-zinc-600">
        DOJ
        <input
          type="date"
          value={doj}
          onChange={(e) => {
            setDoj(e.target.value);
          }}
          className="mt-1 rounded-md border border-zinc-300 px-2 py-1 text-sm"
        />
      </label>
      <label className="flex flex-col text-xs font-medium text-zinc-600">
        Team
        <select
          value={teamId}
          onChange={(e) => {
            setTeamId(Number(e.target.value));
          }}
          className="mt-1 rounded-md border border-zinc-300 px-2 py-1 text-sm"
        >
          {teams.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col text-xs font-medium text-zinc-600">
        Agency
        <select
          value={agencyId}
          onChange={(e) => {
            setAgencyId(e.target.value === "" ? "" : Number(e.target.value));
          }}
          className="mt-1 rounded-md border border-zinc-300 px-2 py-1 text-sm"
        >
          <option value="">—</option>
          {agencies.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
      </label>
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50"
      >
        {pending ? "Saving…" : "Save"}
      </button>
      <button
        type="button"
        onClick={() => {
          setOpen(false);
        }}
        className="rounded-md px-3 py-1.5 text-sm font-medium text-zinc-500 hover:bg-zinc-100"
      >
        Cancel
      </button>
      {error && <p className="w-full text-xs text-red-600">{error}</p>}
    </form>
  );
}

function RosterRow({
  counsellor,
  teams,
  agencies,
}: {
  counsellor: CounsellorRow;
  teams: Team[];
  agencies: Agency[];
}) {
  const [mode, setMode] = useState<"view" | "edit-profile" | "change-assignment">("view");
  const [name, setName] = useState(counsellor.name);
  const [email, setEmail] = useState(counsellor.email ?? "");
  const [doj, setDoj] = useState(counsellor.doj ?? "");
  const [teamId, setTeamId] = useState(counsellor.teamId);
  const [agencyId, setAgencyId] = useState<number | "">(counsellor.agencyId ?? "");
  const [pending, startTransition] = useTransition();

  const resetProfileFields = () => {
    setName(counsellor.name);
    setEmail(counsellor.email ?? "");
    setDoj(counsellor.doj ?? "");
  };

  if (mode === "edit-profile") {
    return (
      <tr data-component="RosterRow" className="bg-amber-50/40">
        <td className="px-3 py-2">
          <input
            value={name}
            onChange={(e) => {
              setName(e.target.value);
            }}
            className="w-full rounded-md border border-zinc-300 px-2 py-1 text-sm"
          />
        </td>
        <td className="px-3 py-2 text-zinc-500">{counsellor.teamName}</td>
        <td className="px-3 py-2 text-zinc-500">{formatText(counsellor.agencyName)}</td>
        <td className="px-3 py-2">
          <input
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
            }}
            placeholder="email"
            className="mb-1 w-full rounded-md border border-zinc-300 px-2 py-1 text-sm"
          />
          <input
            type="date"
            value={doj}
            onChange={(e) => {
              setDoj(e.target.value);
            }}
            className="w-full rounded-md border border-zinc-300 px-2 py-1 text-sm"
          />
        </td>
        <td className="px-3 py-2 text-zinc-500">{counsellor.isActive ? "Active" : "Inactive"}</td>
        <td className="px-3 py-2">
          <div className="flex gap-2">
            <button
              disabled={pending}
              onClick={() => {
                startTransition(async () => {
                  await updateProfileAction(counsellor.id, {
                    name,
                    email: email.trim() === "" ? null : email.trim(),
                    doj: doj.trim() === "" ? null : doj.trim(),
                  });
                  setMode("view");
                });
              }}
              className="rounded-md bg-zinc-900 px-2 py-1 text-xs font-medium text-white hover:bg-zinc-700 disabled:opacity-50"
            >
              Save
            </button>
            <button
              onClick={() => {
                resetProfileFields();
                setMode("view");
              }}
              className="rounded-md px-2 py-1 text-xs font-medium text-zinc-500 hover:bg-zinc-100"
            >
              Cancel
            </button>
          </div>
        </td>
      </tr>
    );
  }

  if (mode === "change-assignment") {
    return (
      <tr data-component="RosterRow" className="bg-sky-50/40">
        <td className="px-3 py-2 font-medium text-zinc-900">{counsellor.name}</td>
        <td className="px-3 py-2">
          <select
            value={teamId}
            onChange={(e) => {
              setTeamId(Number(e.target.value));
            }}
            className="rounded-md border border-zinc-300 px-2 py-1 text-sm"
          >
            {teams.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </td>
        <td className="px-3 py-2">
          <select
            value={agencyId}
            onChange={(e) => {
              setAgencyId(e.target.value === "" ? "" : Number(e.target.value));
            }}
            className="rounded-md border border-zinc-300 px-2 py-1 text-sm"
          >
            <option value="">—</option>
            {agencies.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </td>
        <td className="px-3 py-2 text-zinc-500">{formatText(counsellor.email)}</td>
        <td className="px-3 py-2 text-zinc-500">{counsellor.isActive ? "Active" : "Inactive"}</td>
        <td className="px-3 py-2">
          <div className="flex gap-2">
            <button
              disabled={pending}
              onClick={() => {
                startTransition(async () => {
                  await changeAssignmentAction(counsellor.id, {
                    teamId,
                    agencyId: agencyId === "" ? null : agencyId,
                  });
                  setMode("view");
                });
              }}
              className="rounded-md bg-zinc-900 px-2 py-1 text-xs font-medium text-white hover:bg-zinc-700 disabled:opacity-50"
            >
              Save (new assignment row)
            </button>
            <button
              onClick={() => {
                setTeamId(counsellor.teamId);
                setAgencyId(counsellor.agencyId ?? "");
                setMode("view");
              }}
              className="rounded-md px-2 py-1 text-xs font-medium text-zinc-500 hover:bg-zinc-100"
            >
              Cancel
            </button>
          </div>
        </td>
      </tr>
    );
  }

  return (
    <tr data-component="RosterRow" className={counsellor.isActive ? "" : "opacity-50"}>
      <td className="px-3 py-2 font-medium text-zinc-900">{counsellor.name}</td>
      <td className="px-3 py-2 text-zinc-600">{counsellor.teamName}</td>
      <td className="px-3 py-2 text-zinc-600">{formatText(counsellor.agencyName)}</td>
      <td className="px-3 py-2 text-zinc-600">{formatText(counsellor.email)}</td>
      <td className="px-3 py-2 text-zinc-600">{counsellor.isActive ? "Active" : "Inactive"}</td>
      <td className="px-3 py-2">
        {counsellor.isActive && (
          <div className="flex gap-2">
            <button
              onClick={() => {
                setMode("edit-profile");
              }}
              className="text-xs font-medium text-zinc-600 hover:text-zinc-900 hover:underline"
            >
              Edit profile
            </button>
            <button
              onClick={() => {
                setMode("change-assignment");
              }}
              className="text-xs font-medium text-zinc-600 hover:text-zinc-900 hover:underline"
            >
              Change team/agency
            </button>
            <button
              disabled={pending}
              onClick={() => {
                if (!confirm(`Deactivate ${counsellor.name}?`)) return;
                startTransition(async () => {
                  await deactivateCounsellorAction(counsellor.id);
                });
              }}
              className="text-xs font-medium text-red-600 hover:text-red-800 hover:underline disabled:opacity-50"
            >
              Deactivate
            </button>
          </div>
        )}
      </td>
    </tr>
  );
}

export function RosterView({
  counsellors,
  teams,
  agencies,
}: {
  counsellors: CounsellorRow[];
  teams: Team[];
  agencies: Agency[];
}) {
  const [search, setSearch] = useState("");
  const [teamFilter, setTeamFilter] = useState<number | "">("");
  const [agencyFilter, setAgencyFilter] = useState<number | "">("");
  const [showInactive, setShowInactive] = useState(false);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return counsellors.filter((c) => {
      if (!showInactive && !c.isActive) return false;
      if (q !== "" && !c.name.toLowerCase().includes(q)) return false;
      if (teamFilter !== "" && c.teamId !== teamFilter) return false;
      if (agencyFilter !== "" && c.agencyId !== agencyFilter) return false;
      return true;
    });
  }, [counsellors, search, teamFilter, agencyFilter, showInactive]);

  return (
    <div data-component="RosterView" className="space-y-4">
      <AddCounsellorForm teams={teams} agencies={agencies} />

      <div className="flex flex-wrap items-center gap-3">
        <input
          placeholder="Search by name…"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
          }}
          className="rounded-md border border-zinc-300 px-2 py-1.5 text-sm"
        />
        <select
          value={teamFilter}
          onChange={(e) => {
            setTeamFilter(e.target.value === "" ? "" : Number(e.target.value));
          }}
          className="rounded-md border border-zinc-300 px-2 py-1.5 text-sm"
        >
          <option value="">All teams</option>
          {teams.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
        <select
          value={agencyFilter}
          onChange={(e) => {
            setAgencyFilter(e.target.value === "" ? "" : Number(e.target.value));
          }}
          className="rounded-md border border-zinc-300 px-2 py-1.5 text-sm"
        >
          <option value="">All agencies</option>
          {agencies.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
        <label className="flex items-center gap-1.5 text-sm text-zinc-600">
          <input
            type="checkbox"
            checked={showInactive}
            onChange={(e) => {
              setShowInactive(e.target.checked);
            }}
          />
          Show inactive
        </label>
      </div>

      {filtered.length === 0 ? (
        <p data-component="RosterView" className="py-8 text-center text-sm text-zinc-500">
          No counsellors match the current filters.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-zinc-200 bg-white">
          <table className="min-w-full divide-y divide-zinc-200 text-sm">
            <thead className="bg-zinc-50">
              <tr>
                {["Name", "Team", "Agency", "Email", "Status", "Actions"].map((h) => (
                  <th
                    key={h}
                    className="px-3 py-2 text-left text-xs font-semibold tracking-wide text-zinc-500 uppercase"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {filtered.map((c) => (
                <RosterRow key={c.id} counsellor={c} teams={teams} agencies={agencies} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
