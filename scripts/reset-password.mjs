/**
 * Resets one user's password back to the default ("change-it") and signs them
 * out everywhere. The app then forces a new password on their next login.
 *
 * Usage:
 *   pnpm db:reset-password <email>            # local D1 (.wrangler/state)
 *   pnpm db:reset-password <email> --remote   # staging D1 on Cloudflare
 *
 * The hash is generated here with a fresh salt, in the same format
 * src/lib/auth/password.ts verifies, and applied with `wrangler d1 execute`.
 * (Admins can also do this from the Users page with "Reset password".)
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { webcrypto } from "node:crypto";

const DEFAULT_PASSWORD = "change-it";
const ITERATIONS = 100_000;

async function hashPassword(password) {
    const salt = webcrypto.getRandomValues(new Uint8Array(16));
    const key = await webcrypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
    const bits = await webcrypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt, iterations: ITERATIONS }, key, 256);
    const b64 = (bytes) => Buffer.from(bytes).toString("base64");
    return `pbkdf2-sha256$${String(ITERATIONS)}$${b64(salt)}$${b64(new Uint8Array(bits))}`;
}

const quote = (value) => `'${String(value).replace(/'/g, "''")}'`;

async function main() {
    const args = process.argv.slice(2);
    const remote = args.includes("--remote");
    const email = args.find((a) => !a.startsWith("--"))?.trim().toLowerCase();
    if (!email) {
        console.error("usage: node scripts/reset-password.mjs <email> [--remote]");
        process.exit(1);
    }

    const hash = await hashPassword(DEFAULT_PASSWORD);
    const sql = [
        `UPDATE users SET password_hash = ${quote(hash)}, password_changed_at = NULL, updated_at = datetime('now') WHERE email = ${quote(email)};`,
        `DELETE FROM sessions WHERE user_id = (SELECT id FROM users WHERE email = ${quote(email)});`,
        `SELECT id, name, email, password_changed_at FROM users WHERE email = ${quote(email)};`,
    ].join("\n");

    const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "reset-password-")), "reset.sql");
    fs.writeFileSync(file, sql);

    try {
        const result = spawnSync(
            "pnpm",
            ["exec", "wrangler", "d1", "execute", "DB", "--env", "staging", remote ? "--remote" : "--local", "--json", "--file", file],
            { encoding: "utf8" },
        );
        if (result.status !== 0) {
            console.error(result.stderr || result.stdout);
            process.exit(result.status ?? 1);
        }
        const [, , select] = JSON.parse(result.stdout);
        const user = select?.results?.[0];
        if (!user) {
            console.error(`No user with email ${email} on the ${remote ? "remote" : "local"} database.`);
            process.exit(1);
        }
        console.log(`Reset ${user.name} <${user.email}> (id ${String(user.id)}) on the ${remote ? "remote" : "local"} database.`);
        console.log(`Password is now "${DEFAULT_PASSWORD}"; they must choose a new one at next login.`);
    } finally {
        fs.rmSync(path.dirname(file), { recursive: true, force: true });
    }
}

await main();
