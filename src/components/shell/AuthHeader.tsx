import { HeaderActions } from "@/components/shell/HeaderActions";

/** Top bar for the signed-out pages: brand on the left, repo link and theme toggle on the right. No user menu. */
export function AuthHeader() {
    return (
        <header data-component="AuthHeader" className="app-header">
            <div className="app-header-title">
                <span className="t-sm font-semibold">Counsellor Performance</span>
                <span className="t-sm ink-3"> · Advanced MIS</span>
            </div>
            <div className="app-header-actions">
                <HeaderActions />
            </div>
        </header>
    );
}
