// npm run auth:setup — writes ADMIN_EMAIL, ADMIN_PASSWORD_HASH and AUTH_SECRET to .env.local.
// The password is typed into a hidden prompt and only its scrypt hash is stored.
import { randomBytes, scrypt } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import readline from "node:readline";
import { promisify } from "node:util";

const scryptAsync = promisify(scrypt);
const ENV = ".env.local";

function ask(question, { hidden = false } = {}) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
  if (hidden) rl._writeToOutput = s => { if (s.includes(question)) rl.output.write(s); };
  return new Promise(res => rl.question(question, a => { rl.close(); if (hidden) process.stdout.write("\n"); res(a); }));
}

const email = (process.env.SETUP_EMAIL ?? await ask("Admin email: ")).trim().toLowerCase();
const password = process.env.SETUP_PASSWORD ?? await ask("Admin password (min 12 characters): ", { hidden: true });
if (!/^[^@\s]+@[^@\s]+$/.test(email)) { console.error("That is not an email address."); process.exit(1); }
if (password.length < 12) { console.error("Password must be at least 12 characters."); process.exit(1); }

const salt = randomBytes(16);
const hash = await scryptAsync(password, salt, 64);
const values = {
  ADMIN_EMAIL: email,
  ADMIN_PASSWORD_HASH: `scrypt$${salt.toString("base64url")}$${hash.toString("base64url")}`,
};

const existing = existsSync(ENV) ? readFileSync(ENV, "utf8") : "";
const keep = existing.split("\n").filter(l => l && !/^(ADMIN_EMAIL|ADMIN_PASSWORD_HASH)=/.test(l));
if (!keep.some(l => l.startsWith("AUTH_SECRET="))) keep.push(`AUTH_SECRET=${randomBytes(48).toString("base64url")}`);
// $ in the hash would be expanded by dotenv, so escape it
const lines = [...keep, ...Object.entries(values).map(([k, v]) => `${k}=${v.replace(/\$/g, "\\$")}`)];
writeFileSync(ENV, lines.join("\n") + "\n", { mode: 0o600 });
console.log(`Wrote ${ENV}. Restart the dev server to pick it up.`);
