// @vitest-environment node
import { describe, expect, it } from "vitest";
import { checkMigration, expectedSource, ledgerMigrations, withoutComments } from "./check-migrations.mjs";

const FILE = "20270101000000_add_thing.sql";
const RECORD = "SELECT admin.migration_applied('20270101000000_add_thing');";

describe("check-migrations", () => {
  it("accepts an additive migration that records itself", () => {
    expect(checkMigration(FILE, `BEGIN;\nCREATE TABLE public.thing (id uuid PRIMARY KEY);\nALTER TABLE public.clients ADD COLUMN nickname text;\n${RECORD}\nCOMMIT;`)).toEqual([]);
  });

  it("refuses a migration that does not record itself, or records another name", () => {
    expect(checkMigration(FILE, "CREATE TABLE public.thing (id uuid);")[0]).toMatch(/must record itself/);
    expect(checkMigration(FILE, "SELECT admin.migration_applied('20270101000000_other');")[0]).toMatch(/must record itself/);
    expect(checkMigration(FILE, `-- ${RECORD}`)[0]).toMatch(/must record itself/);
  });

  it.each([
    ["ALTER TABLE public.clients DROP COLUMN phone;", /drops/],
    ["DROP TABLE public.old_thing;", /drops an object/],
    ["DROP FUNCTION public.get_thing(uuid);", /drops an object/],
    ["ALTER TABLE public.clients RENAME COLUMN phone TO mobile;", /renames/],
    ["ALTER TABLE public.clients RENAME TO customers;", /renames/],
    ["ALTER TABLE public.requests ALTER COLUMN amount TYPE numeric(20,2);", /type/],
    ["ALTER TABLE public.requests ALTER COLUMN purpose SET NOT NULL;", /required/],
    ["TRUNCATE public.offer_listing;", /empties/],
  ])("refuses %s without an explanation", (statement, message) => {
    const problems = checkMigration(FILE, `${statement}\n${RECORD}`);
    expect(problems.some((p) => message.test(p))).toBe(true);
    expect(problems.every((p) => p.includes("-- compat:"))).toBe(true);
  });

  it("accepts a breaking change that explains itself", () => {
    const sql = `-- compat: phone moved to contact_phone in app 1.3.0; minimum app version is 1.3.0 since 2027-01-01\nALTER TABLE public.clients DROP COLUMN phone;\n${RECORD}`;
    expect(checkMigration(FILE, sql)).toEqual([]);
  });

  it("does not accept an empty or token explanation", () => {
    expect(checkMigration(FILE, `-- compat: ok\nDROP TABLE public.old_thing;\n${RECORD}`)).toHaveLength(1);
    expect(checkMigration(FILE, `-- compat:\nDROP TABLE public.old_thing;\n${RECORD}`)).toHaveLength(1);
  });

  it("ignores commented-out statements, and ordinary deletes inside functions", () => {
    expect(checkMigration(FILE, `-- DROP TABLE public.old_thing;\nCREATE FUNCTION f() RETURNS void LANGUAGE sql AS $$ DELETE FROM public.thing WHERE false $$;\n${RECORD}`)).toEqual([]);
    expect(withoutComments("a -- b\nc")).toBe("a \nc");
  });

  it("covers migrations from the ledger on, in order, and nothing else in the directory", () => {
    expect(ledgerMigrations(["README.md", "v2", "20260701_market_refresh_cron.sql", "20261114070000_old.sql",
      "20261116150000_migration_ledger.sql", "20261116120000_app_release_policy.sql", "fix_market_rls_grants.sql"]))
      .toEqual(["20261116120000_app_release_policy", "20261116150000_migration_ledger"]);
  });

  it("generates the expected list as source", () => {
    expect(expectedSource(["20261116120000_a", "20261116150000_b"])).toContain('  "20261116120000_a",\n  "20261116150000_b",\n];\n');
  });
});
