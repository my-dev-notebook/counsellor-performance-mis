import { listAgenciesWithUsage } from "@/db/queries/agencies";
import { AgenciesView } from "@/components/agencies/AgenciesView";
import { PageHeader } from "@/components/shell/PageHeader";
import { requirePermission } from "@/lib/auth/session";

export default async function AgenciesPage() {
    await requirePermission("manageAgencies");
    const agencies = await listAgenciesWithUsage();

    return (
        <div data-component="AgenciesPage" className="stack gap-5">
            <PageHeader
                title="Agencies"
                sub="A counsellor can only be assigned an agency that exists here. Renaming applies everywhere, including past months; an agency can only be deleted while nobody is assigned to it and it has no recorded history."
            />
            <AgenciesView agencies={agencies} />
        </div>
    );
}
