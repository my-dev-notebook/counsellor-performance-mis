import type { ReactNode } from "react";
import { AuthHeader } from "@/components/shell/AuthHeader";

/** Signed-out screens (sign-in, password change): a slim header over the centred card. */
export default function AuthLayout({ children }: { children: ReactNode }) {
    return (
        <div data-component="AuthLayout" className="bg-canvas flex min-h-full flex-1 flex-col">
            <AuthHeader />
            {children}
        </div>
    );
}
