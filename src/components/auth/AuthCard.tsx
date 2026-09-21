import type { ReactNode } from "react";

/**
 * Centred card for the sign-in and password pages: brand block, a title and
 * one-line intro, then the form. Nothing else is on these pages.
 */
export function AuthCard({ title, sub, children }: { title: string; sub: string; children: ReactNode }) {
    return (
        <main data-component="AuthCard" className="bg-canvas flex flex-1 items-center justify-center px-4 py-12">
            <div className="card card-pad stack w-full max-w-sm gap-5 p-7">
                <div className="brand border-0 p-0">
                    <div className="mark">CP</div>
                    <div>
                        <div className="name">Counsellor Performance</div>
                        <div className="sub">Advanced MIS</div>
                    </div>
                </div>
                <div>
                    <h1 className="t-h1">{title}</h1>
                    <p className="t-sm ink-2 mt-1">{sub}</p>
                </div>
                {children}
            </div>
        </main>
    );
}
