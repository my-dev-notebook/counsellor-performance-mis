"use client";

import { useActionState } from "react";
import { FiAlertCircle } from "react-icons/fi";
import { PasswordInput } from "@/components/auth/PasswordInput";
import { changePasswordAction, logoutAction } from "@/app/(auth)/actions";
import type { AuthFormState } from "@/app/(auth)/actions";
import { PASSWORD_MIN_LENGTH } from "@/schemas/auth";

const INITIAL: AuthFormState = { error: null };

export function ChangePasswordForm({ forced }: { forced: boolean }) {
    const [state, action, pending] = useActionState(changePasswordAction, INITIAL);

    return (
        <div data-component="ChangePasswordForm" className="stack gap-4">
            <form action={action} className="stack gap-3.5">
                <label className="field">
                    <span className="label">Current password</span>
                    <PasswordInput
                        name="currentPassword"
                        autoComplete="current-password"
                        required
                        className="input-lg"
                    />
                </label>
                <label className="field">
                    <span className="label">
                        New password <span className="opt">(at least {PASSWORD_MIN_LENGTH} characters)</span>
                    </span>
                    <PasswordInput
                        name="newPassword"
                        autoComplete="new-password"
                        minLength={PASSWORD_MIN_LENGTH}
                        required
                        className="input-lg"
                    />
                </label>
                <label className="field">
                    <span className="label">Confirm new password</span>
                    <PasswordInput
                        name="confirmPassword"
                        autoComplete="new-password"
                        minLength={PASSWORD_MIN_LENGTH}
                        required
                        className="input-lg"
                    />
                </label>
                {state.error && (
                    <p className="error-text" role="alert">
                        <FiAlertCircle aria-hidden />
                        {state.error}
                    </p>
                )}
                <button type="submit" disabled={pending} className="btn btn-primary btn-lg btn-block mt-1">
                    {pending && <span className="spinner" aria-hidden />}
                    {pending ? "Saving…" : "Save password"}
                </button>
            </form>
            <form action={logoutAction} className="text-center">
                <button type="submit" className="btn btn-link">
                    {forced ? "Sign out instead" : "Sign out"}
                </button>
            </form>
        </div>
    );
}
