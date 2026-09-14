/**
 * Password hashing on Web Crypto only, so the same code runs in Node (the
 * seed script, scripts/seed-users.mjs, re-implements this format) and in the
 * Cloudflare Worker at login time.
 *
 * Stored format: `pbkdf2-sha256$<iterations>$<salt b64>$<digest b64>`.
 * Iterations are capped at 100k because that is the most workerd allows for
 * PBKDF2; the count is stored per hash so it can be raised later without
 * invalidating existing rows.
 */

const ALGORITHM = "pbkdf2-sha256";
const ITERATIONS = 100_000;
const SALT_BYTES = 16;
const DIGEST_BITS = 256;

const encoder = new TextEncoder();

function toBase64(bytes: Uint8Array): string {
    let binary = "";
    for (const byte of bytes) binary += String.fromCharCode(byte);
    return btoa(binary);
}

function fromBase64(text: string): Uint8Array {
    const binary = atob(text);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
}

async function derive(password: string, salt: Uint8Array, iterations: number): Promise<Uint8Array> {
    const key = await crypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, ["deriveBits"]);
    const bits = await crypto.subtle.deriveBits(
        { name: "PBKDF2", hash: "SHA-256", salt: salt as BufferSource, iterations },
        key,
        DIGEST_BITS,
    );
    return new Uint8Array(bits);
}

export async function hashPassword(password: string): Promise<string> {
    const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
    const digest = await derive(password, salt, ITERATIONS);
    return `${ALGORITHM}$${String(ITERATIONS)}$${toBase64(salt)}$${toBase64(digest)}`;
}

/** Constant-time comparison of two equal-length byte arrays. */
function equal(a: Uint8Array, b: Uint8Array): boolean {
    if (a.length !== b.length) return false;
    let diff = 0;
    for (let i = 0; i < a.length; i++) diff |= (a[i] ?? 0) ^ (b[i] ?? 0);
    return diff === 0;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
    const [algorithm, iterationsText, saltText, digestText] = stored.split("$");
    if (algorithm !== ALGORITHM || iterationsText === undefined || saltText === undefined || digestText === undefined) {
        return false;
    }
    const iterations = Number.parseInt(iterationsText, 10);
    if (!Number.isInteger(iterations) || iterations <= 0) return false;
    const digest = await derive(password, fromBase64(saltText), iterations);
    return equal(digest, fromBase64(digestText));
}
