import type { AdmissionRecord } from "@/schemas/admissions";

/** One application number whose details differ between the DB and Meritto. */
export interface AdmissionChange {
    before: AdmissionRecord;
    after: AdmissionRecord;
}

/**
 * How one day in the DB differs from what Meritto returned for it. Keyed by
 * `applicationNumber` (the globally unique id): a row is added when Meritto
 * has it and the DB doesn't, removed the other way round, changed when both
 * have it but any other field differs.
 */
export interface DayDiff {
    date: string;
    added: AdmissionRecord[];
    changed: AdmissionChange[];
    removed: AdmissionRecord[];
    unchanged: number;
    /** Meritto's full row set for the day — what an apply writes verbatim. */
    fetched: AdmissionRecord[];
}

export function hasChanges(diff: DayDiff): boolean {
    return diff.added.length > 0 || diff.changed.length > 0 || diff.removed.length > 0;
}

function sameRecord(a: AdmissionRecord, b: AdmissionRecord): boolean {
    return (
        a.applicantUserId === b.applicantUserId &&
        a.applicantName === b.applicantName &&
        a.formId === b.formId &&
        a.formName === b.formName
    );
}

export function diffDay(date: string, existing: AdmissionRecord[], fetched: AdmissionRecord[]): DayDiff {
    const before = new Map(existing.map((r) => [r.applicationNumber, r]));
    const after = new Map(fetched.map((r) => [r.applicationNumber, r]));

    const added: AdmissionRecord[] = [];
    const changed: AdmissionChange[] = [];
    let unchanged = 0;
    for (const record of fetched) {
        const previous = before.get(record.applicationNumber);
        if (!previous) added.push(record);
        else if (sameRecord(previous, record)) unchanged++;
        else changed.push({ before: previous, after: record });
    }
    const removed = existing.filter((r) => !after.has(r.applicationNumber));

    return { date, added, changed, removed, unchanged, fetched };
}

/**
 * Diff every day that appears on either side. Days are compared
 * independently, so an application that moved between two days shows up as
 * removed from one and added to the other.
 */
export function diffDays(
    existingByDate: Map<string, AdmissionRecord[]>,
    fetchedByDate: Map<string, AdmissionRecord[]>,
): DayDiff[] {
    const dates = Array.from(new Set([...existingByDate.keys(), ...fetchedByDate.keys()])).sort();
    return dates.map((date) => diffDay(date, existingByDate.get(date) ?? [], fetchedByDate.get(date) ?? []));
}

/** A fetched row that cannot be applied: its application number is already credited elsewhere. */
export interface AdmissionConflict {
    date: string;
    record: AdmissionRecord;
    ownerName: string;
    ownerDate: string;
}

/** One Meritto row placed on its payment-approved day. */
export interface FetchedAdmission {
    date: string;
    record: AdmissionRecord;
}

/** Where an application number currently sits in the DB. */
export interface ExistingAdmission extends FetchedAdmission {
    userId: number;
    userName: string;
}

/** One counsellor Meritto credits an application to, in a duplicate. */
export interface DuplicateClaim {
    userId: number;
    date: string;
    record: AdmissionRecord;
}

/**
 * An application Meritto credits to more than one counsellor at once — a
 * data error on Meritto's side. The all-counsellors fetch cannot know who
 * should get it, so it's surfaced for the operator to fix (in Meritto, or by
 * picking a winner here) before it counts for anyone.
 */
export interface DuplicateOwnership {
    applicationNumber: string;
    claims: DuplicateClaim[];
    /** Who the DB credits it to today, if anyone. */
    existing: ExistingAdmission | null;
}

/** An application the DB credits to one counsellor but Meritto to another; apply re-credits it. */
export interface AdmissionMove {
    applicationNumber: string;
    date: string;
    fromUserId: number;
    fromUserName: string;
    fromDate: string;
    toUserId: number;
}

export interface CounsellorDiff {
    userId: number;
    /** Only days where the DB and Meritto disagree, in date order. */
    days: DayDiff[];
    conflicts: AdmissionConflict[];
    /** Rows in `days[].fetched` that another in-scope counsellor currently holds; apply reclaims them. */
    movedIn: AdmissionMove[];
    /** Rows this counsellor loses to another in-scope counsellor. */
    movedOut: AdmissionMove[];
    /** Rows Meritto returned for this counsellor, before duplicates and conflicts were dropped. */
    fetchedCount: number;
}

