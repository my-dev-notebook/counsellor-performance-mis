"use client";

import { useActionState } from "react";
import { changePasswordAction, logoutAction } from "@/app/(auth)/actions";
import type { AuthFormState } from "@/app/(auth)/actions";
import { PASSWORD_MIN_LENGTH } from "@/schemas/auth";

const INITIAL: AuthFormState = { error: null };

export function ChangePasswordForm({ forced }: { forced: boolean }) {
    const [state, action, pending] = useActionState(changePasswordAction, INITIAL);

    return (
        <div data-component="ChangePasswordForm" className="space-y-3">
            <form action={action} className="space-y-4 rounded-lg border border-border bg-card p-6">
                <label className="flex flex-col text-xs font-medium text-muted-foreground">
                    Current password
                    <input
                        name="currentPassword"
                        type="password"
                        autoComplete="current-password"
                        required
                        className="mt-1 rounded-md border border-input bg-background px-2 py-1.5 text-sm text-foreground"
                    />
                </label>
                <label className="flex flex-col text-xs font-medium text-muted-foreground">
                    New password (at least {PASSWORD_MIN_LENGTH} characters)
                    <input
                        name="newPassword"
                        type="password"
                        autoComplete="new-password"
                        minLength={PASSWORD_MIN_LENGTH}
                        required
                        className="mt-1 rounded-md border border-input bg-background px-2 py-1.5 text-sm text-foreground"
                    />
                </label>
                <label className="flex flex-col text-xs font-medium text-muted-foreground">
                    Confirm new password
                    <input
                        name="confirmPassword"
                        type="password"
                        autoComplete="new-password"
                        minLength={PASSWORD_MIN_LENGTH}
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
                    {pending ? "Saving…" : "Save password"}
                </button>
            </form>
            <form action={logoutAction} className="text-center">
                <button type="submit" className="text-xs font-medium text-muted-foreground hover:text-foreground hover:underline">
                    {forced ? "Sign out instead" : "Sign out"}
                </button>
            </form>
        </div>
    );
}
