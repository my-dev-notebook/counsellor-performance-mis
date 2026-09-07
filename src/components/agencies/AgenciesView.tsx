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
                className="flex items-end gap-3 rounded-lg border border-border bg-card p-4"
            >
                <label className="flex flex-col text-xs font-medium text-muted-foreground">
                    New agency name
                    <input
                        value={name}
                        onChange={(e) => {
                            setName(e.target.value);
                        }}
                        className="mt-1 rounded-md border border-input bg-background px-2 py-1 text-sm text-foreground"
                    />
                </label>
                <button
                    type="submit"
                    disabled={pending}
                    className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                >
                    {pending ? "Adding…" : "Add"}
                </button>
                {error && <p className="text-xs text-destructive">{error}</p>}
            </form>

            {agencies.length === 0 ? (
                <p data-component="AgenciesView" className="py-8 text-center text-sm text-muted-foreground">
                    No agencies yet.
                </p>
            ) : (
                <ul className="divide-y divide-border rounded-lg border border-border bg-card">
                    {agencies.map((a) => (
                        <li key={a.id} className="px-4 py-2 text-sm text-foreground">
                            {a.name}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
