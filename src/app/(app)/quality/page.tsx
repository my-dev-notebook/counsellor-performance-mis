import { listCallAudits } from "@/db/queries/callAudits";
import { listTeams } from "@/db/queries/teams";
import { listUsers } from "@/db/queries/users";
import { CallAuditsView } from "@/components/quality/CallAuditsView";
import { PageHeader } from "@/components/shell/PageHeader";
import { requirePermission } from "@/lib/auth/session";

export default async function QualityPage() {
    const user = await requirePermission("auditCalls");
    const [audits, counsellors, teams] = await Promise.all([
        listCallAudits(user.scope),
        listUsers(user.scope, { includeInactive: true, roleNames: ["counsellor"] }),
        listTeams(),
    ]);

    return (
        <div data-component="QualityPage" className="stack gap-5">
            <PageHeader
                title="Call audits"
                sub="Every audited call, newest first. AQS is (Pass + Not applicable) out of 8 parameters: green at 100%, yellow from 88%, red below. Click a row to open it."
            />
            <CallAuditsView audits={audits} counsellors={counsellors} teams={teams} />
        </div>
    );
}
