import { listTeams } from "@/db/queries/teams";
import { UploadPreview } from "@/components/upload/UploadPreview";
import { requirePermission } from "@/lib/auth/session";

export default async function UploadPreviewPage() {
    const user = await requirePermission("useTools");
    // Sheet names are matched against the live team list, so a team added on
    // the Teams page is recognised without a code change.
    const teams = await listTeams();
    return (
        <div data-component="UploadPreviewPage" className="contents">
            <UploadPreview teamNames={teams.map((team) => team.name)} canImport={user.permissions.writeEntries} />
        </div>
    );
}
