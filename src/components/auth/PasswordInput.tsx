"use client";

import { useState, type ComponentProps } from "react";
import { FiEye, FiEyeOff, FiLock } from "react-icons/fi";

/**
 * Password field with a show/hide toggle in the trailing slot. The toggle is a button, so it never
 * submits the form and, inside a `<label>`, a click on it doesn't refocus the input. `withIcon`
 * adds the lock icon in the leading slot (the sign-in form); the change-password fields go without.
 */
export function PasswordInput({
    withIcon = false,
    className = "",
    ...inputProps
}: Omit<ComponentProps<"input">, "type"> & { withIcon?: boolean }) {
    const [shown, setShown] = useState(false);

    return (
        <span data-component="PasswordInput" className="input-wrap">
            {withIcon && <FiLock className="lead" aria-hidden />}
            <input
                {...inputProps}
                type={shown ? "text" : "password"}
                className={`input has-trail ${withIcon ? "" : "no-lead"} ${className}`}
            />
            <button
                type="button"
                onClick={() => {
                    setShown((v) => !v);
                }}
                aria-label={shown ? "Hide password" : "Show password"}
                aria-pressed={shown}
                className="btn btn-ghost btn-icon btn-sm reveal"
            >
                {shown ? <FiEyeOff aria-hidden /> : <FiEye aria-hidden />}
            </button>
        </span>
    );
}
