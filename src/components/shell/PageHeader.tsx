import type { ReactNode } from "react";

/** Title row at the top of every page: heading, optional one-line description and right-aligned actions. */
export function PageHeader({ title, sub, actions }: { title: ReactNode; sub?: ReactNode; actions?: ReactNode }) {
    return (
        <div data-component="PageHeader" className="page-header">
            <div className="min-w-0">
                <h1 className="t-h1">{title}</h1>
                {sub && <p className="sub">{sub}</p>}
            </div>
            {actions && <div className="actions">{actions}</div>}
        </div>
    );
}
