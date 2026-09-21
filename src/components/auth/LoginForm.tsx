"use client";

import { useActionState } from "react";
import { FiAlertCircle, FiMail } from "react-icons/fi";
import { PasswordInput } from "@/components/auth/PasswordInput";
import { loginAction } from "@/app/(auth)/actions";
import type { AuthFormState } from "@/app/(auth)/actions";

const INITIAL: AuthFormState = { error: null };

export function LoginForm({ next }: { next: string }) {
    const [state, action, pending] = useActionState(loginAction, INITIAL);

    return (
        <form data-component="LoginForm" action={action} className="stack gap-3.5">
            <input type="hidden" name="next" value={next} />
            <label className="field">
                <span className="label">Email</span>
                <span className="input-wrap">
                    <FiMail className="lead" aria-hidden />
                    <input
                        name="email"
                        type="email"
                        inputMode="email"
                        autoComplete="email"
                        required
                        className="input input-lg"
                    />
                </span>
            </label>
            <label className="field">
                <span className="label">Password</span>
                <PasswordInput withIcon name="password" autoComplete="current-password" required className="input-lg" />
            </label>
            <label className="checkbox items-center">
                <input type="checkbox" name="remember" defaultChecked />
                <span>Keep me signed in</span>
            </label>
            {state.error && (
                <p className="error-text" role="alert">
                    <FiAlertCircle aria-hidden />
                    {state.error}
                </p>
            )}
            <button type="submit" disabled={pending} className="btn btn-primary btn-lg btn-block mt-1">
                {pending && <span className="spinner" aria-hidden />}
                {pending ? "Signing in…" : "Sign in"}
            </button>
        </form>
    );
}
