"use client";

import { useActionState, useState, type KeyboardEvent } from "react";
import { FiAlertCircle, FiAlertTriangle, FiMail } from "react-icons/fi";
import { PasswordInput } from "@/components/auth/PasswordInput";
import { loginAction } from "@/app/(auth)/actions";
import type { AuthFormState } from "@/app/(auth)/actions";

const INITIAL: AuthFormState = { error: null };

export function LoginForm({ next }: { next: string }) {
    const [state, action, pending] = useActionState(loginAction, INITIAL);
    const [capsLock, setCapsLock] = useState(false);

    // `getModifierState` is only meaningful on a key event, so the hint follows key-ups and clears on blur.
    const onPasswordKey = (e: KeyboardEvent<HTMLInputElement>) => {
        setCapsLock(e.getModifierState("CapsLock"));
    };

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
                        placeholder="you@bennett.edu.in"
                        required
                        className="input input-lg"
                    />
                </span>
            </label>
            <label className="field">
                <span className="label">Password</span>
                <PasswordInput
                    withIcon
                    name="password"
                    autoComplete="current-password"
                    required
                    className="input-lg"
                    onKeyUp={onPasswordKey}
                    onKeyDown={onPasswordKey}
                    onBlur={() => {
                        setCapsLock(false);
                    }}
                />
                {capsLock && (
                    <span
                        role="status"
                        className="bg-warn-soft text-warn-soft-fg inline-flex w-fit items-center gap-1.5 rounded-sm px-2 py-1 text-xs"
                    >
                        <FiAlertTriangle aria-hidden />
                        Caps Lock is on
                    </span>
                )}
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
                {!pending && (
                    <span className="ml-2 hidden sm:inline" aria-hidden>
                        <kbd
                            className="kbd"
                            style={{ background: "transparent", color: "inherit", borderColor: "rgba(255,255,255,.4)" }}
                        >
                            ↵
                        </kbd>
                    </span>
                )}
            </button>
        </form>
    );
}
