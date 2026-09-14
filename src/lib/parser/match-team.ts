import { CANONICAL_TEAMS } from "@/schemas/parser";
import { similarity, tokenize } from "@/lib/matching/similarity";

/**
 * Fuzzy / semantic sheet-name → team matcher (PLAN.md §2.4). Sheet names are
 * not matched against a fixed alias list — the Media team alone is spelled
 * four different ways across four sample files, and a future month will
 * invent a fifth.
 *
 * The candidate teams are whatever the caller passes (the `teams` table, for
 * the live app), defaulting to the six canonical names the fixtures use. A
 * team the keyword table knows gets its hints; any other team is matched on
 * the tokens of its own name, plus a fuzzy fallback for typos, so a team
 * added on the Teams page needs no code change to be recognised.
 */

const STOPWORDS = new Set([
    // generic sheet-naming noise
    "month",
    "team",
    "performance",
    "report",
    "sheet",
    "wise",
    "data",
    "final",
    "copy",
    "new",
    "updated",
    "target",
    "targets",
    "overall",
    "total",
    "totals",
    "summary",
    "bifurcation",
    "applications",
    "joiners",
    // month names and abbreviations
    "jan",
    "january",
    "feb",
    "february",
    "mar",
    "march",
    "apr",
    "april",
    "may",
    "jun",
    "june",
    "jul",
    "july",
    "aug",
    "august",
    "sep",
    "sept",
    "september",
    "oct",
    "october",
    "nov",
    "november",
    "dec",
    "december",
]);

/** Extra hints for teams whose sheets are habitually named by something other than the team's own name. */
const TEAM_KEYWORDS: Readonly<Record<string, readonly string[]>> = {
    Design: ["design", "designing"],
    Engineering: ["engineering", "engineer", "engg", "tech", "technology"],
    Inbound: ["inbound", "inbnd"],
    Law: ["law", "legal"],
    Management: ["management", "mgmt", "manage", "business"],
    "Media/Liberal Arts": ["media", "liberal", "arts", "art", "mass", "communication"],
};

/** A whole-name fuzzy hit must be at least this similar to count (typo tolerance, not guessing). */
const FUZZY_THRESHOLD = 0.8;

function normalize(name: string): string[] {
    return tokenize(name).filter((token) => !STOPWORDS.has(token));
}

function keywordsFor(team: string): string[] {
    const own = tokenize(team).filter((token) => !STOPWORDS.has(token));
    return Array.from(new Set([...own, ...(TEAM_KEYWORDS[team] ?? [])]));
}

function tokenMatchesKeyword(token: string, keyword: string): boolean {
    if (token === keyword) return true;
    if (keyword.length >= 4 && token.startsWith(keyword)) return true;
    if (token.length >= 4 && keyword.startsWith(token)) return true;
    return false;
}

export type TeamMatch =
    | { matched: true; team: string; tokens: readonly string[] }
    | {
          matched: false;
          tokens: readonly string[];
          ambiguous: boolean;
          candidates: readonly string[];
      };

export function matchTeamSheetName(sheetName: string, teams: readonly string[] = CANONICAL_TEAMS): TeamMatch {
    const tokens = normalize(sheetName);
    if (tokens.length === 0) {
        return { matched: false, tokens, ambiguous: false, candidates: [] };
    }

    const scores = teams.map((team) => {
        const keywords = keywordsFor(team);
        const score = tokens.filter((token) => keywords.some((keyword) => tokenMatchesKeyword(token, keyword))).length;
        return { team, score };
    });

    let maxScore = Math.max(...scores.map((entry) => entry.score));
    let winners = scores.filter((entry) => entry.score === maxScore).map((entry) => entry.team);

    if (maxScore === 0) {
        // No keyword hit: fall back to whole-name similarity so "Enginering"
        // still finds Engineering, but only a clear near-identical hit counts.
        const fuzzy = teams
            .map((team) => {
                let best = 0;
                for (const keyword of keywordsFor(team)) {
                    for (const token of tokens) best = Math.max(best, similarity(token, keyword));
                }
                return { team, score: best };
            })
            .filter((entry) => entry.score >= FUZZY_THRESHOLD)
            .sort((a, b) => b.score - a.score);
        if (fuzzy.length === 0) {
            return { matched: false, tokens, ambiguous: false, candidates: [] };
        }
        maxScore = fuzzy[0]?.score ?? 0;
        winners = fuzzy.filter((entry) => entry.score === maxScore).map((entry) => entry.team);
    }

    if (winners.length > 1) {
        return { matched: false, tokens, ambiguous: true, candidates: winners };
    }

    const [team] = winners;
    if (team === undefined) {
        return { matched: false, tokens, ambiguous: false, candidates: [] };
    }
    return { matched: true, team, tokens };
}
