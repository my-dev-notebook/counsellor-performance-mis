"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import {
    createCallAudit,
    deleteCallAudit,
    getCallAudit,
    listCallAudits,
    updateCallAudit,
} from "@/db/queries/callAudits";
import { getActiveUserById, listUsers } from "@/db/queries/users";
import { aqsPercent, CallAuditIdInput, CallAuditInput, computeAqs } from "@/schemas/call-audit";
import { DayDate } from "@/schemas/dates";
import { assertPermission } from "@/lib/auth/session";

/** The audited person must be an active counsellor with a team (the team is snapshotted onto the audit). */
async function resolveCounsellor(userId: number): Promise<{ id: number; teamId: number }> {
    const counsellor = await getActiveUserById(userId);
    if (counsellor?.roleName !== "counsellor") throw new Error("Counsellor not found");
    if (counsellor.teamId === null) throw new Error("This counsellor has no team");
    return { id: counsellor.id, teamId: counsellor.teamId };
}

export async function createCallAuditAction(input: CallAuditInput): Promise<number> {
    const parsed = CallAuditInput.parse(input);
    const actor = await assertPermission("auditCalls");
    const counsellor = await resolveCounsellor(parsed.userId);
    const id = await createCallAudit(parsed, counsellor.teamId, actor.id);
    refresh();
    return id;
}

/**
 * Any quality analyst may edit any audit; `audited_by` stays with whoever
 * created it. If the counsellor changed, the snapshot team follows; otherwise
 * the original snapshot is kept so a later team move does not rewrite history.
 */
export async function updateCallAuditAction(id: number, input: CallAuditInput): Promise<void> {
    const parsedId = CallAuditIdInput.parse(id);
    const parsed = CallAuditInput.parse(input);
    const actor = await assertPermission("auditCalls");
    const existing = await getCallAudit(actor.scope, parsedId);
    if (!existing) throw new Error("Audit not found");
    const teamId =
        existing.userId === parsed.userId ? existing.teamId : (await resolveCounsellor(parsed.userId)).teamId;
    await updateCallAudit(parsedId, parsed, teamId);
    refresh();
}

export async function deleteCallAuditAction(id: number): Promise<void> {
    const parsedId = CallAuditIdInput.parse(id);
    const actor = await assertPermission("auditCalls");
    if (!(await getCallAudit(actor.scope, parsedId))) throw new Error("Audit not found");
    await deleteCallAudit(parsedId);
    refresh();
}

export interface QualityExportRow {
    name: string;
    email: string;
    teamName: string;
    /**
     * Average AQS (0..1, always a whole percent) over the counsellor's audits whose call date falls
     * in the range; null when none. Each audit is rounded to a whole percent first, then the mean
     * of those is rounded again.
     */
    qualityScore: number | null;
    auditCount: number;
}

/**
 * One row per ACTIVE counsellor for the quality report: the AVERAGE AQS over
 * the audits whose call date lies in [from, to] (inclusive, "YYYY-MM-DD").
 * Each audit's AQS is rounded to a whole percent before averaging (7/8 -> 88%),
 * and the average is rounded to a whole percent too. Counsellors with no audit
 * in the range are still listed, with no score.
 */
export async function getQualityExportAction(from: string, to: string): Promise<QualityExportRow[]> {
    const range = z.object({ from: DayDate, to: DayDate }).parse({ from, to });
    if (range.from > range.to) throw new Error("Start date must not be after end date.");
    const actor = await assertPermission("auditCalls");
    const [counsellors, audits] = await Promise.all([
        listUsers(actor.scope, { includeInactive: false, roleNames: ["counsellor"] }),
        listCallAudits(actor.scope, { from: range.from, to: range.to }),
    ]);
    const totals = new Map<number, { sumPct: number; n: number }>();
    for (const audit of audits) {
        const t = totals.get(audit.userId) ?? { sumPct: 0, n: 0 };
        t.sumPct += aqsPercent(computeAqs(audit.ratings));
        t.n += 1;
        totals.set(audit.userId, t);
    }
    return counsellors.map((c) => {
        const t = totals.get(c.id);
        return {
            name: c.name,
            email: c.email,
            teamName: c.teamName ?? "",
            qualityScore: t ? Math.round(t.sumPct / t.n) / 100 : null,
            auditCount: t?.n ?? 0,
        };
    });
}
