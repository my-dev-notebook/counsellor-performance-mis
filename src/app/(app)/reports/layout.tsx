import type { ReactNode } from "react";

/** Report sub-pages are navigated from the main sidebar; this only frames the content. */
export default function ReportsLayout({ children }: { children: ReactNode }) {
    return (
        <div data-component="ReportsLayout" className="stack gap-5">
            {children}
        </div>
    );
}
