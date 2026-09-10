"use client";

import { useMemo, useState, useTransition } from "react";
import type { Applicant } from "@/utils/meritto/fetch-applicants";
import { verifyMerittoSessionAction } from "@/app/tools/meritto-auth/actions";
import { saveNpfSession } from "@/lib/nopaperformsSession";

/** Only the credentials matter here — the request body is rebuilt server-side. */
type ParsedCurl = {
    url: string;
    headers: [string, string][];
    cookies: [string, string][];
};

const SAMPLE_CURL = `curl --url 'https://<tenant>.nopaperforms.io/applications/ajax-lists' \\
  -H 'content-type: application/x-www-form-urlencoded; charset=UTF-8' \\
  -H 'x-csrf-token: REPLACE_ME' \\
  -b 'csrfToken=REPLACE_ME; NPFSSID=REPLACE_ME' \\
  --data-raw '...'`;

const ANSI_C_ESCAPES: Record<string, string> = { n: "\n", t: "\t", r: "\r", "\\": "\\", "'": "'" };

/**
 * Splits a shell-style argument string into tokens. Supports single quotes
 * (literal), double quotes (backslash-escapes `\"` and `\\`), ANSI-C `$'...'`
 * quotes (backslash escapes like `\n`), and `\`-newline line continuations.
 */
function tokenize(input: string): string[] {
    const tokens: string[] = [];
    let current = "";
    let quote: "'" | '"' | "$'" | null = null;
    let i = 0;

    while (i < input.length) {
        const char = input[i];
        const next = input[i + 1];
        if (char === undefined) break;

        if (quote === "'") {
            if (char === "'") {
                quote = null;
            } else {
                current += char;
            }
            i += 1;
            continue;
        }

        if (quote === '"') {
            if (char === '"') {
                quote = null;
                i += 1;
            } else if (char === "\\" && (input[i + 1] === '"' || input[i + 1] === "\\" || input[i + 1] === "$")) {
                current += input[i + 1];
                i += 2;
            } else {
                current += char;
                i += 1;
            }
            continue;
        }

        if (quote === "$'") {
            if (char === "'") {
                quote = null;
                i += 1;
            } else if (char === "\\" && next !== undefined) {
                current += ANSI_C_ESCAPES[next] ?? next;
                i += 2;
            } else {
                current += char;
                i += 1;
            }
            continue;
        }

        if (char === "$" && input[i + 1] === "'") {
            quote = "$'";
            i += 2;
            continue;
        }

        if (char === "'" || char === '"') {
            quote = char;
            i += 1;
            continue;
        }

        if (char === "\\" && (input[i + 1] === "\n" || (input[i + 1] === "\r" && input[i + 2] === "\n"))) {
            i += input[i + 1] === "\r" ? 3 : 2;
            continue;
        }

        if (/\s/.test(char)) {
            if (current.length > 0) {
                tokens.push(current);
                current = "";
            }
            i += 1;
            continue;
        }

        current += char;
        i += 1;
    }

    if (current.length > 0) tokens.push(current);
    return tokens;
}

function splitFirst(pair: string, separator: string): [string, string] {
    const index = pair.indexOf(separator);
    if (index === -1) return [pair.trim(), ""];
    return [pair.slice(0, index).trim(), pair.slice(index + 1).trim()];
}

// Flags that take a value we don't keep — consume the value so it isn't
// misread as the URL, but discard it. The captured body lands here too: the
// listing body is rebuilt server-side, so whatever filters were applied when
// the curl was captured are irrelevant.
const IGNORED_VALUE_FLAGS = new Set([
    "--data-raw",
    "--data",
    "-d",
    "--data-urlencode",
    "--data-binary",
    "--data-ascii",
    "-X",
    "--request",
    "-A",
    "--user-agent",
    "-e",
    "--referer",
    "--connect-timeout",
    "-m",
    "--max-time",
    "--cookie-jar",
    "-c",
    "--output",
    "-o",
    "--proxy",
    "-x",
    "--resolve",
    "--cacert",
    "--cert",
    "-E",
    "--key",
    "--interface",
    "--limit-rate",
    "--retry",
]);

// Flags that take no value — must not consume the following token.
const NO_ARG_FLAGS = new Set([
    "--compressed",
    "-s",
    "--silent",
    "-k",
    "--insecure",
    "-L",
    "--location",
    "-v",
    "--verbose",
    "-i",
    "--include",
    "-f",
    "--fail",
    "-g",
    "--globoff",
    "-N",
    "--no-buffer",
    "--http1.1",
    "--http2",
    "-4",
    "-6",
    "-J",
    "--remote-header-name",
    "--anyauth",
]);

/** Splits `--flag=value` into `[flag, value]`; returns null if the token has no `=`. */
function splitEquals(token: string): [string, string] | null {
    if (!token.startsWith("--")) return null;
    const index = token.indexOf("=");
    if (index === -1) return null;
    return [token.slice(0, index), token.slice(index + 1)];
}

