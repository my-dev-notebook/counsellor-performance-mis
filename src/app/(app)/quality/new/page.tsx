import { listUsers } from "@/db/queries/users";
import { CallAuditForm } from "@/components/quality/CallAuditForm";
import { requirePermission } from "@/lib/auth/session";

export default async function NewCallAuditPage() {
    const user = await requirePermission("auditCalls");
    const counsellors = await listUsers(user.scope, { includeInactive: false, roleNames: ["counsellor"] });

    return (
        <div
            data-component="NewCallAuditPage"
            className="mx-auto w-full max-w-5xl flex-1 space-y-6 px-4 py-6 sm:px-6 lg:px-8"
        >
            <div>
                <h1 className="text-xl font-semibold tracking-tight text-foreground">New Call Audit</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                    Pick the counsellor and the call, then rate each parameter. A failed parameter needs a reason.
                </p>
            </div>
            <CallAuditForm counsellors={counsellors} audit={null} />
        </div>
    );
}
