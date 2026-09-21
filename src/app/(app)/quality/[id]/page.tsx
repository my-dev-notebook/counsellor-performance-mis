import { notFound } from "next/navigation";
import { getCallAudit } from "@/db/queries/callAudits";
import { listUsers } from "@/db/queries/users";
import { CallAuditForm } from "@/components/quality/CallAuditForm";
import { PageHeader } from "@/components/shell/PageHeader";
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
        <div data-component="EditCallAuditPage" className="stack gap-5">
            <PageHeader
                title={`Call audit · ${audit.counsellorName}`}
                sub={`Audited by ${audit.auditorName}. Any quality analyst may edit or delete this audit.`}
            />
            <CallAuditForm counsellors={counsellors} audit={audit} />
        </div>
    );
}