function parseCurl(input: string): ParsedCurl | null {
    const trimmed = input.trim();
    if (trimmed.length === 0) return null;

    const tokens = tokenize(trimmed);
    let url = "";
    const headers: [string, string][] = [];
    const cookies: [string, string][] = [];

    for (let i = 0; i < tokens.length; i += 1) {
        const rawToken = tokens[i];
        if (rawToken === undefined || rawToken === "curl") continue;

        const equalsPair = splitEquals(rawToken);
        const flag = equalsPair ? equalsPair[0] : rawToken;
        const inlineValue = equalsPair ? equalsPair[1] : null;
        const nextValue = () => (inlineValue !== null ? inlineValue : (tokens[(i += 1)] ?? ""));

        if (flag === "--url") {
            url = nextValue();
        } else if (flag === "-H" || flag === "--header") {
            const [key, value] = splitFirst(nextValue(), ":");
            if (key.length > 0) headers.push([key, value]);
        } else if (flag === "-b" || flag === "--cookie") {
            for (const pair of nextValue().split(";")) {
                const [key, value] = splitFirst(pair, "=");
                if (key.trim().length > 0) cookies.push([key.trim(), value]);
            }
        } else if (IGNORED_VALUE_FLAGS.has(flag)) {
            nextValue();
        } else if (NO_ARG_FLAGS.has(flag)) {
            // no value to consume
        } else if (!rawToken.startsWith("-") && url === "") {
            url = rawToken;
        }
    }

    return { url, headers, cookies };
}

function buildHeaderMap(headers: [string, string][], cookies: [string, string][]): Record<string, string> {
    const headerMap = Object.fromEntries(headers);
    if (cookies.length > 0) {
        headerMap["cookie"] = cookies.map(([key, value]) => `${key}=${value}`).join("; ");
    }
    return headerMap;
}

function blockedReasonFor(parsed: ParsedCurl | null): string | null {
    if (parsed === null) return "Paste a curl captured from the Meritto application manager.";
    if (parsed.url === "") return "No URL found in the pasted curl.";
    if (!parsed.headers.some(([key]) => key.toLowerCase() === "x-csrf-token")) {
        return "The pasted curl has no 'x-csrf-token' header — the listing request needs one.";
    }
    return null;
}

export function MerittoAuth() {
    const [input, setInput] = useState("");
    const [pending, startTransition] = useTransition();
    const [result, setResult] = useState<Applicant[] | null>(null);
    const [error, setError] = useState<string | null>(null);

    const parsed = useMemo(() => parseCurl(input), [input]);
    const blockedReason = blockedReasonFor(parsed);

    const run = () => {
        if (parsed === null) return;
        setError(null);
        setResult(null);
        startTransition(async () => {
            try {
                const headerMap = buildHeaderMap(parsed.headers, parsed.cookies);
                const applicants = await verifyMerittoSessionAction(parsed.url, headerMap);
                setResult(applicants);
                if (applicants.length > 0) {
                    saveNpfSession(headerMap, parsed.url);
                }
            } catch (err) {
                setError(err instanceof Error ? err.message : "Request failed.");
            }
        });
    };

    return (
        <div data-component="MerittoAuth" className="space-y-4">
            <div className="space-y-2">
                <label htmlFor="curl-input" className="text-sm font-medium text-foreground">
                    Paste a curl from Meritto
                </label>
                <textarea
                    id="curl-input"
                    value={input}
                    onChange={(e) => {
                        setInput(e.target.value);
                    }}
                    placeholder={SAMPLE_CURL}
                    rows={8}
                    className="w-full rounded-lg border border-border bg-card p-3 font-mono text-xs text-foreground focus:outline-none"
                    spellCheck={false}
                />
                <p className="text-xs text-muted-foreground">
                    Only the URL, headers and cookies are taken from the curl — the request body is rebuilt on the
                    server. Connecting fetches the first page of the application listing to prove the session works,
                    then stores the credentials for the daily-entry auto-fetch. Don&apos;t share this page while a real
                    session cookie is pasted in.
                </p>
            </div>

            <div className="space-y-2">
                <button
                    type="button"
                    onClick={run}
                    disabled={pending || blockedReason !== null}
                    className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground disabled:opacity-50"
                >
                    {pending ? "Connecting…" : "Connect"}
                </button>
                {input.trim().length > 0 && blockedReason !== null && (
                    <p className="text-xs text-destructive">{blockedReason}</p>
                )}
                {error && <p className="text-xs text-destructive">{error}</p>}
            </div>

            {result && (
                <div className="space-y-2">
                    <p className={`text-xs font-medium ${result.length > 0 ? "text-primary" : "text-destructive"}`}>
                        {result.length > 0
                            ? `Connected — got ${String(result.length)} applicant(s). Session saved for reuse.`
                            : "Returned an empty list — the session doesn't look usable."}
                    </p>
                    {result.length > 0 && (
                        <div className="overflow-x-auto rounded-md border border-border">
                            <table className="w-full text-xs">
                                <thead>
                                    <tr className="border-b border-border bg-muted/40">
                                        <th className="px-2 py-1 text-left font-medium text-foreground">User ID</th>
                                        <th className="px-2 py-1 text-left font-medium text-foreground">Name</th>
                                        <th className="px-2 py-1 text-left font-medium text-foreground">
                                            Application No
                                        </th>
                                        <th className="px-2 py-1 text-left font-medium text-foreground">Form</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {result.map((row, i) => (
                                        <tr
                                            key={`${row.userId}-${String(i)}`}
                                            className="border-b border-border last:border-0"
                                        >
                                            <td className="px-2 py-1 text-muted-foreground">{row.userId}</td>
                                            <td className="px-2 py-1 text-muted-foreground">{row.registeredName}</td>
                                            <td className="px-2 py-1 text-muted-foreground">{row.applicationNumber}</td>
                                            <td className="px-2 py-1 text-muted-foreground">{row.formName}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
