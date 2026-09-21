"use client";

import type { ReactNode } from "react";
import type { ImportPlan } from "@/lib/import/plan";
import type { ReviewChoices } from "@/lib/import/decisions";
import type { AgencyChoice } from "@/schemas/import";
import type { ParsedWorkbook } from "@/schemas/parser";
import { FiAlertTriangle } from "react-icons/fi";
import { Select } from "@/components/Select";

function pct(score: number): string {
    return `${String(Math.round(score * 100))}%`;
}

/**
 * The three "could not place" panels: roster-like sheets the parser skipped,
 * sheet teams that match no DB team, and agency strings that match no
 * agency. Teams are never created here — that is the Teams page's job — so
 * an unmapped team can only be pointed at an existing one.
 */
export function ImportMappings({
    workbook,
    plan,
    teamNames,
    sheetOverrides,
    choices,
    onMapSheet,
    onTeamChoice,
    onAgencyChoice,
}: {
    workbook: ParsedWorkbook;
    plan: ImportPlan | null;
    teamNames: string[];
    sheetOverrides: Record<string, string | null>;
    choices: ReviewChoices;
    onMapSheet: (sheet: string, team: string | null) => void;
    onTeamChoice: (sheetTeam: string, teamId: number) => void;
    onAgencyChoice: (text: string, choice: AgencyChoice) => void;
}) {
    const ignoredSheets = Array.from(
        new Set([
            ...workbook.warnings.flatMap((w) =>
                w.code === "SHEET_IGNORED" && w.level === "warn" && w.sheet !== undefined ? [w.sheet] : [],
            ),
            ...Object.keys(sheetOverrides),
        ]),
    );
    const unmatchedTeams = plan
        ? Object.entries(plan.teamMap).flatMap(([name, resolution]) =>
              resolution.kind === "unmatched" ? [{ name, suggestions: resolution.suggestions }] : [],
          )
        : [];
    const unmatchedAgencies = plan
        ? Object.entries(plan.agencyMap).flatMap(([text, resolution]) =>
              resolution.kind === "unmatched" ? [{ text, suggestions: resolution.suggestions }] : [],
          )
        : [];

    if (ignoredSheets.length === 0 && unmatchedTeams.length === 0 && unmatchedAgencies.length === 0) return null;

    const teamById = new Map((plan?.context.teams ?? []).map((team) => [team.id, team]));
    const agencyById = new Map((plan?.context.agencies ?? []).map((agency) => [agency.id, agency]));

    return (
        <section data-component="ImportMappings" className="card">
            <div className="alert alert-warn rounded-b-none border-x-0 border-t-0">
                <FiAlertTriangle aria-hidden />
                <div>
                    <div className="title">Needs mapping</div>
                    <p>
                        The file uses names the app does not know. Point each at the right record, or leave it out. New
                        teams are created on the Teams page, not here.
                    </p>
                </div>
            </div>
            <div className="card-pad stack gap-4">
                {ignoredSheets.length > 0 && (
                    <MappingList title="Sheets that look like a team roster but matched no team">
                        {ignoredSheets.map((sheet) => (
                            <MappingRow key={sheet} label={sheet}>
                                <Select
                                    size="sm"
                                    aria-label={`Team for sheet ${sheet}`}
                                    value={sheetOverrides[sheet] ?? ""}
                                    onChange={(value) => {
                                        onMapSheet(sheet, value === "" ? null : value);
                                    }}
                                    options={[
                                        { value: "", label: "Leave this sheet out" },
                                        ...teamNames.map((name) => ({ value: name, label: name })),
                                    ]}
                                />
                            </MappingRow>
                        ))}
                    </MappingList>
                )}

                {unmatchedTeams.length > 0 && (
                    <MappingList title="Sheet teams that match no team in the app">
                        {unmatchedTeams.map(({ name, suggestions }) => {
                            const suggestedIds = new Set(suggestions.map((s) => s.teamId));
                            return (
                                <MappingRow key={name} label={name}>
                                    <Select
                                        size="sm"
                                        aria-label={`Team for ${name}`}
                                        placeholder="Choose a team…"
                                        value={
                                            choices.teamChoices[name] === undefined
                                                ? ""
                                                : String(choices.teamChoices[name])
                                        }
                                        onChange={(value) => {
                                            if (value !== "") onTeamChoice(name, Number(value));
                                        }}
                                        options={[
                                            ...suggestions.map((s) => ({
                                                value: String(s.teamId),
                                                label: `${teamById.get(s.teamId)?.name ?? "?"} · suggested ${pct(s.score)}`,
                                            })),
                                            ...(plan?.context.teams ?? [])
                                                .filter((team) => !suggestedIds.has(team.id))
                                                .map((team) => ({ value: String(team.id), label: team.name })),
                                        ]}
                                    />
                                </MappingRow>
                            );
                        })}
                    </MappingList>
                )}

                {unmatchedAgencies.length > 0 && (
                    <MappingList title="Agency names that match no agency in the app">
                        {unmatchedAgencies.map(({ text, suggestions }) => {
                            const suggestedIds = new Set(suggestions.map((s) => s.agencyId));
                            const current = choices.agencyChoices[text];
                            const value =
                                current === undefined
                                    ? ""
                                    : current === null
                                      ? "none"
                                      : current.kind === "new"
                                        ? "new"
                                        : String(current.id);
                            return (
                                <MappingRow key={text} label={text}>
                                    <Select
                                        size="sm"
                                        aria-label={`Agency for ${text}`}
                                        placeholder="Choose…"
                                        value={value}
                                        onChange={(next) => {
                                            if (next === "") return;
                                            if (next === "none") onAgencyChoice(text, null);
                                            else if (next === "new") onAgencyChoice(text, { kind: "new", name: text });
                                            else onAgencyChoice(text, { kind: "existing", id: Number(next) });
                                        }}
                                        options={[
                                            ...suggestions.map((s) => ({
                                                value: String(s.agencyId),
                                                label: `${agencyById.get(s.agencyId)?.name ?? "?"} · suggested ${pct(s.score)}`,
                                            })),
                                            ...(plan?.context.agencies ?? [])
                                                .filter((agency) => !suggestedIds.has(agency.id))
                                                .map((agency) => ({ value: String(agency.id), label: agency.name })),
                                            { value: "new", label: `Create agency "${text}"` },
                                            { value: "none", label: "No agency" },
                                        ]}
                                    />
                                </MappingRow>
                            );
                        })}
                    </MappingList>
                )}
            </div>
        </section>
    );
}

function MappingList({ title, children }: { title: string; children: ReactNode }) {
    return (
        <div data-component="MappingList">
            <h4 className="t-caps">{title}</h4>
            <ul className="mt-2 flex flex-col gap-2">{children}</ul>
        </div>
    );
}

function MappingRow({ label, children }: { label: string; children: ReactNode }) {
    return (
        <li data-component="MappingRow" className="t-sm flex flex-wrap items-center justify-between gap-3">
            <span className="font-medium">{label}</span>
            <span className="w-72 max-w-full">{children}</span>
        </li>
    );
}
