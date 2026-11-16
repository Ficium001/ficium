import { describe, expect, it, vi } from "vitest";
import { missingMigrations, readDrift } from "../_lib/schema-drift";
import { EXPECTED_MIGRATIONS } from "../_lib/expected-migrations";

const EXP = ["20270101000000_a", "20270102000000_b"];
const answer = (status: number, body: unknown) => vi.fn(async () => new Response(JSON.stringify(body), { status }));

describe("schema drift", () => {
  it("lists expected migrations the ledger does not have", () => {
    expect(missingMigrations(["20270101000000_a"], EXP)).toEqual(["20270102000000_b"]);
    expect(missingMigrations(["20270102000000_b", "20270101000000_a", "20260101000000_older"], EXP)).toEqual([]);
  });

  it("treats an unreadable ledger answer as nothing applied", () => {
    expect(missingMigrations(null, EXP)).toEqual(EXP);
    expect(missingMigrations({ message: "error" }, EXP)).toEqual(EXP);
    expect(missingMigrations([1, null, "20270101000000_a"], EXP)).toEqual(["20270102000000_b"]);
  });

  it("reads the ledger with the service key and reports nothing missing when all are applied", async () => {
    const f = answer(200, [...EXPECTED_MIGRATIONS]);
    await expect(readDrift("https://db.example", "svc", f as any)).resolves.toEqual([]);
    const [url, init] = f.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://db.example/rest/v1/rpc/admin_schema_status");
    expect(init.method).toBe("POST");
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer svc");
  });

  it("reports a migration that was merged but not applied", async () => {
    const f = answer(200, EXPECTED_MIGRATIONS.slice(0, -1));
    await expect(readDrift("https://db.example", "svc", f as any)).resolves.toEqual([EXPECTED_MIGRATIONS.at(-1)]);
  });

  it("treats a missing ledger as everything missing", async () => {
    await expect(readDrift("https://db.example", "svc", answer(404, {}) as any)).resolves.toEqual([...EXPECTED_MIGRATIONS]);
  });

  it("does not raise a false alarm when the database cannot be asked", async () => {
    await expect(readDrift("https://db.example", "svc", answer(503, {}) as any)).resolves.toBeNull();
    await expect(readDrift("https://db.example", "svc", vi.fn(async () => { throw new Error("timeout"); }) as any)).resolves.toBeNull();
  });
});
