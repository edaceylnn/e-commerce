// Loads the same .env.local the Next.js app itself uses (see README's
// "Kurulum" section), so DATABASE_URL only needs to be defined in one place.
import { config } from "dotenv";
// quiet: true suppresses dotenv's own promotional "tip" lines (a stock
// feature of the package, unrelated to this project) from CLI output.
config({ path: ".env.local", quiet: true });

import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    // tsx (esbuild-based, bundler-style resolution) rather than plain
    // `node` or `ts-node`: the generated Prisma client (prisma-client
    // generator) is ESM with extensionless internal imports, which only
    // a bundler-style resolver — not Node's strict ESM resolver — loads.
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: process.env["DATABASE_URL"],
  },
});
