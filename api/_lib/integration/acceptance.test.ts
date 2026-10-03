import { describe, expect, it, vi } from "vitest";
import { SIGNATURE_HEADER, verify } from "@ficium/contract";
import { acceptViaContract, toLegacyReveal, type AcceptanceDeps, type Prepared } from "./acceptance";

const KEY = "accept-key-test";
const PREP: Prepared = {
  anon_borrower_id: "00000000-0000-4000-8000-000000000002",
  released_identity: { full_name: "Jane Doe", email: "jane@example.com" },
  consent_ref: "consent_0123456789abcdef",
};
const RESPONSE = {
  bid_id: "00000000-0000-4000-8000-000000000010", request_id: "00000000-0000-4000-8000-000000000001",
  pipeline_id: "ede0eaef-e443-492f-ab8b-81763af5c379",
  institution: { institution_id: "f192050a-dfdd-4da7-874e-c3db88f11e41", name: "MCB", contact_email: "mcbadmin@mcb.mu",
                 contact_phone: "+23058610490", legal_name: "MCB", contact_person: "MCB Admin", logo_url: null },
  deal: { amount: 3000000, rate: 0.08, term_months: 240, rate_type: "fixed" },
};

function deps(over: Partial<AcceptanceDeps> = {}) {
  const completed: Array<[string, string, string | null]> = [];
  const d: AcceptanceDeps = {
    prepare: vi.fn(async () => PREP),
    complete: vi.fn(async (ref, o, i) => void completed.push([ref, o, i])),
    fetchFn: vi.fn(async () => new Response(JSON.stringify(RESPONSE), { status: 200 })) as unknown as typeof fetch,
    url: "https://portal.test/integration/v1/acceptances",
    signingKey: KEY,
    ...over,
  };
  return { d, completed };
}
const run = (d: AcceptanceDeps) => acceptViaContract(d, "client-1", RESPONSE.request_id, RESPONSE.bid_id);

describe("acceptViaContract", () => {
  it("sends only the released fields, signed with the acceptance key, keyed by the consent ref", async () => {
    const { d, completed } = deps();
    const out = await run(d);
    expect(out.status).toBe(200);
    const [, init] = (d.fetchFn as any).mock.calls[0];
    const body = JSON.parse(init.body);
    expect(body.released_identity).toEqual(PREP.released_identity);
    expect(init.headers["Idempotency-Key"]).toBe(PREP.consent_ref);
    verify(init.headers[SIGNATURE_HEADER], init.body, [KEY]);
    expect(completed).toEqual([[PREP.consent_ref, "accepted", RESPONSE.institution.institution_id]]);
  });

  it("gives the browser exactly the legacy shape", async () => {
    const out = await run(deps().d);
    expect(out.reveal).toEqual({
      institution_id: RESPONSE.institution.institution_id, institution_name: "MCB", legal_name: "MCB",
      contact_person: "MCB Admin", contact_email: "mcbadmin@mcb.mu", contact_phone: "+23058610490", logo_url: null,
      pipeline_id: RESPONSE.pipeline_id, rate: 0.08, rate_type: "fixed", amount_offered: 3000000, term_months: 240,
    });
    expect(toLegacyReveal(RESPONSE)).toEqual(out.reveal);
  });

  it("a lost reply is marked failed so the retry re-sends the same call (portal replays its answer)", async () => {
    const { d, completed } = deps({ fetchFn: vi.fn(async () => { throw new Error("timeout"); }) as unknown as typeof fetch });
    const out = await run(d);
    expect(out.status).toBe(502);
    expect(completed).toEqual([[PREP.consent_ref, "failed", null]]);
  });

  it.each([[409, "refused"], [403, "refused"], [500, "failed"], [503, "failed"]])("portal %i is recorded as %s", async (code, outcome) => {
    const { d, completed } = deps({ fetchFn: vi.fn(async () => new Response('{"error":"x"}', { status: code })) as unknown as typeof fetch });
    const out = await run(d);
    expect(out.status).toBe(code);
    expect(completed[0][1]).toBe(outcome);
  });

  it("never sends a body outside the contract", async () => {
    const { d, completed } = deps({ prepare: vi.fn(async () => ({ ...PREP, released_identity: { email: "x@example.com" } })) });
    const out = await run(d);  // no full_name: the contract requires it
    expect(out.status).toBe(422);
    expect(d.fetchFn).not.toHaveBeenCalled();
    expect(completed[0][1]).toBe("refused");
  });

  it("rejects a portal answer outside the contract", async () => {
    const { d, completed } = deps({ fetchFn: vi.fn(async () => new Response('{"ok":true}', { status: 200 })) as unknown as typeof fetch });
    expect((await run(d)).status).toBe(502);
    expect(completed[0][1]).toBe("failed");
  });

  it.each([["not the request owner", 403], ["request not found", 404], ["no name on file: identity cannot be released", 422]])(
    "prepare error '%s' -> %i, nothing sent", async (m, code) => {
      const { d } = deps({ prepare: vi.fn(async () => { throw new Error(m); }) });
      expect((await run(d)).status).toBe(code);
      expect(d.fetchFn).not.toHaveBeenCalled();
    });
});
