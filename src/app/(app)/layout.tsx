import type { ReactNode } from "react";
import { AppShell } from "@/components/shell/AppShell";
import { requireUser } from "@/lib/auth/session";

/**
 * Every signed-in screen lives under this group. `requireUser` bounces to
 * /login when signed out and to the password-change page while the default
 * password is still in place; pages still call it themselves for the scope.
 */
export default async function AppLayout({ children }: { children: ReactNode }) {
    const user = await requireUser();
    return (
        <AppShell
            user={{ name: user.name, roleName: user.roleName, teamName: user.teamName }}
            permissions={user.permissions}
        >
            {children}
        </AppShell>
    );
}
