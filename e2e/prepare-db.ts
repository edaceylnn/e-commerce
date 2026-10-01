// Rebuilds the e2e database from scratch before the suite starts its own
// dev server (see playwright.config.ts): drop, create, migrate, seed. The
// tests then place real (simulated-payment) orders without ever touching
// the database you develop against.
//
// Refuses any database whose name doesn't end in "_e2e" — this script
// deletes everything in it.
import { execSync } from "node:child_process";
import { Client } from "pg";

async function main() {
  const url = new URL(process.env.DATABASE_URL ?? "");
  const name = url.pathname.slice(1);
  if (!name.endsWith("_e2e")) {
    throw new Error(`prepare-db only rebuilds an *_e2e database, got "${name}"`);
  }
  // Drop/create from template1, the one database every Postgres has (a
  // Homebrew install has no "postgres" database).
  const admin = new URL(url);
  admin.pathname = "/template1";
  admin.search = "";
  const client = new Client({ connectionString: admin.toString() });
  await client.connect();
  await client.query(`DROP DATABASE IF EXISTS "${name}" WITH (FORCE)`);
  await client.query(`CREATE DATABASE "${name}"`);
  await client.end();

  const run = (cmd: string) => execSync(cmd, { stdio: "inherit", env: process.env });
  run("npx prisma migrate deploy --config prisma7.config.ts");
  run("npx prisma db seed --config prisma7.config.ts");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
