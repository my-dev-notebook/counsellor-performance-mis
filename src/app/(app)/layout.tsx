import type { ReactNode } from "react";
import { Sidebar } from "@/components/Sidebar";
import { requireUser } from "@/lib/auth/session";

/**
 * Every signed-in screen lives under this group. `requireUser` bounces to
 * /login when signed out and to the password-change page while the default
 * password is still in place; pages still call it themselves for the scope.
 */
export default async function AppLayout({ children }: { children: ReactNode }) {
    const user = await requireUser();
    return (
        <div data-component="AppLayout" className="flex min-h-full flex-1 flex-col lg:flex-row">
            <Sidebar
                user={{ name: user.name, roleName: user.roleName, teamName: user.teamName }}
                permissions={user.permissions}
            />
            <div className="flex min-w-0 flex-1 flex-col">{children}</div>
        </div>
    );
}
