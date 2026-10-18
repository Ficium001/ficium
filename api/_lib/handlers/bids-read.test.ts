import { describe, it, expect, vi } from "vitest";
import { bidsFor } from "./bids-read";

const A = "00000000-0000-4000-8000-000000000001";
const B = "00000000-0000-4000-8000-000000000002";

describe("bidsFor", () => {
  it("reads the caller's own copy, by the caller's id", async () => {
    const rpc = vi.fn(async () => ({ data: { [A]: [{ id: "b1" }] }, error: null }));
    expect(await bidsFor({ rpc } as never, "client-1", [A, A, B])).toEqual({ [A]: [{ id: "b1" }] });
    expect(rpc).toHaveBeenCalledWith("integration_bids_for", { p_client_id: "client-1", p_request_ids: [A, B] });
  });

  it("ignores anything that isn't a request id and skips the call when nothing is left", async () => {
    const rpc = vi.fn();
    expect(await bidsFor({ rpc } as never, "client-1", ["x'; drop", 42, null])).toEqual({});
    expect(rpc).not.toHaveBeenCalled();
  });

  it("surfaces database errors", async () => {
    const rpc = vi.fn(async () => ({ data: null, error: { message: "boom" } }));
    await expect(bidsFor({ rpc } as never, "client-1", [A])).rejects.toThrow("bids_for: boom");
  });
});
