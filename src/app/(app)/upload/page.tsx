import { UploadPreview } from "@/components/upload/UploadPreview";
import { requirePermission } from "@/lib/auth/session";

export default async function UploadPreviewPage() {
    await requirePermission("useTools");
    return (
        <div data-component="UploadPreviewPage" className="contents">
            <UploadPreview />
        </div>
    );
}
