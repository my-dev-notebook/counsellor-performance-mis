"use server";

import { redirect } from "next/navigation";
import { getUserForLogin, getPasswordState, setPassword } from "@/db/queries/users";
import { deleteExpiredSessions, deleteSessionsForUser } from "@/db/queries/sessions";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { endSession, requireUser, startSession } from "@/lib/auth/session";
import { ChangePasswordInput, LoginInput } from "@/schemas/auth";

export interface AuthFormState {
    error: string | null;
}

/** Only ever sends the browser somewhere on this site. */
function safeNextPath(value: FormDataEntryValue | null): string {
    return typeof value === "string" && value.startsWith("/") && !value.startsWith("//") ? value : "/";
}

export async function loginAction(_state: AuthFormState, formData: FormData): Promise<AuthFormState> {
    const parsed = LoginInput.safeParse({ email: formData.get("email"), password: formData.get("password") });
    if (!parsed.success) return { error: "Enter your email and password." };

    const user = await getUserForLogin(parsed.data.email);
    // Same message whether the email is unknown, the password is wrong, or
    // the account is inactive — nothing to enumerate.
    const invalid = { error: "Incorrect email or password." };
    if (!user) return invalid;
    const ok = await verifyPassword(parsed.data.password, user.passwordHash);
    if (!ok || !user.isActive) return invalid;

    await deleteExpiredSessions(new Date());
    await startSession(user.id);
    redirect(safeNextPath(formData.get("next")));
}

export async function logoutAction(): Promise<void> {
    await endSession();
    redirect("/login");
}

export async function changePasswordAction(_state: AuthFormState, formData: FormData): Promise<AuthFormState> {
    const user = await requireUser({ allowPasswordChange: true });
    const parsed = ChangePasswordInput.safeParse({
        currentPassword: formData.get("currentPassword"),
        newPassword: formData.get("newPassword"),
        confirmPassword: formData.get("confirmPassword"),
    });
    if (!parsed.success) {
        return { error: parsed.error.issues[0]?.message ?? "Check the form and try again." };
    }
    if (parsed.data.newPassword === parsed.data.currentPassword) {
        return { error: "The new password must be different from the current one." };
    }

    const state = await getPasswordState(user.id);
    if (!state || !(await verifyPassword(parsed.data.currentPassword, state.passwordHash))) {
        return { error: "Current password is incorrect." };
    }

    await setPassword(user.id, await hashPassword(parsed.data.newPassword));
    // Every other device is signed out; this one gets a fresh session.
    await deleteSessionsForUser(user.id);
    await startSession(user.id);
    redirect("/");
}
