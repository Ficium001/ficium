import { describe, expect, it, vi } from "vitest";
import { sign } from "@ficium/contract";
import { receiveAdminClients, type AdminClientsDeps } from "./admin-clients";

const KEY = "admin-sync-test-key";
const CID = "11111111-1111-4111-8111-111111111111";
const raw = (b: unknown) => Buffer.from(JSON.stringify(b));
const signed = (b: Buffer, key = KEY) => sign(b, Buffer.from(key));

function deps(over: Partial<AdminClientsDeps> = {}): AdminClientsDeps {
  return {
    search: vi.fn(async () => [{ client_id: CID, full_name: "Jane Doe" }]),
    get: vi.fn(async () => ({ client_id: CID, kyc_status: "verified" })),
    ...over,
  };
}

describe("admin borrower lookup over HTTPS", () => {
  it("searches for a correctly signed request", async () => {
    const d = deps(); const b = raw({ action: "search", q: "  jane " });
    const r = await receiveAdminClients(b, signed(b), [KEY], d);
    expect(r.status).toBe(200);
    expect(d.search).toHaveBeenCalledWith("jane");
    expect((r.body as any).clients[0].client_id).toBe(CID);
  });

  it("returns one borrower, or 404", async () => {
    const b = raw({ action: "client", client_id: CID });
    expect((await receiveAdminClients(b, signed(b), [KEY], deps())).status).toBe(200);
    const none = deps({ get: vi.fn(async () => null) });
    expect((await receiveAdminClients(b, signed(b), [KEY], none)).status).toBe(404);
  });

  it.each([
    [{ action: "search", q: "ab" }, "invalid_query"],
    [{ action: "search", q: "x".repeat(101) }, "invalid_query"],
    [{ action: "client", client_id: "not-a-uuid" }, "invalid_client_id"],
    [{ action: "suspend", client_id: CID }, "unknown_action"],
  ])("refuses %j", async (body, code) => {
    const d = deps(); const b = raw(body);
    const r = await receiveAdminClients(b, signed(b), [KEY], d);
    expect(r.status).toBe(422);
    expect((r.body as any).error).toBe(code);
    expect(d.search).not.toHaveBeenCalled();
    expect(d.get).not.toHaveBeenCalled();
  });

  it("refuses a wrong key, an unsigned call and a disabled channel without reading anything", async () => {
    const d = deps(); const b = raw({ action: "search", q: "jane" });
    expect((await receiveAdminClients(b, signed(b, "other"), [KEY], d)).status).toBe(401);
    expect((await receiveAdminClients(b, "", [KEY], d)).status).toBe(401);
    expect((await receiveAdminClients(b, signed(b), [], d)).status).toBe(503);
    expect(d.search).not.toHaveBeenCalled();
  });

  it("refuses an oversized body before verifying it", async () => {
    const b = Buffer.alloc(3_000, 97);
    expect((await receiveAdminClients(b, signed(b), [KEY], deps())).status).toBe(413);
  });
});
