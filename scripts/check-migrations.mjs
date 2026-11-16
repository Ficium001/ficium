#!/usr/bin/env node
/**
 * Guards for App DB migrations (supabase/migrations/<14 digits>_<name>.sql), from the ledger on.
 *
 *  1. Recorded.   A migration must end by recording itself:
 *                   SELECT admin.migration_applied('<file name without .sql>');
 *                 so the ledger row lands in the same transaction as the change, however it is
 *                 applied. Three times a merged migration was never applied; this is what lets
 *                 the deployed app notice (api/keepalive.ts).
 *  2. Expected.   api/_lib/expected-migrations.ts lists the migrations the deployed app checks
 *                 for. It must match the directory. `--write` regenerates it.
 *  3. Compatible. Installed phone apps keep using the database as it was when they were built.
 *                 A migration that drops or renames something, or changes a column's type, must
 *                 say why that cannot break them:
 *                   -- compat: <reason, or the minimum app version this requires>
 *                 Add first, remove later: ship the app that no longer needs it, raise the
 *                 minimum version in the admin site, then drop.
 *
 *   node scripts/check-migrations.mjs           check (CI)
 *   node scripts/check-migrations.mjs --write   regenerate the expected list
 */
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

/** The ledger covers migrations from this one on. */
export const LEDGER_START = "20261116120000";
/**
 * The first migration that records itself and is held to the rules below. The one before it
 * (app_release_policy) was applied before the ledger existed and is recorded by the ledger migration.
 */
export const RULES_START = "20261116150000";
const NAME = /^(\d{14})_[a-z0-9_]{1,80}\.sql$/;

/** SQL with `--` comments removed, so commented-out statements are not judged. */
export function withoutComments(sql) {
  return sql.split("\n").map((line) => line.replace(/--.*$/, "")).join("\n");
}

const BREAKING = [
  [/\bDROP\s+(TABLE|VIEW|MATERIALIZED\s+VIEW|FUNCTION|TYPE|SCHEMA|POLICY|COLUMN)\b/i, "drops an object"],
  [/\bALTER\s+TABLE\b[^;]*\bDROP\s+(COLUMN|CONSTRAINT)\b/i, "drops a column or constraint"],
  [/\bRENAME\s+(TO|COLUMN|CONSTRAINT)\b/i, "renames something"],
  [/\bALTER\s+COLUMN\b[^;]*\b(SET\s+DATA\s+)?TYPE\b/i, "changes a column's type"],
  [/\bALTER\s+COLUMN\b[^;]*\bSET\s+NOT\s+NULL\b/i, "makes a column required"],
  [/\bTRUNCATE\b/i, "empties a table"],
];

/** Problems with one migration file. Empty when it is fine. */
export function checkMigration(file, sql) {
  const version = file.replace(/\.sql$/, "");
  const problems = [];
  const code = withoutComments(sql);

  const records = [...code.matchAll(/admin\.migration_applied\(\s*'([^']+)'\s*\)/g)].map((m) => m[1]);
  if (!records.includes(version)) {
    problems.push(`${file}: must record itself with  SELECT admin.migration_applied('${version}');`);
  }

  const acknowledged = /^[ \t]*--[ \t]*compat:[ \t]*\S.{9,}/im.test(sql);
  if (!acknowledged) {
    for (const [pattern, what] of BREAKING) {
      if (pattern.test(code)) {
        problems.push(`${file}: ${what}, which can break installed phone apps. Add a line  -- compat: <why it cannot, or the minimum app version it requires>`);
      }
    }
  }
  return problems;
}

/** Migration versions the ledger covers, in order. */
export function ledgerMigrations(files) {
  return files.filter((f) => NAME.test(f) && f.slice(0, 14) >= LEDGER_START).map((f) => f.replace(/\.sql$/, "")).sort();
}

export function expectedSource(versions) {
  return [
    "/**",
    " * Migrations the deployed app expects to find applied (api/keepalive.ts compares this with the",
    " * database's ledger). Generated: run `node scripts/check-migrations.mjs --write`. CI fails if it",
    " * does not match supabase/migrations/.",
    " */",
    "export const EXPECTED_MIGRATIONS: readonly string[] = [",
    ...versions.map((v) => `  "${v}",`),
    "];",
    "",
  ].join("\n");
}

function main() {
  const root = new URL("../", import.meta.url);
  const dir = new URL("supabase/migrations/", root);
  const versions = ledgerMigrations(readdirSync(dir));
  const expectedFile = new URL("api/_lib/expected-migrations.ts", root);

  if (process.argv.includes("--write")) {
    writeFileSync(expectedFile, expectedSource(versions));
    console.log(`check-migrations: wrote ${versions.length} expected migration(s).`);
    return;
  }

  const problems = versions
    .filter((v) => v.slice(0, 14) >= RULES_START)
    .flatMap((v) => checkMigration(`${v}.sql`, readFileSync(new URL(`${v}.sql`, dir), "utf8")));
  let current = "";
  try { current = readFileSync(expectedFile, "utf8"); } catch { /* reported below */ }
  if (current !== expectedSource(versions)) {
    problems.push("api/_lib/expected-migrations.ts does not match supabase/migrations/. Run: node scripts/check-migrations.mjs --write");
  }

  if (problems.length) {
    for (const p of problems) console.error(`check-migrations: ${p}`);
    process.exitCode = 1;
  } else {
    console.log(`check-migrations: ok (${versions.length} migration(s) from the ledger on).`);
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
