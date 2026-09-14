import { eq, inArray, sql } from "drizzle-orm";
import type { BatchItem } from "drizzle-orm/batch";
import { getDb } from "@/db/client";
import { agencies, counsellorPerfMonthly, imports, users } from "@/db/schema";
import { listAgencies } from "@/db/queries/agencies";
import { getAchievedForCounsellors } from "@/db/queries/performance";
import { listTeams } from "@/db/queries/teams";
import { applyAssignmentChanges, createUser, listRoles, listUsers } from "@/db/queries/users";
import type { ExistingEntry, ImportContext } from "@/lib/import/plan";
import { DEFAULT_PASSWORD, hashPassword } from "@/lib/auth/password";
import type { AgencyChoice, CommitImportInput, CommitRowInput, ExpectedEntry } from "@/schemas/import";

/** Every monthly row for one "YYYY-MM", by user id. */
export async function getEntriesForMonth(date: string): Promise<Map<number, ExistingEntry>> {
    const db = await getDb();
    const rows = await db
        .select({
            userId: counsellorPerfMonthly.userId,
            overall: counsellorPerfMonthly.overall,
            nonNegotiable: counsellorPerfMonthly.nonNegotiable,
            achieved: counsellorPerfMonthly.achieved,
            achievedSource: counsellorPerfMonthly.achievedSource,
            importId: counsellorPerfMonthly.importId,
            teamId: counsellorPerfMonthly.teamId,
            agencyId: counsellorPerfMonthly.agencyId,
        })
        .from(counsellorPerfMonthly)
        .where(eq(counsellorPerfMonthly.date, date));
    return new Map(rows.map(({ userId, ...entry }) => [userId, entry]));
}

/**
 * Everything the plan builder (src/lib/import/plan.ts) needs for one month.
 * Unscoped on purpose: only callers holding `writeEntries` reach this, and
 * an import has to see the whole roster to avoid creating duplicates.
 */
export async function loadImportContext(date: string): Promise<ImportContext> {
    const [teams, agencyRows, roster, entries, liveAchieved] = await Promise.all([
        listTeams(),
        listAgencies(),
        listUsers({ kind: "all" }, { includeInactive: true }),
        getEntriesForMonth(date),
        getAchievedForCounsellors(date),
    ]);
    return {
        date,
        teams,
        agencies: agencyRows,
        roster: roster.map((user) => ({
            id: user.id,
            name: user.name,
            email: user.email,
            merittoUserId: user.merittoUserId,
            roleName: user.roleName,
            teamId: user.teamId,
            teamName: user.teamName,
            agencyId: user.agencyId,
            agencyName: user.agencyName,
            isActive: user.isActive,
        })),
        entries: Object.fromEntries(entries),
        liveAchieved: Object.fromEntries(liveAchieved),
    };
}

export interface ImportResult {
    importId: number;
    inserted: number;
    updated: number;
    skipped: number;
    usersCreated: number;
    rosterUpdated: number;
}

export type CommitOutcome =
    | { ok: true; result: ImportResult }
    /** The month changed under the plan; the listed rows must be re-planned before committing. */
    | { ok: false; kind: "stale"; rowIds: string[] }
    | { ok: false; kind: "invalid"; message: string };

function sameEntry(current: ExistingEntry | null, expected: ExpectedEntry): boolean {
    if (current === null || expected === null) return current === expected;
    return (
        current.overall === expected.overall &&
        current.nonNegotiable === expected.nonNegotiable &&
        current.achieved === expected.achieved &&
        current.achievedSource === expected.achievedSource &&
        current.teamId === expected.teamId &&
        current.agencyId === expected.agencyId
    );
}

/**
 * Apply the operator's decisions for one workbook.
 *
 * Order matters because D1 has no interactive transactions:
 *   1. every `expected` snapshot is checked against the month as it is now,
 *      and the whole commit is refused if anything moved;
 *   2. new agencies and the `imports` row are created (ids needed below);
 *   3. new users are created one by one (each needs its own id and its own
 *      salted password hash);
 *   4. every monthly insert/update goes in ONE `db.batch`, so the figures
 *      land together or not at all;
 *   5. roster updates go through `applyAssignmentChanges`, the only path
 *      allowed to write team/agency, so they are logged like any other.
 */
