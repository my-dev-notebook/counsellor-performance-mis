"use client";

import { useMemo, useState, useTransition } from "react";
import type { Applicant } from "@/utils/meritto/fetch-applicants";
import { testFetchApplicantsAction } from "@/app/tools/curl-parser/actions";
import { saveNpfSession } from "@/lib/nopaperformsSession";

type ParsedCurl = {
    method: string;
    url: string;
    queryParams: [string, string][];
    headers: [string, string][];
    cookies: [string, string][];
    bodyRaw: string | null;
    bodyParams: [string, string][];
};

const SAMPLE_CURL = `curl --url 'https://example.com/api/resource' \\
  -H 'accept: application/json' \\
  -H 'content-type: application/x-www-form-urlencoded' \\
  -b 'sessionId=REPLACE_ME; csrfToken=REPLACE_ME' \\
  --data-raw 'foo=bar&baz=qux'`;

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

function parseUrlEncoded(body: string): [string, string][] {
    if (body.length === 0) return [];
    return body.split("&").map((pair) => {
        const [key, value] = splitFirst(pair, "=");
        try {
            return [decodeURIComponent(key), decodeURIComponent(value.replace(/\+/g, " "))];
        } catch {
            return [key, value];
        }
    });
}

// Flags that take a value we don't otherwise surface — consume the value so
// it isn't misread as the URL, but discard it.
const IGNORED_VALUE_FLAGS = new Set([
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

const DATA_FLAGS = new Set(["--data-raw", "--data", "-d", "--data-urlencode", "--data-binary", "--data-ascii"]);

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
    let method = "GET";
    let explicitMethod = false;
    let url = "";
    const headers: [string, string][] = [];
    const cookies: [string, string][] = [];
    const bodyParts: string[] = [];

    for (let i = 0; i < tokens.length; i += 1) {
        const rawToken = tokens[i];
        if (rawToken === undefined || rawToken === "curl") continue;

        const equalsPair = splitEquals(rawToken);
        const flag = equalsPair ? equalsPair[0] : rawToken;
        const inlineValue = equalsPair ? equalsPair[1] : null;
        const nextValue = () => (inlineValue !== null ? inlineValue : (tokens[(i += 1)] ?? ""));

        if (flag === "--url") {
            url = nextValue();
        } else if (flag === "-X" || flag === "--request") {
            method = nextValue().toUpperCase();
            explicitMethod = true;
        } else if (flag === "-H" || flag === "--header") {
            const [key, value] = splitFirst(nextValue(), ":");
            if (key.length > 0) headers.push([key, value]);
        } else if (flag === "-b" || flag === "--cookie") {
            const cookieStr = nextValue();
            for (const pair of cookieStr.split(";")) {
                const [key, value] = splitFirst(pair, "=");
                if (key.trim().length > 0) cookies.push([key.trim(), value]);
            }
        } else if (DATA_FLAGS.has(flag)) {
            bodyParts.push(nextValue());
            if (!explicitMethod) method = "POST";
        } else if (IGNORED_VALUE_FLAGS.has(flag)) {
            nextValue();
        } else if (NO_ARG_FLAGS.has(flag)) {
            // no value to consume
        } else if (!rawToken.startsWith("-") && url === "") {
            url = rawToken;
        }
    }

    const bodyRaw = bodyParts.length > 0 ? bodyParts.join("&") : null;

    let queryParams: [string, string][] = [];
    let baseUrl = url;
    const queryIndex = url.indexOf("?");
    if (queryIndex !== -1) {
        baseUrl = url.slice(0, queryIndex);
        queryParams = parseUrlEncoded(url.slice(queryIndex + 1));
    }

    const contentType = headers.find(([key]) => key.toLowerCase() === "content-type")?.[1] ?? "";
    const bodyParams =
        bodyRaw !== null && contentType.toLowerCase().includes("x-www-form-urlencoded") ? parseUrlEncoded(bodyRaw) : [];

    return { method, url: baseUrl, queryParams, headers, cookies, bodyRaw, bodyParams };
}

function KeyValueTable({ rows, emptyLabel }: { rows: [string, string][]; emptyLabel: string }) {
    if (rows.length === 0) {
        return <p className="text-xs text-muted-foreground">{emptyLabel}</p>;
    }
    return (
        <div data-component="KeyValueTable" className="overflow-x-auto rounded-md border border-border">
            <table className="w-full text-xs">
                <tbody>
                    {rows.map(([key, value], i) => (
                        <tr key={`${key}-${String(i)}`} className="border-b border-border last:border-0">
                            <td className="w-1/3 border-r border-border bg-muted/40 px-2 py-1 font-medium break-all text-foreground">
                                {key}
                            </td>
                            <td className="px-2 py-1 break-all text-muted-foreground">{value}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

export function CurlParser() {
    const [input, setInput] = useState("");
    const parsed = useMemo(() => parseCurl(input), [input]);

    return (
        <div data-component="CurlParser" className="space-y-6">
            <div className="space-y-2">
                <label htmlFor="curl-input" className="text-sm font-medium text-foreground">
                    Paste a curl command
                </label>
                <textarea
                    id="curl-input"
                    value={input}
                    onChange={(e) => {
                        setInput(e.target.value);
                    }}
                    placeholder={SAMPLE_CURL}
                    rows={10}
                    className="w-full rounded-lg border border-border bg-card p-3 font-mono text-xs text-foreground focus:outline-none"
                    spellCheck={false}
                />
                <p className="text-xs text-muted-foreground">
                    Parsing happens locally in your browser. The &quot;Test fetch&quot; button below sends the
                    parsed URL/headers/body to the server to call the live endpoint — only use it with a curl you
                    trust, and avoid sharing this page while a real session cookie is pasted in.
                </p>
            </div>

            {parsed && (
                <div className="space-y-4">
                    <div className="rounded-lg border border-border bg-card p-4">
                        <h3 className="mb-2 text-sm font-semibold text-foreground">Request</h3>
                        <div className="flex flex-wrap items-center gap-2 text-xs">
                            <span className="rounded bg-primary/10 px-2 py-0.5 font-mono font-semibold text-primary">
                                {parsed.method}
                            </span>
                            <span className="font-mono break-all text-foreground">{parsed.url}</span>
                        </div>
                    </div>

                    {parsed.queryParams.length > 0 && (
                        <div className="rounded-lg border border-border bg-card p-4">
                            <h3 className="mb-2 text-sm font-semibold text-foreground">Query params</h3>
                            <KeyValueTable rows={parsed.queryParams} emptyLabel="None" />
                        </div>
                    )}

                    <div className="rounded-lg border border-border bg-card p-4">
                        <h3 className="mb-2 text-sm font-semibold text-foreground">Headers</h3>
                        <KeyValueTable rows={parsed.headers} emptyLabel="None" />
                    </div>

                    <div className="rounded-lg border border-border bg-card p-4">
                        <h3 className="mb-2 text-sm font-semibold text-foreground">Cookies</h3>
                        <KeyValueTable rows={parsed.cookies} emptyLabel="None" />
                    </div>

                    {parsed.bodyRaw !== null && (
                        <div className="rounded-lg border border-border bg-card p-4">
                            <h3 className="mb-2 text-sm font-semibold text-foreground">Body</h3>
                            {parsed.bodyParams.length > 0 ? (
                                <KeyValueTable rows={parsed.bodyParams} emptyLabel="None" />
                            ) : (
                                <pre className="overflow-x-auto rounded-md border border-border bg-muted/40 p-2 text-xs break-all whitespace-pre-wrap text-foreground">
                                    {parsed.bodyRaw}
                                </pre>
                            )}
                        </div>
                    )}

                    <TestFetchPanel
                        url={parsed.url}
                        headers={parsed.headers}
                        cookies={parsed.cookies}
                        bodyParams={parsed.bodyParams}
                    />
                </div>
            )}
        </div>
    );
}

/** Advance-filter slot the captured curl carries the counsellor filter in. */
const COUNSELLOR_ID_PARAM = "application_advance_filter[0][1][values][]";

function TestFetchPanel({
    url,
    headers,
    cookies,
    bodyParams,
}: {
    url: string;
    headers: [string, string][];
    cookies: [string, string][];
    bodyParams: [string, string][];
}) {
    const [pending, startTransition] = useTransition();
    const [result, setResult] = useState<Applicant[] | null>(null);
    const [error, setError] = useState<string | null>(null);

    const counsellorId = Number(bodyParams.find(([key]) => key === COUNSELLOR_ID_PARAM)?.[1] ?? "");
    const hasCounsellorId = Number.isInteger(counsellorId) && counsellorId > 0;

    const run = () => {
        setError(null);
        setResult(null);
        startTransition(async () => {
            try {
                const headerMap = Object.fromEntries(headers);
                if (cookies.length > 0) {
                    headerMap["cookie"] = cookies.map(([key, value]) => `${key}=${value}`).join("; ");
                }
                const applicants = await testFetchApplicantsAction(url, headerMap, counsellorId);
                setResult(applicants);
                if (applicants.length > 0) {
                    saveNpfSession(headerMap, url);
                }
            } catch (err) {
                setError(err instanceof Error ? err.message : "Request failed.");
            }
        });
    };

    return (
        <div data-component="TestFetchPanel" className="rounded-lg border border-border bg-card p-4">
            <h3 className="mb-2 text-sm font-semibold text-foreground">Test fetch (today)</h3>
            <p className="mb-3 text-xs text-muted-foreground">
                Calls <code>fetchApplicants</code> with the parsed URL/headers and the counsellor id found in the
                captured body (<code>{COUNSELLOR_ID_PARAM}</code>), for today&apos;s date. The request body is rebuilt
                server-side, so this exercises the same path the daily-entry auto-fetch uses. Expects a non-empty
                array back.
            </p>
            <button
                type="button"
                onClick={run}
                disabled={pending || url === "" || !hasCounsellorId}
                className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground disabled:opacity-50"
            >
                {pending ? "Fetching…" : "Run test fetch"}
            </button>

            {error && <p className="mt-3 text-xs text-destructive">{error}</p>}

            {result && (
                <div className="mt-3 space-y-2">
                    <p className={`text-xs font-medium ${result.length > 0 ? "text-primary" : "text-destructive"}`}>
                        {result.length > 0
                            ? `OK — got ${String(result.length)} applicant(s). Headers/cookies saved to localStorage for reuse.`
                            : "Returned an empty array — not working as expected."}
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
                                    {result.slice(0, 20).map((row, i) => (
                                        <tr key={`${row.userId}-${String(i)}`} className="border-b border-border last:border-0">
                                            <td className="px-2 py-1 text-muted-foreground">{row.userId}</td>
                                            <td className="px-2 py-1 text-muted-foreground">{row.registeredName}</td>
                                            <td className="px-2 py-1 text-muted-foreground">{row.applicationNumber}</td>
                                            <td className="px-2 py-1 text-muted-foreground">{row.formName}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {result.length > 20 && (
                                <p className="px-2 py-1 text-[10px] text-muted-foreground">
                                    Showing 20 of {result.length}.
                                </p>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
