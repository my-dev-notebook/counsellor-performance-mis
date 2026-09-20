import { webcrypto } from "node:crypto";
import readline from "node:readline/promises";

const ALGORITHM = "pbkdf2-sha256";
const ITERATIONS = 100_000;

async function hashPassword(password: string) {
    const salt = webcrypto.getRandomValues(new Uint8Array(16));
    const key = await webcrypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
    const bits = await webcrypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt, iterations: ITERATIONS }, key, 256);
    const b64 = (bytes: Uint8Array<ArrayBuffer>) => Buffer.from(bytes).toString("base64");
    return `${ALGORITHM}$${String(ITERATIONS)}$${b64(salt)}$${b64(new Uint8Array(bits))}`;
}

const stdinReader = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
})

const email = await stdinReader.question("Email: ");
const password = await stdinReader.question("Password: ");

let roleId = -1;
while (roleId === -1) {
    const role = await stdinReader.question("Role (admin,quality_analyst,mis_executive,counsellor): ");

    switch (role) {
        case "counsellor":
            roleId = 1;
            break;
        case "team_leader":
            roleId = 2;
            break;
        case "mis_executive":
            roleId = 3;
            break;
        case "admin":
            roleId = 4;
            break;
        case "quality_analyst":
            roleId = 5;
            break;
        default:
            console.log("Invalid role!");
            break;
    }
}

stdinReader.close();

const query = (`INSERT INTO users (name, email, role_id, is_active, password_hash) VALUES ('Anon', '${email}', ${roleId}, 1, '${await hashPassword(password)}');`);
console.log(query);
