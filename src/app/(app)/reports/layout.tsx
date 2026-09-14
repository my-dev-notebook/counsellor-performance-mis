import type { ReactNode } from "react";

/** Report sub-pages are navigated from the main sidebar; this only frames the content. */
export default function ReportsLayout({ children }: { children: ReactNode }) {
    return (
        <div data-component="ReportsLayout" className="mx-auto w-full max-w-7xl flex-1 space-y-6 px-4 py-6 sm:px-6 lg:px-8">
            {children}
        </div>
    );
}
