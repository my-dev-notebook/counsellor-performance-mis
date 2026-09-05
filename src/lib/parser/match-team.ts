import type { CanonicalTeam } from "./schemas";
import { CANONICAL_TEAMS } from "./schemas";

/**
 * Fuzzy / semantic sheet-name → team matcher (PLAN.md §2.4). Sheet names are
 * not matched against a fixed alias list — the Media team alone is spelled
 * four different ways across four sample files, and a future month will
 * invent a fifth.
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

const TEAM_KEYWORDS: Readonly<Record<CanonicalTeam, readonly string[]>> = {
  Design: ["design", "designing"],
  Engineering: ["engineering", "engineer", "engg", "tech", "technology"],
  Inbound: ["inbound", "inbnd"],
  Law: ["law", "legal"],
  Management: ["management", "mgmt", "manage", "business"],
  "Media/Liberal Arts": ["media", "liberal", "arts", "art", "mass", "communication"],
};

function normalize(name: string): string[] {
  const cleaned = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
  if (!cleaned) return [];
  return cleaned.split(/\s+/).filter((token) => token.length > 0 && !STOPWORDS.has(token));
}

function tokenMatchesKeyword(token: string, keyword: string): boolean {
  if (token === keyword) return true;
  if (keyword.length >= 4 && token.startsWith(keyword)) return true;
  if (token.length >= 4 && keyword.startsWith(token)) return true;
  return false;
}

export type TeamMatch =
  | { matched: true; team: CanonicalTeam; tokens: readonly string[] }
  | {
      matched: false;
      tokens: readonly string[];
      ambiguous: boolean;
      candidates: readonly CanonicalTeam[];
    };

export function matchTeamSheetName(sheetName: string): TeamMatch {
  const tokens = normalize(sheetName);
  if (tokens.length === 0) {
    return { matched: false, tokens, ambiguous: false, candidates: [] };
  }

  const scores = CANONICAL_TEAMS.map((team) => {
    const keywords = TEAM_KEYWORDS[team];
    const score = tokens.filter((token) =>
      keywords.some((keyword) => tokenMatchesKeyword(token, keyword)),
    ).length;
    return { team, score };
  });

  const maxScore = Math.max(...scores.map((entry) => entry.score));
  if (maxScore === 0) {
    return { matched: false, tokens, ambiguous: false, candidates: [] };
  }

  const winners = scores.filter((entry) => entry.score === maxScore).map((entry) => entry.team);
  if (winners.length > 1) {
    return { matched: false, tokens, ambiguous: true, candidates: winners };
  }

  const [team] = winners;
  if (team === undefined) {
    return { matched: false, tokens, ambiguous: false, candidates: [] };
  }
  return { matched: true, team, tokens };
}
