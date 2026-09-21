import { MerittoAuth } from "@/components/tools/MerittoAuth";
import { PageHeader } from "@/components/shell/PageHeader";
import { requirePermission } from "@/lib/auth/session";

export default async function MerittoAuthPage() {
    await requirePermission("useTools");
    return (
        <div data-component="MerittoAuthPage" className="stack gap-5">
            <PageHeader
                title="Meritto auth"
                sub="Paste a curl captured from the Meritto application manager to connect this app to your Meritto session."
            />
            <MerittoAuth />
        </div>
    );
}
