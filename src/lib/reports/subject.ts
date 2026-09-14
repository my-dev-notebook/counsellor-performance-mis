/**
 * The Overview page's `?subject=` param: "company", "team:<id>" or "user:<id>".
 * Which values are offered is decided per scope in the page; this only
 * encodes/decodes the string.
 */
export type Subject = { kind: "company" } | { kind: "team"; teamId: number } | { kind: "person"; userId: number };

export function encodeSubject(subject: Subject): string {
    switch (subject.kind) {
        case "company":
            return "company";
        case "team":
            return `team:${String(subject.teamId)}`;
        case "person":
            return `user:${String(subject.userId)}`;
    }
}

export function decodeSubject(value: string | string[] | undefined): Subject | null {
    if (typeof value !== "string") return null;
    if (value === "company") return { kind: "company" };
    const match = /^(team|user):(\d+)$/.exec(value);
    if (!match) return null;
    const id = Number.parseInt(match[2] ?? "", 10);
    return match[1] === "team" ? { kind: "team", teamId: id } : { kind: "person", userId: id };
}
