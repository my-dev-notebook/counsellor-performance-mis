"use client";

import { useState, useTransition } from "react";
import type { Agency } from "@/db/types";
import { createAgencyAction } from "@/app/agencies/actions";

export function AgenciesView({ agencies }: { agencies: Agency[] }) {
  const [name, setName] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const submit = () => {
    if (name.trim() === "") {
      setError("Name is required.");
      return;
    }
    setError(null);
    startTransition(async () => {
      try {
        await createAgencyAction(name);
        setName("");
      } catch {
        setError("Failed to add agency (name may already exist).");
      }
    });
  };

  return (
    <div data-component="AgenciesView" className="space-y-4">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        className="flex items-end gap-3 rounded-lg border border-zinc-200 bg-white p-4"
      >
        <label className="flex flex-col text-xs font-medium text-zinc-600">
          New agency name
          <input
            value={name}
            onChange={(e) => {
              setName(e.target.value);
            }}
            className="mt-1 rounded-md border border-zinc-300 px-2 py-1 text-sm"
          />
        </label>
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50"
        >
          {pending ? "Adding…" : "Add"}
        </button>
        {error && <p className="text-xs text-red-600">{error}</p>}
      </form>

      {agencies.length === 0 ? (
        <p data-component="AgenciesView" className="py-8 text-center text-sm text-zinc-500">
          No agencies yet.
        </p>
      ) : (
        <ul className="divide-y divide-zinc-100 rounded-lg border border-zinc-200 bg-white">
          {agencies.map((a) => (
            <li key={a.id} className="px-4 py-2 text-sm text-zinc-900">
              {a.name}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
