"use client";

import { useActionState } from "react";
import { loginAction } from "@/app/(auth)/actions";
import type { AuthFormState } from "@/app/(auth)/actions";

const INITIAL: AuthFormState = { error: null };

export function LoginForm({ next }: { next: string }) {
    const [state, action, pending] = useActionState(loginAction, INITIAL);

    return (
        <form data-component="LoginForm" action={action} className="space-y-4 rounded-lg border border-border bg-card p-6">
            <input type="hidden" name="next" value={next} />
            <label className="flex flex-col text-xs font-medium text-muted-foreground">
                Email
                <input
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    className="mt-1 rounded-md border border-input bg-background px-2 py-1.5 text-sm text-foreground"
                />
            </label>
            <label className="flex flex-col text-xs font-medium text-muted-foreground">
                Password
                <input
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    required
                    className="mt-1 rounded-md border border-input bg-background px-2 py-1.5 text-sm text-foreground"
                />
            </label>
            {state.error && <p className="text-xs text-destructive">{state.error}</p>}
            <button
                type="submit"
                disabled={pending}
                className="w-full rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
                {pending ? "Signing in…" : "Sign in"}
            </button>
        </form>
    );
}
