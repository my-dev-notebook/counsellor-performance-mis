import { listCallAudits } from "@/db/queries/callAudits";
import { listTeams } from "@/db/queries/teams";
import { listUsers } from "@/db/queries/users";
import { CallAuditsView } from "@/components/quality/CallAuditsView";
import { requirePermission } from "@/lib/auth/session";

export default async function QualityPage() {
    const user = await requirePermission("auditCalls");
    const [audits, counsellors, teams] = await Promise.all([
        listCallAudits(user.scope),
        listUsers(user.scope, { includeInactive: true, roleNames: ["counsellor"] }),
        listTeams(),
    ]);

    return (
        <div
            data-component="QualityPage"
            className="mx-auto w-full max-w-7xl flex-1 space-y-6 px-4 py-6 sm:px-6 lg:px-8"
        >
            <div>
                <h1 className="text-xl font-semibold tracking-tight text-foreground">Call Audits</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                    Every audited call, newest first. AQS is (Pass + Not applicable) out of 8 parameters: green at 100%,
                    yellow from 88%, red below. Click a row to open it.
                </p>
            </div>
            <CallAuditsView audits={audits} counsellors={counsellors} teams={teams} />
        </div>
    );
}
