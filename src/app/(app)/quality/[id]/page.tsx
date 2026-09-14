import { notFound } from "next/navigation";
import { getCallAudit } from "@/db/queries/callAudits";
import { listUsers } from "@/db/queries/users";
import { CallAuditForm } from "@/components/quality/CallAuditForm";
import { requirePermission } from "@/lib/auth/session";

export default async function EditCallAuditPage({ params }: { params: Promise<{ id: string }> }) {
    const user = await requirePermission("auditCalls");
    const { id: idParam } = await params;
    const id = Number.parseInt(idParam, 10);
    if (!Number.isInteger(id) || id <= 0) notFound();

    const [audit, counsellors] = await Promise.all([
        getCallAudit(user.scope, id),
        listUsers(user.scope, { includeInactive: true, roleNames: ["counsellor"] }),
    ]);
    if (!audit) notFound();

    return (
        <div
            data-component="EditCallAuditPage"
            className="mx-auto w-full max-w-5xl flex-1 space-y-6 px-4 py-6 sm:px-6 lg:px-8"
        >
            <div>
                <h1 className="text-xl font-semibold tracking-tight text-foreground">
                    Call Audit · {audit.counsellorName}
                </h1>
                <p className="mt-1 text-sm text-muted-foreground">
                    Audited by {audit.auditorName}. Any quality analyst may edit or delete this audit.
                </p>
            </div>
            <CallAuditForm counsellors={counsellors} audit={audit} />
        </div>
    );
}
