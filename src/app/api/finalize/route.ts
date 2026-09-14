import { NextResponse } from "next/server";
import { finalizeMonth } from "@/db/queries/finalize";
import { FinalizeMonthInput } from "@/schemas/entry";
import { getCurrentUser } from "@/lib/auth/session";

/**
 * Manual "close the month" endpoint: sums each counsellor's
 * `admissions` rows for the given month and writes the total into
 * `counsellor_perf_monthly.achieved`. No Cloudflare Cron Trigger is
 * configured in wrangler.jsonc, so nothing calls this automatically — it's a
 * POST target for manual/ad-hoc invocation by a signed-in user with write
 * access (the session cookie must accompany the request).
 *
 * Usage: POST /api/finalize  { "date": "2026-08" }
 */
export async function POST(request: Request) {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
    if (user.mustChangePassword || !user.permissions.writeEntries) {
        return NextResponse.json({ error: "Not allowed" }, { status: 403 });
    }
    const body: unknown = await request.json().catch(() => null);
    const parsed = FinalizeMonthInput.safeParse(body);
    if (!parsed.success) {
        return NextResponse.json({ error: "Invalid body — expected { date: 'YYYY-MM' }" }, { status: 400 });
    }
    const result = await finalizeMonth(parsed.data.date);
    return NextResponse.json(result);
}
