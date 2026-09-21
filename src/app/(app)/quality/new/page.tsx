import { listUsers } from "@/db/queries/users";
import { CallAuditForm } from "@/components/quality/CallAuditForm";
import { PageHeader } from "@/components/shell/PageHeader";
import { requirePermission } from "@/lib/auth/session";

export default async function NewCallAuditPage() {
    const user = await requirePermission("auditCalls");
    const counsellors = await listUsers(user.scope, { includeInactive: false, roleNames: ["counsellor"] });

    return (
        <div data-component="NewCallAuditPage" className="stack gap-5">
            <PageHeader
                title="New call audit"
                sub="Pick the counsellor and the call, then rate each parameter. A failed parameter needs a reason."
            />
            <CallAuditForm counsellors={counsellors} audit={null} />
        </div>
    );
}