export async function commitImport(input: CommitImportInput, actor: { id: number }): Promise<CommitOutcome> {
    const db = await getDb();

    const current = await getEntriesForMonth(input.date);
    const stale: string[] = [];
    const claimed = new Set<number>();
    for (const row of input.rows) {
        if (row.action !== "upsert") continue;
        if (!sameEntry(current.get(row.userId) ?? null, row.expected)) stale.push(row.rowId);
        if (claimed.has(row.userId)) {
            return { ok: false, kind: "invalid", message: "Two rows are mapped to the same user." };
        }
        claimed.add(row.userId);
    }
    if (stale.length > 0) return { ok: false, kind: "stale", rowIds: stale };

    const creates = input.rows.filter(
        (row): row is Extract<CommitRowInput, { action: "create" }> => row.action === "create",
    );
    const emails = creates.map((row) => row.email);
    if (new Set(emails).size !== emails.length) {
        return { ok: false, kind: "invalid", message: "Two new users share an email address." };
    }
    if (emails.length > 0) {
        const taken = await db.select({ email: users.email }).from(users).where(inArray(users.email, emails));
        if (taken.length > 0) {
            return {
                ok: false,
                kind: "invalid",
                message: `Email already in use: ${taken.map((row) => row.email).join(", ")}.`,
            };
        }
    }

    // Agencies to create, deduplicated case-insensitively against each other and the table.
    const newAgencyIds = new Map<string, number>();
    const wantedAgencies = new Map<string, string>();
    for (const row of input.rows) {
        if (row.action === "skip" || row.agency === null || row.agency.kind !== "new") continue;
        wantedAgencies.set(row.agency.name.trim().toLowerCase(), row.agency.name.trim());
    }
    if (wantedAgencies.size > 0) {
        const existing = await listAgencies();
        for (const [key, name] of wantedAgencies) {
            const found = existing.find((agency) => agency.name.trim().toLowerCase() === key);
            if (found) {
                newAgencyIds.set(key, found.id);
                continue;
            }
            const [inserted] = await db.insert(agencies).values({ name }).returning({ id: agencies.id });
            if (!inserted) return { ok: false, kind: "invalid", message: `Could not create agency "${name}".` };
            newAgencyIds.set(key, inserted.id);
        }
    }
    const agencyIdFor = (choice: AgencyChoice): number | null => {
        if (choice === null) return null;
        if (choice.kind === "existing") return choice.id;
        return newAgencyIds.get(choice.name.trim().toLowerCase()) ?? null;
    };

    const [importRow] = await db
        .insert(imports)
        .values({
            date: input.date,
            sourceFileName: input.sourceFileName,
            importedBy: actor.id,
            notes: JSON.stringify(input.notes),
        })
        .returning({ id: imports.id });
    if (!importRow) return { ok: false, kind: "invalid", message: "Could not record the import." };
    const importId = importRow.id;

    const counsellorRole = (await listRoles()).find((role) => role.name === "counsellor");
    if (!counsellorRole) return { ok: false, kind: "invalid", message: "No counsellor role exists." };
    const createdUserIds = new Map<string, number>();
    for (const row of creates) {
        const userId = await createUser(
            {
                name: row.name,
                email: row.email,
                merittoUserId: null,
                dateOfJoining: null,
                roleId: counsellorRole.id,
                teamId: row.teamId,
                agencyId: agencyIdFor(row.agency),
                passwordHash: await hashPassword(DEFAULT_PASSWORD),
            },
            actor.id,
        );
        createdUserIds.set(row.rowId, userId);
    }

    const statements: BatchItem<"sqlite">[] = [];
    let inserted = 0;
    let updated = 0;
    let skipped = 0;
    const insertRow = (
        userId: number,
        teamId: number,
        agencyId: number | null,
        figures: { overall: number | null; nonNegotiable: number | null; achieved: number | null },
    ) => {
        statements.push(
            db.insert(counsellorPerfMonthly).values({
                userId,
                teamId,
                agencyId,
                date: input.date,
                overall: figures.overall,
                nonNegotiable: figures.nonNegotiable,
                achieved: figures.achieved,
                achievedSource: figures.achieved === null ? "admissions" : "import",
                importId: figures.achieved === null ? null : importId,
            }),
        );
        inserted += 1;
    };

    for (const row of input.rows) {
        if (row.action === "skip") {
            skipped += 1;
            continue;
        }
        if (row.action === "create") {
            const userId = createdUserIds.get(row.rowId);
            if (userId === undefined) continue;
            insertRow(userId, row.teamId, agencyIdFor(row.agency), row);
            continue;
        }
        const existing = current.get(row.userId);
        if (!existing) {
            insertRow(row.userId, row.teamId, agencyIdFor(row.agency), {
                overall: row.overall,
                nonNegotiable: row.nonNegotiable,
                achieved: row.writeAchieved ? row.achieved : null,
            });
            continue;
        }
        const set: Partial<typeof counsellorPerfMonthly.$inferInsert> = {};
        if (row.writeTargets) {
            set.overall = row.overall;
            set.nonNegotiable = row.nonNegotiable;
        }
        if (row.writeAchieved && row.achieved !== null) {
            set.achieved = row.achieved;
            set.achievedSource = "import";
            set.importId = importId;
        }
        if (row.rewriteSnapshot) {
            set.teamId = row.teamId;
            set.agencyId = agencyIdFor(row.agency);
        }
        if (Object.keys(set).length === 0) {
            skipped += 1;
            continue;
        }
        statements.push(
            db
                .update(counsellorPerfMonthly)
                .set({ ...set, updatedAt: sql`(datetime('now'))` })
                .where(sql`${counsellorPerfMonthly.userId} = ${row.userId} AND ${counsellorPerfMonthly.date} = ${input.date}`),
        );
        updated += 1;
    }

    const [first, ...rest] = statements;
    if (first) await db.batch([first, ...rest]);

    let rosterUpdated = 0;
    for (const row of input.rows) {
        if (row.action !== "upsert" || !row.updateRoster) continue;
        await applyAssignmentChanges(row.userId, { teamId: row.teamId, agencyId: agencyIdFor(row.agency) }, actor.id);
        rosterUpdated += 1;
    }

    await db
        .update(imports)
        .set({ rowsInserted: inserted, rowsUpdated: updated, rowsSkipped: skipped, usersCreated: creates.length })
        .where(eq(imports.id, importId));

    return { ok: true, result: { importId, inserted, updated, skipped, usersCreated: creates.length, rosterUpdated } };
}

export interface ImportRecord {
    id: number;
    date: string;
    sourceFileName: string;
    importedAt: string;
    importedByName: string | null;
}

/** Imports that touched a month, newest first — the discrepancies screen names the file a figure came from. */
export async function listImportsForMonth(date: string): Promise<ImportRecord[]> {
    const db = await getDb();
    return db
        .select({
            id: imports.id,
            date: imports.date,
            sourceFileName: imports.sourceFileName,
            importedAt: imports.importedAt,
            importedByName: users.name,
        })
        .from(imports)
        .leftJoin(users, eq(imports.importedBy, users.id))
        .where(eq(imports.date, date))
        .orderBy(sql`${imports.importedAt} DESC`);
}
