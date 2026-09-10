/**
 * Persists the last-known-working nopaperforms.io request headers/cookies
 * (as captured from a curl and verified via the Meritto Auth tool) in
 * localStorage, so other tools that call `fetchApplicants` can reuse them
 * instead of asking the user to paste a curl again. Only credentials are
 * stored — `fetchApplicants` builds its own request body, so the captured
 * body is not kept.
 */

const STORAGE_KEY = "npf-session";

export type StoredNpfSession = {
    headers: Record<string, string>;
    /** `ajax-lists` endpoint URL the session was captured against. */
    url: string;
    savedAt: string;
};

export function saveNpfSession(headers: Record<string, string>, url: string): void {
    const stored: StoredNpfSession = { headers, url, savedAt: new Date().toISOString() };
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
    } catch {
        // localStorage unavailable (private browsing, blocked site data, etc.) — skip silently.
    }
}

export function loadNpfSession(): StoredNpfSession | null {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return null;
        return JSON.parse(raw) as StoredNpfSession;
    } catch {
        return null;
    }
}

export function clearNpfSession(): void {
    try {
        localStorage.removeItem(STORAGE_KEY);
    } catch {
        // ignore
    }
}
