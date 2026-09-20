import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { fetchCounsellorAdmissions } from "@/lib/admissions/fetch-counsellor";
import { MonthDate } from "@/schemas/dates";

const Body = z.object({
    url: z.string().url(),
    headers: z.record(z.string(), z.string()),
    userId: z.number().int(),
    month: MonthDate,
});

/**
 * One counsellor's month from Meritto, as rows on their days, with no diff
 * (see `fetchCounsellorAdmissions`). The all-counsellors fetch page calls
 * this once per counsellor, several at a time.
 *
 * A route handler rather than a server action on purpose: Next.js runs a
 * client's server actions one after another, so parallel calls would
 * silently serialise. Plain `fetch` calls to this endpoint do run
 * concurrently.
 *
 * Usage: POST /api/meritto/fetch-month  { url, headers, userId, month: "YYYY-MM" }
 */
export async function POST(request: Request) {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
    if (user.mustChangePassword || !user.permissions.writeEntries) {
        return NextResponse.json({ error: "Not allowed" }, { status: 403 });
    }
    const body: unknown = await request.json().catch(() => null);
    const parsed = Body.safeParse(body);
    if (!parsed.success) {
        return NextResponse.json({ error: "Invalid body — expected { url, headers, userId, month }" }, { status: 400 });
    }
    const { url, headers, userId, month } = parsed.data;
    try {
        const rows = await fetchCounsellorAdmissions(url, headers, userId, { month }, user.scope);
        return NextResponse.json(rows);
    } catch (error) {
        const message = error instanceof Error ? error.message : "Fetch failed";
        return NextResponse.json({ error: message }, { status: 502 });
    }
}