/** Applications Meritto returned under two or more counsellors. */
export function findDuplicateOwnership(
    fetchedByUser: Map<number, FetchedAdmission[]>,
    existing: ExistingAdmission[],
): DuplicateOwnership[] {
    const claims = new Map<string, DuplicateClaim[]>();
    for (const [userId, rows] of fetchedByUser) {
        for (const { date, record } of rows) {
            const list = claims.get(record.applicationNumber) ?? [];
            list.push({ userId, date, record });
            claims.set(record.applicationNumber, list);
        }
    }
    const existingByNumber = new Map(existing.map((e) => [e.record.applicationNumber, e]));
    return Array.from(claims)
        .filter(([, list]) => list.length > 1)
        .map(([applicationNumber, list]) => ({
            applicationNumber,
            claims: list,
            existing: existingByNumber.get(applicationNumber) ?? null,
        }))
        .sort((a, b) => a.applicationNumber.localeCompare(b.applicationNumber));
}

/**
 * Diff every counsellor's month at once.
 *
 * `existing` is every DB row of the month — in-scope counsellors' rows are
 * the baselines, anyone else's only decide conflicts. `resolutions` says who
 * gets each duplicate (`null` or absent = nobody: the row is dropped from
 * every claimant until fixed). An application the DB holds under one
 * in-scope counsellor and Meritto under another is a move: it stays in the
 * receiver's rows (and is listed in `movedIn` so apply can reclaim it) and
 * disappears from the giver's. Held anywhere else — a counsellor outside
 * `fetchedByUser`, or a day outside `monthDate` — it's a conflict and is
 * dropped, same as the single-counsellor fetch.
 */
export function diffCounsellors({
    monthDate,
    fetchedByUser,
    existing,
    resolutions,
}: {
    monthDate: string;
    fetchedByUser: Map<number, FetchedAdmission[]>;
    existing: ExistingAdmission[];
    resolutions: Map<string, number | null>;
}): Map<number, CounsellorDiff> {
    const existingByNumber = new Map(existing.map((e) => [e.record.applicationNumber, e]));
    const existingByUserDate = new Map<number, Map<string, AdmissionRecord[]>>();
    for (const e of existing) {
        if (!fetchedByUser.has(e.userId) || !e.date.startsWith(`${monthDate}-`)) continue;
        const byDate = existingByUserDate.get(e.userId) ?? new Map<string, AdmissionRecord[]>();
        byDate.set(e.date, [...(byDate.get(e.date) ?? []), e.record]);
        existingByUserDate.set(e.userId, byDate);
    }

    const claimants = new Map<string, Set<number>>();
    for (const [userId, rows] of fetchedByUser) {
        for (const { record } of rows) {
            const set = claimants.get(record.applicationNumber) ?? new Set<number>();
            set.add(userId);
            claimants.set(record.applicationNumber, set);
        }
    }

    const movesByNumber = new Map<string, AdmissionMove>();
    const result = new Map<number, CounsellorDiff>();
    for (const [userId, rows] of fetchedByUser) {
        const fetchedByDate = new Map<string, AdmissionRecord[]>();
        const conflicts: AdmissionConflict[] = [];
        const movedIn: AdmissionMove[] = [];
        for (const { date, record } of rows) {
            const n = record.applicationNumber;
            if ((claimants.get(n)?.size ?? 0) > 1 && resolutions.get(n) !== userId) continue;
            const owner = existingByNumber.get(n);
            if (owner && !(owner.userId === userId && owner.date.startsWith(`${monthDate}-`))) {
                const movable = fetchedByUser.has(owner.userId) && owner.date.startsWith(`${monthDate}-`);
                if (!movable) {
                    conflicts.push({ date, record, ownerName: owner.userName, ownerDate: owner.date });
                    continue;
                }
                const move: AdmissionMove = {
                    applicationNumber: n,
                    date,
                    fromUserId: owner.userId,
                    fromUserName: owner.userName,
                    fromDate: owner.date,
                    toUserId: userId,
                };
                movedIn.push(move);
                movesByNumber.set(n, move);
            }
            fetchedByDate.set(date, [...(fetchedByDate.get(date) ?? []), record]);
        }
        const days = diffDays(existingByUserDate.get(userId) ?? new Map(), fetchedByDate).filter(hasChanges);
        result.set(userId, { userId, days, conflicts, movedIn, movedOut: [], fetchedCount: rows.length });
    }
    for (const move of movesByNumber.values()) {
        result.get(move.fromUserId)?.movedOut.push(move);
    }
    return result;
}
