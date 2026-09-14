import { listAgenciesWithUsage } from "@/db/queries/agencies";
import { AgenciesView } from "@/components/agencies/AgenciesView";
import { requirePermission } from "@/lib/auth/session";

export default async function AgenciesPage() {
    await requirePermission("manageAgencies");
    const agencies = await listAgenciesWithUsage();

    return (
        <div
            data-component="AgenciesPage"
            className="mx-auto w-full max-w-7xl flex-1 space-y-6 px-4 py-6 sm:px-6 lg:px-8"
        >
            <div>
                <h1 className="text-xl font-semibold tracking-tight text-foreground">Agencies</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                    A counsellor can only be assigned an agency that exists here. Renaming applies everywhere,
                    including past months; an agency can only be deleted while nobody is assigned to it and it has
                    no recorded history.
                </p>
            </div>
            <AgenciesView agencies={agencies} />
        </div>
    );
}
