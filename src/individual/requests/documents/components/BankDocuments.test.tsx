import { act } from "react";
import { createRoot } from "react-dom/client";
import { vi, describe, it, expect, beforeEach } from "vitest";
import type { BankDocumentChecklist } from "../types";

const fetchBankDocuments = vi.fn();
const sendBankDocument = vi.fn();
const uploadVaultDocument = vi.fn();
vi.mock("../api/documents", () => ({
  fetchBankDocuments: (...a: unknown[]) => fetchBankDocuments(...a),
  sendBankDocument: (...a: unknown[]) => sendBankDocument(...a),
}));
vi.mock("../../../vault/api/vault", () => ({
  uploadVaultDocument: (...a: unknown[]) => uploadVaultDocument(...a),
}));
import { BankDocuments } from "./BankDocuments";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const checklist: BankDocumentChecklist = {
  pipeline_id: "p1", updated_at: "2026-10-17T09:00:00Z",
  items: [
    { requirement_id: "r1", name: "Proof of income", provided_by: "borrower", mandatory: true,
      status: "rejected", review_note: "Only 2 payslips; we need 3.", document_type: "payslip", max_age_days: 90,
      awaiting_borrower: true, vault_options: [
        { id: "v1", file_name: "sep-payslip.pdf", doc_date: "2026-09-30", usable: true, reason: null, age_days: 17 },
        { id: "v2", file_name: "may-payslip.pdf", doc_date: "2026-05-31", usable: false, reason: "too_old", age_days: 139 },
      ] },
    { requirement_id: "r2", name: "Valuation", provided_by: "bank", mandatory: false, status: "required",
      awaiting_borrower: false, vault_options: [] },
  ],
};

const settle = () => act(async () => { await new Promise((r) => setTimeout(r, 0)); });
const btn = (host: HTMLElement, text: string) =>
  [...host.querySelectorAll("button")].find((b) => b.textContent?.includes(text)) as HTMLButtonElement;

async function render() {
  const host = document.createElement("div");
  document.body.appendChild(host);
  await act(async () => { createRoot(host).render(<BankDocuments requestId="req-1" />); });
  await settle();
  return host;
}

beforeEach(() => {
  fetchBankDocuments.mockReset().mockResolvedValue(checklist);
  sendBankDocument.mockReset().mockResolvedValue(undefined);
  uploadVaultDocument.mockReset();
});

describe("BankDocuments", () => {
  it("shows only what the bank needs from the borrower, with the bank's note", async () => {
    const host = await render();
    expect(host.textContent).toContain("Proof of income");
    expect(host.textContent).not.toContain("Valuation");
    expect(host.textContent).toContain("Only 2 payslips; we need 3.");
  });

  it("greys out a copy that's too old, with the reason", async () => {
    const host = await render();
    act(() => btn(host, "Use from vault").click());
    const radios = host.querySelectorAll<HTMLInputElement>('input[type="radio"]');
    expect(radios[0].disabled).toBe(false);
    expect(radios[1].disabled).toBe(true);
    expect(host.textContent).toContain("139 days old, the bank accepts up to 90");
  });

  it("shares a vault copy only after the borrower confirms", async () => {
    const host = await render();
    act(() => btn(host, "Use from vault").click());
    act(() => host.querySelector<HTMLInputElement>('input[type="radio"]')!.click());
    expect(sendBankDocument).not.toHaveBeenCalled();
    expect(host.textContent).toContain("Share sep-payslip.pdf with your bank for this loan?");
    await act(async () => btn(host, "Share").click());
    expect(sendBankDocument).toHaveBeenCalledWith({
      requestId: "req-1", requirementId: "r1", vaultDocumentId: "v1", source: "vault", documentDate: undefined });
  });

  it("won't send a new upload dated older than the bank accepts", async () => {
    const host = await render();
    act(() => btn(host, "Upload new").click());
    const file = new File(["%PDF-1.7"], "payslip.pdf", { type: "application/pdf" });
    const input = host.querySelector<HTMLInputElement>('input[type="file"]')!;
    Object.defineProperty(input, "files", { value: [file] });
    act(() => { input.dispatchEvent(new Event("change", { bubbles: true })); });
    const date = host.querySelector<HTMLInputElement>('input[type="date"]')!;
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(date, "2025-01-01");
    act(() => { date.dispatchEvent(new Event("input", { bubbles: true })); });
    expect(host.textContent).toContain("from the last 90 days");
    expect(btn(host, "Upload and send").disabled).toBe(true);
    expect(uploadVaultDocument).not.toHaveBeenCalled();
  });

  it("renders nothing until the bank sends a request", async () => {
    fetchBankDocuments.mockResolvedValue(null);
    const host = await render();
    expect(host.textContent).toBe("");
  });
});
